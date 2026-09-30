<script lang="ts">
  import { projectSearchOpen, addToast } from '$lib/stores/app';
  import { files, updateFileContent, openFileTab, markFileSaved, projectHandle } from '$lib/project/store';
  import { mergeTexFileMap, loadDiskTexFiles } from '$lib/project/tex-file-map';
  import { mergeBibFileMap, loadDiskBibFiles } from '$lib/project/bib-file-map';
  import {
    searchProjectFiles,
    previewReplacements,
    applyReplacements,
    type SearchMatch,
    type ReplacePreview
  } from '$lib/project/search-replace';
  import { writeTextAtProjectPath } from '$lib/fs/project-path';
  import { setDiskTexFiles, setDiskBibFiles } from '$lib/editor/project-sources';
  import { refreshProjectTree } from '$lib/project/manager';
  import { editorUi } from '$lib/i18n/editor-ui';
  import { locale } from '$lib/i18n/locale';
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';

  export let onNavigate: (filePath: string, line: number) => void = () => {};
  export let onContentApplied: (path: string, content: string) => void = () => {};

  $: E = editorUi[$locale];

  let query = '';
  let replace = '';
  let caseSensitive = false;
  let useRegex = false;
  let showReplace = false;
  let matches: SearchMatch[] = [];
  let previews: ReplacePreview[] = [];
  let selected = new Set<string>();
  let searching = false;
  let inputEl: HTMLInputElement;

  function matchKey(m: { path: string; from: number; to: number }): string {
    return `${m.path}:${m.from}:${m.to}`;
  }

  async function collectFiles(): Promise<Map<string, string>> {
    const handle = get(projectHandle);
    const tabs = get(files);
    let diskTex = new Map<string, string>();
    let diskBib = new Map<string, string>();
    if (handle) {
      [diskTex, diskBib] = await Promise.all([
        loadDiskTexFiles(handle),
        loadDiskBibFiles(handle)
      ]);
    }
    const tex = mergeTexFileMap(diskTex, tabs);
    const bib = mergeBibFileMap(diskBib, tabs);
    return new Map([...tex, ...bib]);
  }

  async function runSearch() {
    if (!query.trim()) {
      matches = [];
      previews = [];
      selected = new Set();
      return;
    }
    searching = true;
    try {
      const fileMap = await collectFiles();
      matches = searchProjectFiles(fileMap, { query, caseSensitive, useRegex });
      selected = new Set(matches.map(matchKey));
      if (showReplace && replace !== undefined) {
        previews = previewReplacements(matches, fileMap, query, replace, {
          caseSensitive,
          useRegex
        });
      } else {
        previews = [];
      }
    } finally {
      searching = false;
    }
  }

  async function refreshPreviews() {
    if (!showReplace || !query.trim()) {
      previews = [];
      return;
    }
    const fileMap = await collectFiles();
    previews = previewReplacements(matches, fileMap, query, replace, {
      caseSensitive,
      useRegex
    });
  }

  function toggleSelect(key: string) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    selected = next;
  }

  function selectAll() {
    selected = new Set(matches.map(matchKey));
  }

  function selectNone() {
    selected = new Set();
  }

  async function applySelected() {
    if (selected.size === 0) return;
    const fileMap = await collectFiles();
    const edits = (previews.length
      ? previews
      : previewReplacements(matches, fileMap, query, replace, { caseSensitive, useRegex })
    )
      .filter((p) => selected.has(matchKey(p)))
      .map((p) => ({
        path: p.path,
        from: p.from,
        to: p.to,
        replacement: p.replacement
      }));
    const updated = applyReplacements(fileMap, edits);
    const handle = get(projectHandle);
    let wroteDisk = 0;
    let writeFailed = 0;

    for (const [path, content] of updated) {
      const tabs = get(files);
      const tab = tabs.find((f) => (f.path || f.name) === path);
      const diskContent = fileMap.get(path) ?? content;
      if (tab) {
        updateFileContent(tab.id, content);
      } else {
        const name = path.split('/').pop() || path;
        const id = openFileTab(name, diskContent, null, path);
        updateFileContent(id, content);
      }

      if (handle) {
        try {
          await writeTextAtProjectPath(handle, path, content);
          const opened = get(files).find((f) => (f.path || f.name) === path);
          if (opened) markFileSaved(opened.id, content);
          wroteDisk++;
        } catch (err) {
          console.warn('search-replace write failed:', path, err);
          writeFailed++;
        }
      }

      onContentApplied(path, content);
    }

    if (handle && wroteDisk > 0) {
      try {
        const [tex, bib] = await Promise.all([
          loadDiskTexFiles(handle),
          loadDiskBibFiles(handle)
        ]);
        setDiskTexFiles(tex);
        setDiskBibFiles(bib);
        await refreshProjectTree();
      } catch (err) {
        console.warn('search-replace refresh failed:', err);
      }
    }

    if (writeFailed > 0) {
      addToast(E.searchWritePartial.replace('{n}', String(writeFailed)), 'warning', 3500);
    } else {
      addToast(
        handle
          ? E.searchAppliedDisk.replace('{n}', String(edits.length))
          : E.searchApplied.replace('{n}', String(edits.length)),
        'success',
        2000
      );
    }
    await runSearch();
  }

  function close() {
    projectSearchOpen.set(false);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void runSearch();
    }
  }

  onMount(() => {
    inputEl?.focus();
  });
</script>

{#if $projectSearchOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="backdrop" on:click={close} on:keydown={handleKeydown}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="panel" on:click|stopPropagation>
      <div class="panel-head">
        <h2>{E.searchTitle}</h2>
        <button type="button" class="icon-btn" on:click={close} aria-label={E.collabClose}>×</button>
      </div>

      <div class="row">
        <input
          bind:this={inputEl}
          class="field"
          type="search"
          placeholder={E.searchPlaceholder}
          bind:value={query}
          on:keydown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void runSearch();
            }
          }}
        />
        <button type="button" class="btn primary" on:click={() => void runSearch()} disabled={searching}>
          {searching ? '…' : E.searchRun}
        </button>
      </div>

      <div class="opts">
        <label><input type="checkbox" bind:checked={caseSensitive} /> {E.searchCaseSensitive}</label>
        <label><input type="checkbox" bind:checked={useRegex} /> {E.searchRegex}</label>
        <label>
          <input type="checkbox" bind:checked={showReplace} on:change={() => void refreshPreviews()} />
          {E.searchShowReplace}
        </label>
      </div>

      {#if showReplace}
        <div class="row">
          <input
            class="field"
            type="text"
            placeholder={E.searchReplacePlaceholder}
            bind:value={replace}
            on:input={() => void refreshPreviews()}
          />
          <button
            type="button"
            class="btn"
            disabled={selected.size === 0}
            on:click={() => void applySelected()}
          >
            {E.searchApplySelected}
          </button>
        </div>
        <div class="opts">
          <button type="button" class="linkish" on:click={selectAll}>{E.searchSelectAll}</button>
          <button type="button" class="linkish" on:click={selectNone}>{E.searchSelectNone}</button>
          <span class="meta">{selected.size}/{matches.length}</span>
        </div>
      {/if}

      <div class="results">
        {#if matches.length === 0}
          <p class="empty">{query.trim() ? E.searchNoResults : E.searchHint}</p>
        {:else}
          {#each (showReplace && previews.length ? previews : matches) as item (matchKey(item))}
            <div class="hit">
              {#if showReplace}
                <input
                  type="checkbox"
                  checked={selected.has(matchKey(item))}
                  on:change={() => toggleSelect(matchKey(item))}
                />
              {/if}
              <button
                type="button"
                class="hit-main"
                on:click={() => onNavigate(item.path, item.line)}
              >
                <span class="hit-loc">{item.path}:{item.line}</span>
                <span class="hit-prev">{item.preview}</span>
                {#if 'previewAfter' in item && item.previewAfter}
                  <span class="hit-after">→ {item.previewAfter}</span>
                {/if}
              </button>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 1000;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 10vh 16px 16px;
  }
  .panel {
    width: min(720px, 100%);
    max-height: 80vh;
    background: var(--bg-elevated, var(--bg-secondary, #1e1e24));
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px 8px;
  }
  .panel-head h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }
  .icon-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 20px;
    cursor: pointer;
    line-height: 1;
  }
  .row {
    display: flex;
    gap: 8px;
    padding: 0 14px 8px;
  }
  .field {
    flex: 1;
    min-width: 0;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg-primary, #121216);
    color: var(--text-primary);
    font-size: 13px;
  }
  .btn {
    padding: 8px 12px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
  }
  .btn.primary {
    background: var(--accent, #5c6bc0);
    border-color: transparent;
    color: #fff;
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .opts {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    padding: 0 14px 10px;
    font-size: 12px;
    color: var(--text-muted);
    align-items: center;
  }
  .opts label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
  }
  .linkish {
    background: none;
    border: none;
    color: var(--accent, #5c6bc0);
    cursor: pointer;
    font-size: 12px;
    padding: 0;
  }
  .meta {
    margin-left: auto;
  }
  .results {
    flex: 1;
    min-height: 0;
    overflow: auto;
    border-top: 1px solid var(--border);
    padding: 6px 0;
  }
  .empty {
    padding: 24px 16px;
    text-align: center;
    color: var(--text-muted);
    font-size: 13px;
  }
  .hit {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 4px 12px;
  }
  .hit-main {
    flex: 1;
    min-width: 0;
    text-align: left;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .hit-main:hover {
    background: rgba(255, 255, 255, 0.05);
  }
  .hit-loc {
    font-size: 11px;
    color: var(--accent, #5c6bc0);
    font-family: ui-monospace, monospace;
  }
  .hit-prev,
  .hit-after {
    font-size: 12px;
    font-family: ui-monospace, monospace;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--text-primary);
  }
  .hit-after {
    color: var(--text-muted);
  }
</style>
