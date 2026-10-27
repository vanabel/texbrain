/** Citation commands that take `{key1,key2}`. amsrefs (mathpaper) plus biblatex aliases. */
const CITE_NAMES = [
  'cites',
  'ocites',
  'ycites',
  'fullocite',
  'fullcite',
  'citeauthor',
  'citeauthory',
  'citeyear',
  'nocite',
  'othercites',
  'ocite',
  'ycite',
  'citen',
  'autocite',
  'parencite',
  'textcite',
  'footcite',
  'citep',
  'citet',
  'Cite',
  'Autocite',
  'Parencite',
  'Textcite',
  'Fullcite',
  'cite'
];

/** Label commands from cleveref and the kernel. Longer names are listed first. */
const REF_NAMES = [
  'crefrange',
  'Crefrange',
  'cpageref',
  'Cpageref',
  'namecref',
  'nameCref',
  'labelcref',
  'autoref',
  'eqref',
  'pageref',
  'Cref',
  'cref',
  'ref'
];

function alt(names: string[]): string {
  return [...names].sort((a, b) => b.length - a.length || a.localeCompare(b)).join('|');
}

export const CITE_ALT = alt(CITE_NAMES);
export const REF_ALT = alt(REF_NAMES);

const citeSet = new Set(CITE_NAMES);

export function isCiteCommand(name: string): boolean {
  return citeSet.has(name);
}

/** Open argument at the cursor, including a previous `{...}` (\\crefrange) and `[...]`. */
const OPEN_ARG = String.raw`(?:\*)?(?:\[[^\]]*\])*(?:\{[^}]*\})*\{([^}]*)$`;

export const CITE_IN_BRACE_RE = new RegExp(`\\\\(?:${CITE_ALT})${OPEN_ARG}`);
export const REF_IN_BRACE_RE = new RegExp(`\\\\(?:${REF_ALT})${OPEN_ARG}`);

/** Closed `\\cites{key1,key2}` groups, for scanning a whole file. */
export const CITE_KEYS_RE = new RegExp(
  `\\\\(?:${CITE_ALT})(?:\\*)?(?:\\[[^\\]]*\\])*\\{([^}]+)\\}`,
  'g'
);

/** Key fragment after the last comma, so `\\cites{smith, jo` completes `jo`. */
export function activeKeyPrefix(inside: string): string {
  const comma = inside.lastIndexOf(',');
  const tail = comma < 0 ? inside : inside.slice(comma + 1);
  return tail.trimStart();
}
