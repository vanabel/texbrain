import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

const KEY = 'texbrain-download-dir';

/** Persisted folder used to auto-extract project ZIP saves when no project folder is open. */
export const downloadDirHandle = writable<FileSystemDirectoryHandle | null>(null);
export const downloadDirName = writable<string>('');

function supportsDirectoryPicker(): boolean {
  return browser && typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

async function queryWritePermission(handle: FileSystemDirectoryHandle): Promise<PermissionState | 'unknown'> {
  const anyHandle = handle as FileSystemDirectoryHandle & {
    queryPermission?: (desc: { mode: 'readwrite' }) => Promise<PermissionState>;
    requestPermission?: (desc: { mode: 'readwrite' }) => Promise<PermissionState>;
  };
  if (typeof anyHandle.queryPermission !== 'function') return 'unknown';
  try {
    return await anyHandle.queryPermission({ mode: 'readwrite' });
  } catch {
    return 'unknown';
  }
}

async function requestWritePermission(handle: FileSystemDirectoryHandle): Promise<PermissionState | 'unknown'> {
  const anyHandle = handle as FileSystemDirectoryHandle & {
    requestPermission?: (desc: { mode: 'readwrite' }) => Promise<PermissionState>;
  };
  if (typeof anyHandle.requestPermission !== 'function') return 'unknown';
  try {
    return await anyHandle.requestPermission({ mode: 'readwrite' });
  } catch {
    return 'denied';
  }
}

/** Restore the last download directory from IndexedDB (may still need a user gesture for permission). */
export async function loadDownloadDirFromIdb(): Promise<void> {
  if (!browser) return;
  try {
    const handle = (await idbGet(KEY)) as FileSystemDirectoryHandle | undefined;
    if (!handle) {
      downloadDirHandle.set(null);
      downloadDirName.set('');
      return;
    }
    downloadDirHandle.set(handle);
    downloadDirName.set(handle.name || '');
  } catch {
    downloadDirHandle.set(null);
    downloadDirName.set('');
  }
}

/** Prompt for a folder and persist it for future ZIP auto-extract saves. */
export async function pickDownloadDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!supportsDirectoryPicker()) {
    throw new Error('This feature requires Chrome or Edge (File System Access API).');
  }
  const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' }) as FileSystemDirectoryHandle;
  const perm = await requestWritePermission(handle);
  if (perm === 'denied') {
    throw new Error('Write permission denied for the selected folder.');
  }
  await idbSet(KEY, handle);
  downloadDirHandle.set(handle);
  downloadDirName.set(handle.name || '');
  return handle;
}

export async function clearDownloadDirectory(): Promise<void> {
  try {
    await idbDel(KEY);
  } catch {
    /* ignore */
  }
  downloadDirHandle.set(null);
  downloadDirName.set('');
}

/**
 * Return a writable download directory, re-requesting permission if needed.
 * Returns null when none is set or permission is denied.
 */
export async function ensureDownloadDirPermission(): Promise<FileSystemDirectoryHandle | null> {
  const handle = get(downloadDirHandle);
  if (!handle) return null;

  let state = await queryWritePermission(handle);
  if (state === 'granted' || state === 'unknown') return handle;
  if (state === 'prompt') {
    state = await requestWritePermission(handle);
    if (state === 'granted' || state === 'unknown') return handle;
  }
  return null;
}
