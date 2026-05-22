import { readProjectTexFiles } from '$lib/fs/read-project-tex';
import type { FileTab } from '$lib/project/types';

/** Merge on-disk .tex files with open editor tabs (tabs win for unsaved edits). */
export function mergeTexFileMap(
  diskFiles: Map<string, string>,
  tabs: FileTab[]
): Map<string, string> {
  const merged = new Map(diskFiles);
  for (const tab of tabs) {
    const lower = tab.name.toLowerCase();
    if (!lower.endsWith('.tex') && !lower.endsWith('.ltx')) continue;
    const key = (tab.path || tab.name).trim();
    if (key) merged.set(key, tab.content);
  }
  return merged;
}

export async function loadDiskTexFiles(
  handle: FileSystemDirectoryHandle | null
): Promise<Map<string, string>> {
  if (!handle) return new Map();
  const map = new Map<string, string>();
  await readProjectTexFiles(handle, '', map);
  return map;
}
