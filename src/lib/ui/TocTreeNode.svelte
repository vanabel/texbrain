<script lang="ts">
  import type { TocNode } from '$lib/tex/parse-toc';
  import { tocEntryId } from '$lib/tex/parse-toc';
  import { editorUi } from '$lib/i18n/editor-ui';
  import { locale } from '$lib/i18n/locale';
  import TocTreeNode from './TocTreeNode.svelte';

  export let node: TocNode;
  export let depth = 0;
  export let activePath = '';
  export let collapsed: Set<string>;
  export let onNavigate: (filePath: string, line: number) => void;
  export let onToggleCollapse: (key: string) => void;

  $: E = editorUi[$locale];
  $: key = tocEntryId(node.entry);
  $: hasChildren = node.children.length > 0;
  $: isCollapsed = collapsed.has(key);
  $: indent = `${4 + depth * 14}px`;
  $: showFile = node.entry.filePath && node.entry.filePath !== activePath;
  $: fileLabel = showFile
    ? node.entry.filePath.split('/').pop() || node.entry.filePath
    : '';
</script>

<div class="toc-row" style="padding-left: {indent}">
  {#if hasChildren}
    <button
      type="button"
      class="toc-chevron"
      aria-expanded={!isCollapsed}
      aria-label={isCollapsed ? E.tocExpand : E.tocCollapse}
      title={isCollapsed ? E.tocExpand : E.tocCollapse}
      on:click|stopPropagation={() => onToggleCollapse(key)}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" class="chevron" class:open={!isCollapsed}>
        <path d="M3 2l4 3-4 3" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  {:else}
    <span class="toc-chevron-spacer" aria-hidden="true"></span>
  {/if}
  <button
    type="button"
    class="toc-item"
    class:level-part={node.entry.level === 0}
    class:level-chapter={node.entry.level === 1}
    title="{node.entry.title} — {fileLabel || node.entry.filePath} ({E.linePrefix} {node.entry.line})"
    on:click={() => onNavigate(node.entry.filePath, node.entry.line)}
  >
    <span class="toc-title">{node.entry.title}</span>
    {#if showFile}
      <span class="toc-file">{fileLabel}</span>
    {/if}
    <span class="toc-line">{node.entry.line}</span>
  </button>
</div>

{#if hasChildren && !isCollapsed}
  {#each node.children as child (tocEntryId(child.entry))}
    <TocTreeNode
      node={child}
      depth={depth + 1}
      {activePath}
      {collapsed}
      {onNavigate}
      {onToggleCollapse}
    />
  {/each}
{/if}

<style>
  .toc-row {
    display: flex;
    align-items: center;
    gap: 2px;
    min-width: 0;
  }
  .toc-chevron,
  .toc-chevron-spacer {
    flex-shrink: 0;
    width: 18px;
    height: 24px;
  }
  .toc-chevron {
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0;
    border-radius: 3px;
  }
  .toc-chevron:hover {
    color: var(--text);
    background: var(--bg-hover);
  }
  .chevron {
    transition: transform 0.12s ease;
  }
  .chevron.open {
    transform: rotate(90deg);
  }
  .toc-item {
    display: flex;
    align-items: baseline;
    gap: 6px;
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    color: var(--text);
    font-size: 12px;
    line-height: 1.35;
    padding: 5px 8px 5px 0;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
  }
  .toc-item:hover {
    background: var(--bg-hover);
  }
  .toc-item.level-part .toc-title,
  .toc-item.level-chapter .toc-title {
    font-weight: 600;
  }
  .toc-title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .toc-file {
    flex-shrink: 1;
    max-width: 42%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 10px;
    color: var(--accent);
    opacity: 0.85;
  }
  .toc-line {
    flex-shrink: 0;
    font-size: 10px;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }
</style>
