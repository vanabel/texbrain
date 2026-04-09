import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type AppLocale = 'en' | 'zh';

const STORAGE = 'texbrain.locale';
const LEGACY_STORAGE = 'texbrain.landing.locale';

function readInitial(): AppLocale {
  if (!browser) return 'en';
  let v = localStorage.getItem(STORAGE);
  if (v !== 'en' && v !== 'zh') {
    const legacy = localStorage.getItem(LEGACY_STORAGE);
    if (legacy === 'en' || legacy === 'zh') {
      v = legacy;
      localStorage.setItem(STORAGE, legacy);
    }
  }
  if (v === 'en' || v === 'zh') return v;
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

/** Site-wide UI locale; persisted under `texbrain.locale` (migrates legacy `texbrain.landing.locale`). */
export const locale = writable<AppLocale>('en');

if (browser) {
  locale.set(readInitial());
  locale.subscribe((v) => {
    localStorage.setItem(STORAGE, v);
    document.documentElement.lang = v === 'zh' ? 'zh-CN' : 'en';
  });
}

export function setLocale(next: AppLocale) {
  locale.set(next);
}
