import { resolveInputPath } from './resolve-input';

export type SectionCommand =
  | 'part'
  | 'chapter'
  | 'section'
  | 'subsection'
  | 'subsubsection'
  | 'paragraph'
  | 'subparagraph';

export interface TocEntry {
  command: SectionCommand;
  level: number;
  title: string;
  /** Project-relative path of the .tex file */
  filePath: string;
  /** 1-based line number in source */
  line: number;
}

const INPUT_RE = /\\(?:input|include)\{([^}]+)\}/;

export function tocEntryId(entry: TocEntry): string {
  return `${entry.filePath}:${entry.line}`;
}

const SECTION_COMMANDS: SectionCommand[] = [
  'part',
  'chapter',
  'section',
  'subsection',
  'subsubsection',
  'paragraph',
  'subparagraph'
];

const LEVEL: Record<SectionCommand, number> = {
  part: 0,
  chapter: 1,
  section: 2,
  subsection: 3,
  subsubsection: 4,
  paragraph: 5,
  subparagraph: 6
};

const SECTION_RE = new RegExp(
  `\\\\(${SECTION_COMMANDS.join('|')})\\*?(?:\\[[^\\]]*\\])?`,
  'g'
);

function stripLineComment(line: string): string {
  for (let i = 0; i < line.length; i++) {
    if (line[i] !== '%') continue;
    let bs = 0;
    for (let j = i - 1; j >= 0 && line[j] === '\\'; j--) bs++;
    if (bs % 2 === 0) return line.slice(0, i);
  }
  return line;
}

function parseBracedArg(text: string, start: number): { value: string; end: number } | null {
  if (text[start] !== '{') return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return { value: text.slice(start + 1, i), end: i + 1 };
    }
  }
  return null;
}

function skipOptionalArg(text: string, start: number): number {
  if (text[start] !== '[') return start;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return start;
}

/** Strip simple LaTeX markup for sidebar display. */
export function simplifyTocTitle(raw: string): string {
  let s = raw.trim();
  if (!s) return raw.trim();
  // Remove common inline/block commands with one braced arg
  for (let pass = 0; pass < 4; pass++) {
    const next = s.replace(/\\[a-zA-Z@]+\*?(\[[^\]]*\])?\{[^{}]*\}/g, ' ');
    if (next === s) break;
    s = next;
  }
  s = s.replace(/\s+/g, ' ').trim();
  return s || raw.trim();
}

function parseSectionOnLine(line: string, lineNo: number, filePath: string): TocEntry | null {
  const text = stripLineComment(line);
  SECTION_RE.lastIndex = 0;
  const m = SECTION_RE.exec(text);
  if (!m) return null;
  const command = m[1] as SectionCommand;
  let idx = m.index + m[0].length;
  idx = skipOptionalArg(text, idx);
  const arg = parseBracedArg(text, idx);
  if (!arg) return null;
  return {
    command,
    level: LEVEL[command],
    title: simplifyTocTitle(arg.value),
    filePath,
    line: lineNo
  };
}

function parseInputOnLine(line: string): string | null {
  const text = stripLineComment(line);
  const m = INPUT_RE.exec(text);
  return m ? m[1] : null;
}

/** Build a table of contents from one buffer (no \\input/\\include expansion). */
export function parseTexToc(source: string, filePath: string): TocEntry[] {
  const lines = source.split(/\r?\n/);
  const entries: TocEntry[] = [];
  for (let i = 0; i < lines.length; i++) {
    const entry = parseSectionOnLine(lines[i], i + 1, filePath);
    if (entry) entries.push(entry);
  }
  return entries;
}

function collectTocFromFile(
  filePath: string,
  projectFiles: Map<string, string>,
  visited: Set<string>
): TocEntry[] {
  if (visited.has(filePath)) return [];
  visited.add(filePath);

  const content = projectFiles.get(filePath);
  if (!content) return [];

  const docIdx = content.indexOf('\\begin{document}');
  const preambleLines = docIdx >= 0 ? content.slice(0, docIdx).split(/\r?\n/).length : 0;
  const body = docIdx >= 0 ? content.slice(docIdx) : content;
  const bodyLines = body.split(/\r?\n/);

  const entries: TocEntry[] = [];
  for (let i = 0; i < bodyLines.length; i++) {
    const lineNo = preambleLines + i + 1;
    const line = bodyLines[i];

    const section = parseSectionOnLine(line, lineNo, filePath);
    if (section) {
      entries.push(section);
      continue;
    }

    const inputArg = parseInputOnLine(line);
    if (inputArg) {
      const childPath = resolveInputPath(inputArg, filePath, projectFiles);
      if (childPath) {
        entries.push(...collectTocFromFile(childPath, projectFiles, visited));
      }
    }
  }
  return entries;
}

/** Flat TOC for a root file, expanding \\input / \\include in document order. */
export function parseTexTocWithIncludes(
  rootPath: string,
  projectFiles: Map<string, string>
): TocEntry[] {
  if (!projectFiles.has(rootPath)) return [];
  return collectTocFromFile(rootPath, projectFiles, new Set());
}

export interface TocNode {
  entry: TocEntry;
  children: TocNode[];
}

/** Nest flat section list into a tree by LaTeX heading level. */
export function buildTocTree(entries: TocEntry[]): TocNode[] {
  const roots: TocNode[] = [];
  const stack: TocNode[] = [];
  for (const entry of entries) {
    const node: TocNode = { entry, children: [] };
    while (stack.length > 0 && stack[stack.length - 1].entry.level >= entry.level) {
      stack.pop();
    }
    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }
    stack.push(node);
  }
  return roots;
}
