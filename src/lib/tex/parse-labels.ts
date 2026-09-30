import { withoutComments, lineAtOffset } from './comments';

export interface LabelRef {
  key: string;
  filePath: string;
  /** 1-based line */
  line: number;
  /** Nearby context (section / equation hint) */
  detail?: string;
}

const LABEL_RE = /\\label\s*\{([^{}]+)\}/g;

export function parseLabelsFromTex(content: string, filePath: string): LabelRef[] {
  const entries: LabelRef[] = [];
  const clean = withoutComments(content);
  LABEL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = LABEL_RE.exec(clean)) !== null) {
    const key = m[1].trim();
    if (!key) continue;
    const line = lineAtOffset(content, m.index);
    const lineStart = content.lastIndexOf('\n', m.index - 1) + 1;
    const lineEnd = content.indexOf('\n', m.index);
    const lineText = content.slice(lineStart, lineEnd < 0 ? undefined : lineEnd).trim();
    const detail = lineText.length > 80 ? lineText.slice(0, 77) + '…' : lineText;
    entries.push({ key, filePath, line, detail });
  }
  return entries;
}

export function collectProjectLabels(files: Map<string, string>): LabelRef[] {
  const byKey = new Map<string, LabelRef>();
  for (const [path, content] of files) {
    if (!/\.(tex|ltx)$/i.test(path)) continue;
    for (const entry of parseLabelsFromTex(content, path)) {
      if (!byKey.has(entry.key)) byKey.set(entry.key, entry);
    }
  }
  return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
}
