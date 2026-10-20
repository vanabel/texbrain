<script lang="ts">
  import FileTree from '$lib/ui/FileTree.svelte';
  import TocPanel from '$lib/ui/TocPanel.svelte';
  import ReferencesPanel from '$lib/ui/ReferencesPanel.svelte';
  import { sidebarOpen, sidebarPanel } from '$lib/stores/app';
  import { editorUi } from '$lib/i18n/editor-ui';
  import { locale } from '$lib/i18n/locale';

  export let onTocNavigate: (filePath: string, line: number) => void = () => {};
  export let onInsertCitation: (key: string) => void = () => {};
  export let onInsertEquation: (number: string) => void = () => {};
  export let onInsertLabel: (key: string) => void = () => {};

  $: E = editorUi[$locale];
</script>

<div class="sidebar-inner">
  <div class="sidebar-tabs" role="tablist">
    <button
      type="button"
      class="pane-toggle"
      class:active={$sidebarOpen}
      title={E.ttSidebar}
      aria-label={E.ttSidebar}
      on:click={() => sidebarOpen.update((v) => !v)}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="1.5" y="2.5" width="13" height="11" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M5.5 2.5v11" stroke="currentColor" stroke-width="1.2"/></svg>
    </button>
    <button
      type="button"
      class="sidebar-tab"
      class:active={$sidebarPanel === 'files'}
      role="tab"
      aria-selected={$sidebarPanel === 'files'}
      on:click={() => sidebarPanel.set('files')}
    >
      {E.sidebarTabFiles}
    </button>
    <button
      type="button"
      class="sidebar-tab"
      class:active={$sidebarPanel === 'outline'}
      role="tab"
      aria-selected={$sidebarPanel === 'outline'}
      on:click={() => sidebarPanel.set('outline')}
    >
      {E.sidebarTabOutline}
    </button>
    <button
      type="button"
      class="sidebar-tab"
      class:active={$sidebarPanel === 'references'}
      role="tab"
      aria-selected={$sidebarPanel === 'references'}
      on:click={() => sidebarPanel.set('references')}
    >
      {E.sidebarTabReferences}
    </button>
  </div>
  <div class="sidebar-panel" role="tabpanel">
    {#if $sidebarPanel === 'files'}
      <FileTree />
    {:else if $sidebarPanel === 'outline'}
      <TocPanel onNavigate={onTocNavigate} />
    {:else}
      <ReferencesPanel
        onNavigate={onTocNavigate}
        onInsertCitation={onInsertCitation}
        onInsertEquation={onInsertEquation}
        onInsertLabel={onInsertLabel}
      />
    {/if}
  </div>
</div>

<style>
  .sidebar-inner {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }
  .sidebar-tabs {
    display: flex;
    flex-shrink: 0;
    align-items: stretch;
    height: 32px;
    border-bottom: 1px solid var(--border);
    padding: 0 2px 0 0;
    overflow-x: auto;
    flex-wrap: nowrap;
  }
  .pane-toggle {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    color: var(--text-muted);
    background: transparent;
    border-right: 1px solid var(--border);
  }
  .pane-toggle:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .pane-toggle.active {
    color: var(--accent);
  }
  .sidebar-tab {
    flex: 1 0 auto;
    min-width: 0;
    border: none;
    background: transparent;
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.02em;
    padding: 0 8px;
    cursor: pointer;
    font-family: inherit;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    white-space: nowrap;
  }
  .sidebar-tab:hover {
    color: var(--text);
  }
  .sidebar-tab.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }
  .sidebar-panel {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .sidebar-panel :global(.file-tree) {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }
</style>
