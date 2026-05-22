/** Directories skipped when scanning a project (avoids static/vendor trees). */
const SKIP_DIRS = new Set([
  'node_modules',
  '__pycache__',
  '.git',
  'static',
  'build',
  'dist',
  '.svelte-kit'
]);

/** Read .tex / .ltx sources from an opened project folder (for TOC / include resolution). */
export async function readProjectTexFiles(
  dirHandle: FileSystemDirectoryHandle,
  prefix: string,
  fileMap: Map<string, string>
): Promise<void> {
  for await (const entry of (dirHandle as FileSystemDirectoryHandle & { values(): AsyncIterable<FileSystemHandle> }).values()) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.kind === 'file') {
      const lower = entry.name.toLowerCase();
      if (!lower.endsWith('.tex') && !lower.endsWith('.ltx')) continue;
      try {
        const file = await (entry as FileSystemFileHandle).getFile();
        fileMap.set(path, await file.text());
      } catch {
        /* skip unreadable */
      }
    } else if (entry.kind === 'directory') {
      if (!entry.name.startsWith('.') && !SKIP_DIRS.has(entry.name)) {
        await readProjectTexFiles(entry as FileSystemDirectoryHandle, path, fileMap);
      }
    }
  }
}
