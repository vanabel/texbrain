export interface BibKeyEntry {
  key: string;
  /** Short hint (author/title) for sidebar and autocomplete */
  detail?: string;
  filePath?: string;
  /** 1-based line in source file */
  line?: number;
}

const BIBITEM_RE = /\\bibitem(?:\[[^\]]*\])?\{([^}]+)\}/g;
const BIB_ENTRY_RE = /@\w+\s*\{([^,\s}]+)/g;

function lineAtIndex(content: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < content.length; i++) {
    if (content[i] === '\n') line++;
  }
  return line;
}

export function parseBibitemKeysFromBbl(content: string, filePath: string): BibKeyEntry[] {
  const entries: BibKeyEntry[] = [];
  const seen = new Set<string>();
  BIBITEM_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = BIBITEM_RE.exec(content)) !== null) {
    const key = m[1].trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    entries.push({ key, filePath, line: lineAtIndex(content, m.index) });
  }
  return entries;
}

function parseBibField(content: string, key: string, field: string): string | undefined {
  const entryRe = new RegExp(`@\\w+\\s*\\{${escapeRegExp(key)}\\s*,`, 'i');
  const m = entryRe.exec(content);
  if (!m) return undefined;
  const fieldRe = new RegExp(`\\b${field}\\s*=\\s*`, 'i');
  const slice = content.slice(m.index + m[0].length);
  const fm = fieldRe.exec(slice);
  if (!fm) return undefined;
  const rest = content.slice(m.index + fm.index + fm[0].length);
  if (rest[0] === '{') {
    let depth = 1;
    let j = 1;
    while (j < rest.length && depth > 0) {
      if (rest[j] === '{') depth++;
      else if (rest[j] === '}') depth--;
      if (depth > 0) j++;
    }
    return rest.slice(1, j).replace(/\s+/g, ' ').trim();
  }
  if (rest[0] === '"') {
    const end = rest.indexOf('"', 1);
    if (end > 0) return rest.slice(1, end).trim();
  }
  const raw = rest.match(/^([^\s,}]+)/);
  return raw?.[1];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parseBibKeysFromBib(content: string, filePath: string): BibKeyEntry[] {
  const entries: BibKeyEntry[] = [];
  const seen = new Set<string>();
  BIB_ENTRY_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = BIB_ENTRY_RE.exec(content)) !== null) {
    const key = m[1].trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    let detail: string | undefined;
    if (content.length < 512_000) {
      const author = parseBibField(content, key, 'author');
      const title = parseBibField(content, key, 'title');
      detail = [author, title].filter(Boolean).join(' — ') || undefined;
    }
    entries.push({ key, detail, filePath, line: lineAtIndex(content, m.index) });
  }
  return entries;
}

function preferEntry(prev: BibKeyEntry | undefined, next: BibKeyEntry): BibKeyEntry {
  if (!prev) return next;
  const merged: BibKeyEntry = { ...prev };
  if (!merged.detail && next.detail) merged.detail = next.detail;
  if (!merged.filePath && next.filePath) {
    merged.filePath = next.filePath;
    merged.line = next.line;
  }
  return merged;
}

export function collectProjectBibKeys(files: Map<string, string>): BibKeyEntry[] {
  const byKey = new Map<string, BibKeyEntry>();

  for (const [path, content] of files) {
    const lower = path.toLowerCase();
    if (lower.endsWith('.bbl')) {
      for (const entry of parseBibitemKeysFromBbl(content, path)) {
        byKey.set(entry.key, preferEntry(byKey.get(entry.key), entry));
      }
    } else if (lower.endsWith('.bib')) {
      for (const entry of parseBibKeysFromBib(content, path)) {
        byKey.set(entry.key, preferEntry(byKey.get(entry.key), entry));
      }
    }
  }

  return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
}
