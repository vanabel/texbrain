<script lang="ts">
  import FileTree from '$lib/ui/FileTree.svelte';
  import TocPanel from '$lib/ui/TocPanel.svelte';
  import ReferencesPanel from '$lib/ui/ReferencesPanel.svelte';
  import { sidebarPanel } from '$lib/stores/app';
  import { editorUi } from '$lib/i18n/editor-ui';
  import { locale } from '$lib/i18n/locale';

  export let onTocNavigate: (filePath: string, line: number) => void = () => {};
  export let onInsertCitation: (key: string) => void = () => {};
  export let onInsertEquation: (number: string) => void = () => {};

  $: E = editorUi[$locale];
</script>

<div class="sidebar-inner">
  <div class="sidebar-tabs" role="tablist">
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
    border-bottom: 1px solid var(--border);
    padding: 0 4px;
  }
  .sidebar-tab {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.02em;
    padding: 8px 6px;
    cursor: pointer;
    font-family: inherit;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
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
