import { withoutComments } from './comments';

export type ReferenceLinkKind = 'file' | 'asset' | 'url' | 'cite' | 'label';

export type ReferenceLink = {
  from: number;
  to: number;
  key: string;
  kind: ReferenceLinkKind;
};

const MACRO_RE =
  /\\(includegraphics|include|input|url|citep|citet|cite|autocite|parencite|textcite|fullcite|autoref|cref|eqref|ref)\*?\s*(?:\[[^\]]*\]\s*)*\{([^{}]*)\}/g;

export function referenceLinks(source: string): ReferenceLink[] {
  const result: ReferenceLink[] = [];
  const clean = withoutComments(source);
  MACRO_RE.lastIndex = 0;
  for (const match of clean.matchAll(MACRO_RE)) {
    const cmd = match[1];
    const start = match.index! + match[0].lastIndexOf('{') + 1;
    const kind: ReferenceLinkKind =
      cmd === 'includegraphics'
        ? 'asset'
        : cmd === 'url'
          ? 'url'
          : cmd === 'include' || cmd === 'input'
            ? 'file'
            : cmd.startsWith('cite') ||
                cmd === 'citep' ||
                cmd === 'citet' ||
                cmd === 'autocite' ||
                cmd === 'parencite' ||
                cmd === 'textcite' ||
                cmd === 'fullcite'
              ? 'cite'
              : 'label';
    const keys =
      kind === 'file' || kind === 'asset' || kind === 'url' ? /[^\s][\s\S]*?\s*$/g : /[^,\s]+/g;
    for (const key of match[2].matchAll(keys)) {
      const value = key[0].trim();
      if (!value) continue;
      result.push({
        from: start + key.index!,
        to: start + key.index! + value.length,
        key: value,
        kind
      });
    }
  }
  return result;
}

export function findReferenceDefinition(
  source: string,
  key: string,
  kind: 'cite' | 'label'
): { from: number; to: number; line: number } | null {
  const clean = withoutComments(source);
  const pattern =
    kind === 'label'
      ? /\\label\s*\{([^{}]+)\}/g
      : /@([a-zA-Z]+)\s*[({]\s*([^\s,]+)\s*,/g;
  pattern.lastIndex = 0;
  for (const match of clean.matchAll(pattern)) {
    const found = (kind === 'label' ? match[1] : match[2]).trim();
    if (found !== key) continue;
    let line = 1;
    for (let i = 0; i < match.index!; i++) if (source[i] === '\n') line++;
    return { from: match.index!, to: match.index! + match[0].length, line };
  }
  return null;
}

/** Resolve \input/\include/\includegraphics target against project paths. */
export function resolveProjectRelativePath(
  originPath: string,
  target: string,
  knownPaths: Iterable<string>,
  opts?: { preferExtensions?: string[] }
): string | null {
  const prefer = opts?.preferExtensions ?? [];
  const candidates: string[] = [];
  const raw = target.replace(/^\.\//, '').trim();
  if (!raw) return null;

  const dir = originPath.includes('/') ? originPath.slice(0, originPath.lastIndexOf('/')) : '';
  const withDir = dir ? `${dir}/${raw}` : raw;

  const bases = [raw, withDir];
  for (const base of bases) {
    candidates.push(base);
    if (!/\.[^./]+$/.test(base)) {
      for (const ext of prefer) candidates.push(`${base}${ext}`);
    }
  }

  const set = new Set(
    [...knownPaths].map((p) => p.replace(/\\/g, '/'))
  );
  for (const c of candidates) {
    const n = c.replace(/\\/g, '/').replace(/\/+/g, '/');
    if (set.has(n)) return n;
    // case-insensitive fallback
    const lower = n.toLowerCase();
    for (const p of set) {
      if (p.toLowerCase() === lower) return p;
    }
  }
  return null;
}
