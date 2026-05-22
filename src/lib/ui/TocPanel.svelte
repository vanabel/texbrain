<script lang="ts">
  import { onMount } from 'svelte';
  import { activeFile, files, projectHandle } from '$lib/project/store';
  import { parseTexToc, parseTexTocWithIncludes, buildTocTree } from '$lib/tex/parse-toc';
  import { loadDiskTexFiles, mergeTexFileMap } from '$lib/project/tex-file-map';
  import { editorUi } from '$lib/i18n/editor-ui';
  import { locale } from '$lib/i18n/locale';
  import TocTreeNode from '$lib/ui/TocTreeNode.svelte';

  export let onNavigate: (filePath: string, line: number) => void = () => {};

  $: E = editorUi[$locale];
  $: isTex = ($activeFile?.name.toLowerCase().endsWith('.tex')) ?? false;
  $: rootPath = $activeFile ? $activeFile.path || $activeFile.name : '';
  $: texFiles = mergeTexFileMap(diskTexFiles, $files);
  $: entries =
    isTex && $activeFile && rootPath
      ? texFiles.has(rootPath)
        ? parseTexTocWithIncludes(rootPath, texFiles)
        : parseTexToc($activeFile.content, rootPath)
      : [];
  $: tree = buildTocTree(entries);
  $: activePath = rootPath;

  let diskTexFiles = new Map<string, string>();
  let diskLoadKey = '';

  $: {
    const key = $projectHandle?.name ?? '';
    if (key !== diskLoadKey) {
      diskLoadKey = key;
      refreshDiskTex($projectHandle);
    }
  }

  async function refreshDiskTex(handle: FileSystemDirectoryHandle | null) {
    diskTexFiles = await loadDiskTexFiles(handle);
  }

  onMount(() => {
    refreshDiskTex($projectHandle);
  });

  let collapsed = new Set<string>();
  let lastTocFileId: string | null = null;

  $: if ($activeFile?.id !== lastTocFileId) {
    lastTocFileId = $activeFile?.id ?? null;
    collapsed = new Set();
  }

  function toggleCollapse(key: string) {
    const next = new Set(collapsed);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    collapsed = next;
  }
</script>

<div class="toc-panel">
  {#if !$activeFile}
    <div class="empty">
      <span class="empty-text">{E.tocNoFile}</span>
    </div>
  {:else if !isTex}
    <div class="empty">
      <span class="empty-text">{E.tocNotTex}</span>
    </div>
  {:else if tree.length === 0}
    <div class="empty">
      <span class="empty-text">{E.tocEmpty}</span>
    </div>
  {:else}
    <div class="toc-entries">
      {#each tree as node (node.entry.filePath + ':' + node.entry.line)}
        <TocTreeNode
          {node}
          {activePath}
          {collapsed}
          onNavigate={onNavigate}
          onToggleCollapse={toggleCollapse}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .toc-panel {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .toc-entries {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0 8px;
  }
  .empty {
    padding: 16px 12px;
    text-align: center;
  }
  .empty-text {
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
