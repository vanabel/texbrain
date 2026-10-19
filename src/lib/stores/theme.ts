import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type ThemeMode = 'dark' | 'light';

const STORAGE = 'texbrain-theme';

function readInitial(): ThemeMode {
  if (!browser) return 'dark';
  return localStorage.getItem(STORAGE) === 'light' ? 'light' : 'dark';
}

export const theme = writable<ThemeMode>('dark');

function applyTheme(mode: ThemeMode) {
  document.documentElement.dataset.theme = mode;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', mode === 'light' ? '#f6f5f2' : '#111113');
}

if (browser) {
  theme.set(readInitial());
  theme.subscribe((mode) => {
    localStorage.setItem(STORAGE, mode);
    applyTheme(mode);
  });
}

export function setTheme(mode: ThemeMode) {
  theme.set(mode);
}

export function toggleTheme() {
  theme.update((mode) => (mode === 'dark' ? 'light' : 'dark'));
}
