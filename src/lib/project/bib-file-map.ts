import { readProjectBibFiles } from '$lib/fs/read-project-bib';
import type { FileTab } from '$lib/project/types';

/** Merge on-disk .bib/.bbl with open editor tabs (tabs win for unsaved edits). */
export function mergeBibFileMap(
  diskFiles: Map<string, string>,
  tabs: FileTab[]
): Map<string, string> {
  const merged = new Map(diskFiles);
  for (const tab of tabs) {
    const lower = tab.name.toLowerCase();
    if (!lower.endsWith('.bib') && !lower.endsWith('.bbl')) continue;
    merged.set(tab.path, tab.content);
  }
  return merged;
}

export async function loadDiskBibFiles(
  handle: FileSystemDirectoryHandle | null
): Promise<Map<string, string>> {
  if (!handle) return new Map();
  const map = new Map<string, string>();
  await readProjectBibFiles(handle, '', map);
  return map;
}
