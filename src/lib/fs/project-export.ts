import { zipSync, strToU8 } from 'fflate';
import { get } from 'svelte/store';
import { files, projectName } from '$lib/project/store';
import { collabActive } from '$lib/collab/store';
import { collectFilesFromYjs, collectBinariesFromYjs } from '$lib/collab/provider';

function sanitizeRelPath(path: string): string | null {
  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.includes('..')) return null;
  return normalized;
}

/** Collect text + binary project files available to the current client (Yjs room or open tabs). */
export function collectFilesForProjectExport(): {
  textFiles: Map<string, string>;
  binaryFiles: Map<string, ArrayBuffer>;
} {
  const textFiles = new Map<string, string>();
  const binaryFiles = new Map<string, ArrayBuffer>();

  if (get(collabActive)) {
    for (const [path, content] of collectFilesFromYjs()) {
      textFiles.set(path, content);
    }
    for (const [path, buf] of collectBinariesFromYjs()) {
      binaryFiles.set(path, buf);
    }
  }

  // Open tabs always win (includes unsaved edits and non-collab sessions).
  for (const tab of get(files)) {
    const key = tab.path || tab.name;
    if (key) textFiles.set(key, tab.content ?? '');
  }

  return { textFiles, binaryFiles };
}

export function buildProjectZip(
  textFiles: Map<string, string>,
  binaryFiles: Map<string, ArrayBuffer>
): Uint8Array {
  const entries: Record<string, Uint8Array> = {};

  for (const [path, content] of textFiles) {
    const key = sanitizeRelPath(path);
    if (!key) continue;
    entries[key] = strToU8(content);
  }

  for (const [path, buf] of binaryFiles) {
    const key = sanitizeRelPath(path);
    if (!key || entries[key]) continue;
    entries[key] = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  }

  if (Object.keys(entries).length === 0) {
    throw new Error('No project files to export');
  }

  return zipSync(entries, { level: 6 });
}

export function suggestedProjectZipName(): string {
  const name = (get(projectName) || 'texbrain-project').trim() || 'texbrain-project';
  const safe = name.replace(/[^\w.\-]+/g, '_').replace(/^_+|_+$/g, '') || 'texbrain-project';
  return `${safe}.zip`;
}

export function downloadZipBytes(data: Uint8Array, filename: string): void {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  const blob = new Blob([copy], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Write project files into a directory (auto-extract), creating nested folders as needed. */
export async function writeProjectToDirectory(
  dirHandle: FileSystemDirectoryHandle,
  textFiles: Map<string, string>,
  binaryFiles: Map<string, ArrayBuffer>
): Promise<number> {
  let written = 0;
  const all = new Map<string, string | Uint8Array>();

  for (const [path, content] of textFiles) {
    const key = sanitizeRelPath(path);
    if (key) all.set(key, content);
  }
  for (const [path, buf] of binaryFiles) {
    const key = sanitizeRelPath(path);
    if (key && !all.has(key)) {
      all.set(key, buf instanceof Uint8Array ? buf : new Uint8Array(buf));
    }
  }

  for (const [relPath, content] of all) {
    const parts = relPath.split('/').filter(Boolean);
    const fileName = parts.pop();
    if (!fileName) continue;

    let current: FileSystemDirectoryHandle = dirHandle;
    for (const part of parts) {
      current = await current.getDirectoryHandle(part, { create: true });
    }

    const fileHandle = await current.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    if (typeof content === 'string') {
      await writable.write(content);
    } else {
      await writable.write(new Blob([new Uint8Array(content)]));
    }
    await writable.close();
    written += 1;
  }

  return written;
}
