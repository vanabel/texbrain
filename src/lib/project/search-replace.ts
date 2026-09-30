export type SearchMatch = {
  path: string;
  line: number;
  column: number;
  /** 0-based offset in file content */
  from: number;
  to: number;
  preview: string;
  matchText: string;
};

export type SearchOptions = {
  query: string;
  caseSensitive?: boolean;
  useRegex?: boolean;
  maxPerFile?: number;
  maxTotal?: number;
};

export type ReplacePreview = SearchMatch & {
  replacement: string;
  previewAfter: string;
};

function buildMatcher(
  query: string,
  opts: { caseSensitive: boolean; useRegex: boolean }
): RegExp | null {
  if (!query) return null;
  try {
    if (opts.useRegex) {
      return new RegExp(query, opts.caseSensitive ? 'g' : 'gi');
    }
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(escaped, opts.caseSensitive ? 'g' : 'gi');
  } catch {
    return null;
  }
}

function lineColAt(content: string, offset: number): { line: number; column: number } {
  let line = 1;
  let lastNl = -1;
  for (let i = 0; i < offset; i++) {
    if (content[i] === '\n') {
      line++;
      lastNl = i;
    }
  }
  return { line, column: offset - lastNl };
}

function linePreview(content: string, offset: number, matchLen: number): string {
  const start = content.lastIndexOf('\n', offset - 1) + 1;
  let end = content.indexOf('\n', offset);
  if (end < 0) end = content.length;
  let line = content.slice(start, end);
  if (line.length > 120) {
    const local = offset - start;
    const from = Math.max(0, local - 40);
    const to = Math.min(line.length, local + matchLen + 40);
    line =
      (from > 0 ? '…' : '') + line.slice(from, to) + (to < line.length ? '…' : '');
  }
  return line.trimEnd();
}

export function searchProjectFiles(
  files: Map<string, string>,
  options: SearchOptions
): SearchMatch[] {
  const caseSensitive = options.caseSensitive ?? false;
  const useRegex = options.useRegex ?? false;
  const maxPerFile = options.maxPerFile ?? 200;
  const maxTotal = options.maxTotal ?? 2000;
  const re = buildMatcher(options.query, { caseSensitive, useRegex });
  if (!re) return [];

  const results: SearchMatch[] = [];
  for (const [path, content] of files) {
    if (!/\.(tex|ltx|bib|cls|sty|md|txt)$/i.test(path)) continue;
    let perFile = 0;
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex++;
        continue;
      }
      const { line, column } = lineColAt(content, m.index);
      results.push({
        path,
        line,
        column,
        from: m.index,
        to: m.index + m[0].length,
        preview: linePreview(content, m.index, m[0].length),
        matchText: m[0]
      });
      perFile++;
      if (perFile >= maxPerFile || results.length >= maxTotal) break;
    }
    if (results.length >= maxTotal) break;
  }
  return results;
}

export function replacementForMatch(
  matchText: string,
  query: string,
  replace: string,
  opts: { caseSensitive: boolean; useRegex: boolean }
): string {
  if (!opts.useRegex) return replace;
  try {
    const flags = opts.caseSensitive ? '' : 'i';
    return matchText.replace(new RegExp(query, flags), replace);
  } catch {
    return replace;
  }
}

export function previewReplacements(
  matches: SearchMatch[],
  files: Map<string, string>,
  query: string,
  replace: string,
  opts: { caseSensitive: boolean; useRegex: boolean }
): ReplacePreview[] {
  return matches.map((match) => {
    const replacement = replacementForMatch(match.matchText, query, replace, opts);
    const content = files.get(match.path) ?? '';
    const after = content.slice(0, match.from) + replacement + content.slice(match.to);
    return {
      ...match,
      replacement,
      previewAfter: linePreview(after, match.from, replacement.length)
    };
  });
}

/**
 * Apply replacements from last to first within each file so offsets stay valid.
 * Returns updated file contents (only changed paths).
 */
export function applyReplacements(
  files: Map<string, string>,
  edits: Array<{ path: string; from: number; to: number; replacement: string }>
): Map<string, string> {
  const byPath = new Map<string, typeof edits>();
  for (const edit of edits) {
    const list = byPath.get(edit.path) ?? [];
    list.push(edit);
    byPath.set(edit.path, list);
  }
  const out = new Map<string, string>();
  for (const [path, list] of byPath) {
    const content = files.get(path);
    if (content === undefined) continue;
    const sorted = [...list].sort((a, b) => b.from - a.from);
    let next = content;
    for (const edit of sorted) {
      next = next.slice(0, edit.from) + edit.replacement + next.slice(edit.to);
    }
    out.set(path, next);
  }
  return out;
}
