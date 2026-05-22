const SKIP_DIRS = new Set([
  'node_modules',
  '__pycache__',
  '.git',
  'static',
  'build',
  'dist',
  '.svelte-kit'
]);

/** Read .bib / .bbl sources from an opened project folder (citations panel). */
export async function readProjectBibFiles(
  dirHandle: FileSystemDirectoryHandle,
  prefix: string,
  fileMap: Map<string, string>
): Promise<void> {
  for await (const entry of (dirHandle as FileSystemDirectoryHandle & { values(): AsyncIterable<FileSystemHandle> }).values()) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.kind === 'file') {
      const lower = entry.name.toLowerCase();
      if (!lower.endsWith('.bib') && !lower.endsWith('.bbl')) continue;
      try {
        const file = await (entry as FileSystemFileHandle).getFile();
        fileMap.set(path, await file.text());
      } catch {
        /* skip unreadable */
      }
    } else if (entry.kind === 'directory') {
      if (!entry.name.startsWith('.') && !SKIP_DIRS.has(entry.name)) {
        await readProjectBibFiles(entry as FileSystemDirectoryHandle, path, fileMap);
      }
    }
  }
}
