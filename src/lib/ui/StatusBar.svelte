<script lang="ts">
  import { compileStatus } from '$lib/stores/app';
  import { activeFile } from '$lib/project/store';
  import { gitEnabled, gitCurrentBranch } from '$lib/git/store';
  import { locale } from '$lib/i18n/locale';
  import { editorUi, expandEditorTemplate } from '$lib/i18n/editor-ui';
  import { formatEntryTargetLine } from '$lib/path-display';

  export let cursorLine = 1;
  export let cursorCol = 1;
  export let charCount = 0;
  export let wordCount = 0;
  /** Project entry .tex path (project-root-relative). */
  export let entryPath = '';
  /** Last resolved compile target .tex path. */
  export let compileTarget = '';

  $: E = editorUi[$locale];
  $: lineCol = expandEditorTemplate(E.statusLineCol, { line: cursorLine, col: cursorCol });
  $: entryTarget = formatEntryTargetLine(entryPath, compileTarget, {
    entry: E.entryLabel,
    target: E.targetLabel,
    merged: E.statusEntryTargetMerged
  });
</script>

<div class="status-bar">
  <div class="left">
    <div class="left-primary">
      <span class="status-item">
        {#if $compileStatus === 'compiling'}
          <span class="dot pulse" style="background: var(--warning)"></span>
          {E.statusCompiling}
        {:else if $compileStatus === 'success'}
          <span class="dot" style="background: var(--success)"></span>
          {E.statusReady}
        {:else if $compileStatus === 'error'}
          <span class="dot" style="background: var(--error)"></span>
          {E.statusError}
        {:else}
          <span class="dot" style="background: var(--text-muted)"></span>
          {E.statusIdle}
        {/if}
      </span>
      {#if $gitEnabled}
        <span class="sep"></span>
        <span class="status-item">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style="flex-shrink:0"><circle cx="5" cy="4" r="2" stroke="currentColor" stroke-width="1.3"/><circle cx="5" cy="12" r="2" stroke="currentColor" stroke-width="1.3"/><circle cx="12" cy="6" r="2" stroke="currentColor" stroke-width="1.3"/><path d="M5 6v4M7 5l3.5 1" stroke="currentColor" stroke-width="1.3"/></svg>
          {$gitCurrentBranch}
        </span>
      {/if}
    </div>

    {#if entryTarget.line}
      <span class="entry-compact" title={entryTarget.title}>{entryTarget.line}</span>
    {/if}
  </div>

  <div class="right">
    {#if $activeFile}
      <span class="status-item">{lineCol}</span>
      <span class="sep"></span>
      <span class="status-item">{charCount} {E.statusChars}</span>
      <span class="sep"></span>
      <span class="status-item">{wordCount} {E.statusWords}</span>
      <span class="sep"></span>
      <span class="status-item">{E.statusUtf8}</span>
      <span class="sep"></span>
      <span class="status-item">{E.statusLatex}</span>
    {/if}
    <span class="sep"></span>
    <span class="status-item credit">
      {#if $locale === 'en'}
        {E.statusCredit} <span class="heart">&hearts;</span> by
        <a href="https://swimmingbrain.dev" target="_blank" rel="noopener">Braian Plaku</a>
      {:else}
        <a href="https://swimmingbrain.dev" target="_blank" rel="noopener">Braian Plaku</a>
        {E.statusCredit} <span class="heart">&hearts;</span> 制作
      {/if}
    </span>
  </div>
</div>

<style>
  .status-bar {
    min-height: var(--statusbar-h);
    background: var(--bg-surface);
    border-top: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 3px 10px;
    font-size: 10.5px;
    color: var(--text-muted);
    flex-shrink: 0;
    user-select: none;
    font-family: var(--font-editor);
    gap: 12px;
  }

  .left {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;
  }

  .left-primary {
    display: flex;
    align-items: center;
    gap: 3px;
    flex-shrink: 0;
  }

  .entry-compact {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: inherit;
    line-height: inherit;
    padding: 0;
    margin: 0;
    background: transparent;
    border: none;
    box-shadow: none;
    color: inherit;
  }

  .right {
    display: flex;
    align-items: center;
    gap: 3px;
    flex-shrink: 0;
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .sep {
    width: 1px;
    height: 10px;
    background: var(--border);
    margin: 0 4px;
  }

  .dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    display: inline-block;
  }

  .pulse {
    animation: pulse 1.5s infinite;
  }

  .credit a {
    color: var(--accent);
    text-decoration: none;
  }

  .credit a:hover {
    color: var(--accent-hover);
  }

  .heart {
    color: var(--error);
    font-size: 11px;
  }
</style>
