<script lang="ts">
  import { files, projectHandle } from '$lib/project/store';
  import { projectBibKeys, projectEquations } from '$lib/editor/project-sources';
  import { editorUi } from '$lib/i18n/editor-ui';
  import { locale } from '$lib/i18n/locale';

  export let onInsertCitation: (key: string) => void = () => {};
  export let onInsertEquation: (number: string) => void = () => {};
  export let onNavigate: (filePath: string, line: number) => void = () => {};

  $: E = editorUi[$locale];
  $: bibKeys = $projectBibKeys;
  $: equations = $projectEquations;
  $: hasProject = !!$projectHandle || $files.length > 0;

  let bibFilter = '';
  let eqFilter = '';

  $: filteredBib = bibFilter.trim()
    ? bibKeys.filter(
        (k) =>
          k.key.toLowerCase().includes(bibFilter.toLowerCase()) ||
          (k.detail?.toLowerCase().includes(bibFilter.toLowerCase()) ?? false)
      )
    : bibKeys;

  $: uniqueEquations = (() => {
    const seen = new Set<string>();
    const out: typeof equations = [];
    for (const eq of equations) {
      if (!eq.number || seen.has(eq.number)) continue;
      seen.add(eq.number);
      out.push(eq);
    }
    return out;
  })();

  $: filteredEq = eqFilter.trim()
    ? uniqueEquations.filter(
        (eq) =>
          eq.number.includes(eqFilter) ||
          eq.label.toLowerCase().includes(eqFilter.toLowerCase()) ||
          (eq.preview?.toLowerCase().includes(eqFilter.toLowerCase()) ?? false)
      )
    : uniqueEquations;

  function isInsertClick(e: MouseEvent): boolean {
    return e.metaKey || e.ctrlKey;
  }

  function handleRefClick(
    e: MouseEvent,
    opts: { insert: () => void; filePath?: string; line?: number }
  ): void {
    if (isInsertClick(e)) {
      e.preventDefault();
      opts.insert();
      return;
    }
    if (opts.filePath && opts.line) {
      onNavigate(opts.filePath, opts.line);
    }
  }

  function itemTitle(detail: string, filePath?: string, line?: number): string {
    const loc =
      filePath && line ? `${filePath} (${E.linePrefix} ${line})` : '';
    return [detail, loc].filter(Boolean).join('\n');
  }
</script>

<div class="refs-panel">
  <section class="refs-section">
    <div class="refs-section-head">
      <span class="refs-section-title">{E.refsCitations}</span>
      <span class="refs-count">{filteredBib.length}</span>
    </div>
    {#if !hasProject}
      <p class="refs-empty">{E.refsNoProject}</p>
    {:else if bibKeys.length === 0}
      <p class="refs-empty">{E.refsNoBib}</p>
    {:else}
      <input
        type="search"
        class="refs-filter"
        placeholder={E.refsFilterCitations}
        bind:value={bibFilter}
      />
      <ul class="refs-list">
        {#each filteredBib as item (item.key)}
          <li>
            <button
              type="button"
              class="refs-item"
              title={itemTitle(item.detail || item.key, item.filePath, item.line)}
              on:click={(e) =>
                handleRefClick(e, {
                  insert: () => onInsertCitation(item.key),
                  filePath: item.filePath,
                  line: item.line
                })}
            >
              <span class="refs-row-top">
                <span class="refs-key">{item.key}</span>
                {#if item.line}
                  <span class="refs-line">{item.line}</span>
                {/if}
              </span>
              {#if item.detail}
                <span class="refs-detail">{item.detail}</span>
              {/if}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="refs-section">
    <div class="refs-section-head">
      <span class="refs-section-title">{E.refsEquations}</span>
      <span class="refs-count">{filteredEq.length}</span>
    </div>
    {#if !hasProject}
      <p class="refs-empty">{E.refsNoProject}</p>
    {:else if uniqueEquations.length === 0}
      <p class="refs-empty">{E.refsNoEquations}</p>
    {:else}
      <input
        type="search"
        class="refs-filter"
        placeholder={E.refsFilterEquations}
        bind:value={eqFilter}
      />
      <ul class="refs-list">
        {#each filteredEq as eq (`${eq.filePath}:${eq.line}:${eq.number}`)}
          <li>
            <button
              type="button"
              class="refs-item eq-item"
              title={itemTitle(
                eq.label ? `\\label{${eq.label}}` : eq.preview || eq.number,
                eq.filePath,
                eq.line
              )}
              on:click={(e) =>
                handleRefClick(e, {
                  insert: () => onInsertEquation(eq.number),
                  filePath: eq.filePath,
                  line: eq.line
                })}
            >
              <span class="refs-row-top">
                <span class="refs-key">({eq.number})</span>
                <span class="refs-line">{eq.line}</span>
              </span>
              {#if eq.label}
                <span class="refs-detail">{eq.label}</span>
              {:else if eq.preview}
                <span class="refs-detail">{eq.preview}</span>
              {/if}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

<style>
  .refs-panel {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .refs-section {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid var(--border);
  }
  .refs-section:last-child {
    border-bottom: none;
  }
  .refs-section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px 4px;
    flex-shrink: 0;
  }
  .refs-section-title {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-muted);
  }
  .refs-count {
    font-size: 10px;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }
  .refs-filter {
    margin: 0 8px 6px;
    padding: 5px 8px;
    font-size: 11px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg);
    color: var(--text);
    font-family: inherit;
    flex-shrink: 0;
  }
  .refs-list {
    list-style: none;
    margin: 0;
    padding: 0 0 8px;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }
  .refs-list li {
    min-width: 0;
  }
  .refs-item {
    width: 100%;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    border: none;
    background: transparent;
    color: var(--text);
    font-size: 12px;
    padding: 5px 8px;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
  }
  .refs-item:hover {
    background: var(--bg-hover);
  }
  .refs-row-top {
    display: flex;
    align-items: baseline;
    gap: 6px;
    width: 100%;
    min-width: 0;
  }
  .refs-key {
    flex: 1;
    min-width: 0;
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 11px;
    color: var(--accent);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .refs-line {
    flex-shrink: 0;
    font-size: 10px;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }
  .refs-detail {
    font-size: 10px;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
  .refs-empty {
    margin: 0;
    padding: 12px 10px;
    font-size: 12px;
    color: var(--text-muted);
    text-align: center;
  }
</style>
