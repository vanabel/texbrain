/**
 * Completion keys versus the default map in
 * `@replit/codemirror-vim-core` (`defaultKeymap` in vim.js).
 * Names are CodeMirror keymap names (`Ctrl-j`, `ArrowDown`, …).
 */

const VIM_DEFAULT_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Space',
  'Backspace',
  'Delete',
  'Ctrl-n',
  'Ctrl-p',
  'Ctrl-[',
  'Ctrl-c',
  'Escape',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Enter',
  'Ctrl-f',
  'Ctrl-b',
  'Ctrl-d',
  'Ctrl-u',
  'Ctrl-w',
  'Ctrl-i',
  'Ctrl-o',
  'Ctrl-e',
  'Ctrl-y',
  'Ctrl-v',
  'Ctrl-q',
  'Ctrl-r',
  'Ctrl-a',
  'Ctrl-x',
  'Ctrl-t'
]);

/** Tried in order. The first pair whose keys Vim does not claim wins. */
const SNIPPET_FIELD_PAIRS = [
  { next: 'Ctrl-j', prev: 'Ctrl-k' },
  { next: 'Alt-j', prev: 'Alt-k' },
  { next: 'Ctrl-Alt-j', prev: 'Ctrl-Alt-k' }
] as const;

export type SnippetFieldKeys = {
  next: string;
  prev: string;
  /** True when Vim's default map forced a pair other than Ctrl-j / Ctrl-k. */
  remapped: boolean;
  /** Completion keys that also appear in Vim's default map. */
  shared: string[];
};

export function vimClaims(key: string): boolean {
  return VIM_DEFAULT_KEYS.has(key);
}

export function snippetFieldKeys(vimMode: boolean): SnippetFieldKeys {
  const shared = vimMode
    ? ['Escape', 'Enter', 'ArrowUp', 'ArrowDown'].filter((key) => vimClaims(key))
    : [];
  if (!vimMode) {
    return { next: 'Ctrl-j', prev: 'Ctrl-k', remapped: false, shared };
  }
  const pair =
    SNIPPET_FIELD_PAIRS.find((candidate) => !vimClaims(candidate.next) && !vimClaims(candidate.prev)) ??
    SNIPPET_FIELD_PAIRS[SNIPPET_FIELD_PAIRS.length - 1];
  return {
    next: pair.next,
    prev: pair.prev,
    remapped: pair.next !== 'Ctrl-j' || pair.prev !== 'Ctrl-k',
    shared
  };
}
