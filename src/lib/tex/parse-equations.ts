import { resolveInputPath } from './resolve-input';

export interface EquationRef {
  /** Display number as in PDF, e.g. "4.2" */
  number: string;
  label: string;
  filePath: string;
  line: number;
  /** One-line preview of equation body */
  preview?: string;
}

const INPUT_RE = /\\(?:input|include)\{([^}]+)\}/;
const CHAPTER_RE = /\\chapter(\*)?/;
const SECTION_RE = /\\(section|subsection)(\*)?/;
const MATH_BEGIN_RE =
  /\\begin\{(equation\*|align\*|gather\*|multline\*|eqnarray\*|equation|align|gather|multline|eqnarray)\}/;
const MATH_END_RE =
  /\\end\{(equation\*|align\*|gather\*|multline\*|eqnarray\*|equation|align|gather|multline|eqnarray)\}/;
const LABEL_RE = /\\label\{([^}]+)\}/g;
const TAG_RE = /\\tag\{([^}]+)\}/;

const MAX_ENV_LINES = 2000;
const MAX_LABELS_PER_ENV = 64;
const MAX_EQUATION_REFS = 8000;

function stripLineComment(line: string): string {
  for (let i = 0; i < line.length; i++) {
    if (line[i] !== '%') continue;
    let bs = 0;
    for (let j = i - 1; j >= 0 && line[j] === '\\'; j--) bs++;
    if (bs % 2 === 0) return line.slice(0, i);
  }
  return line;
}

function simplifyPreview(raw: string): string {
  let s = raw.replace(/\s+/g, ' ').trim();
  if (s.length > 72) s = s.slice(0, 69) + '…';
  return s;
}

function extractLabels(bodyText: string): string[] {
  const labels: string[] = [];
  LABEL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = LABEL_RE.exec(bodyText)) !== null) {
    labels.push(m[1].trim());
    if (labels.length >= MAX_LABELS_PER_ENV) break;
    if (m.index === LABEL_RE.lastIndex) LABEL_RE.lastIndex++;
  }
  return labels;
}

interface CounterState {
  chapter: number;
  section: number;
  equation: number;
}

function formatNumber(state: CounterState): string {
  if (state.chapter > 0) {
    return `${state.chapter}.${state.section}.${state.equation}`;
  }
  return `${state.section}.${state.equation}`;
}

function isStarredEnv(name: string): boolean {
  return name.endsWith('*');
}

function envNamesMatch(beginName: string, endName: string): boolean {
  const b = beginName.replace(/\*$/, '');
  const e = endName.replace(/\*$/, '');
  return b === e;
}

function collectFromFile(
  filePath: string,
  projectFiles: Map<string, string>,
  visited: Set<string>,
  out: EquationRef[]
): void {
  if (visited.has(filePath) || out.length >= MAX_EQUATION_REFS) return;
  visited.add(filePath);

  const content = projectFiles.get(filePath);
  if (!content) return;

  const docIdx = content.indexOf('\\begin{document}');
  const preambleLines = docIdx >= 0 ? content.slice(0, docIdx).split(/\r?\n/).length : 0;
  const body = docIdx >= 0 ? content.slice(docIdx) : content;
  const lines = body.split(/\r?\n/);

  const state: CounterState = { chapter: 0, section: 0, equation: 0 };
  let activeEnv: string | null = null;
  let envStarred = false;
  let envBody: string[] = [];
  let envStartLine = 0;
  let pendingTag: string | null = null;

  const flushEnv = () => {
    if (!activeEnv) return;
    const bodyText = envBody.join('\n');
    const labels = extractLabels(bodyText);
    const preview = simplifyPreview(bodyText.replace(/\\label\{[^}]*\}/g, '').trim());
    const display = pendingTag || (envStarred ? null : formatNumber(state));
    pendingTag = null;

    if (display && labels.length > 0) {
      for (const label of labels) {
        if (out.length >= MAX_EQUATION_REFS) break;
        out.push({ number: display, label, filePath, line: envStartLine, preview });
      }
    } else if (display && !envStarred && out.length < MAX_EQUATION_REFS) {
      out.push({ number: display, label: '', filePath, line: envStartLine, preview });
    }
    activeEnv = null;
    envBody = [];
  };

  for (let i = 0; i < lines.length; i++) {
    if (out.length >= MAX_EQUATION_REFS) break;

    const lineNo = preambleLines + i + 1;
    const line = stripLineComment(lines[i]);

    const inputArg = INPUT_RE.exec(line);
    if (inputArg) {
      flushEnv();
      const childPath = resolveInputPath(inputArg[1], filePath, projectFiles);
      if (childPath) collectFromFile(childPath, projectFiles, visited, out);
      continue;
    }

    const ch = CHAPTER_RE.exec(line);
    if (ch && !ch[1]) {
      state.chapter++;
      state.section = 0;
      state.equation = 0;
    }

    const sec = SECTION_RE.exec(line);
    if (sec && !sec[2] && sec[1] === 'section') {
      state.section++;
      state.equation = 0;
    }

    const tag = TAG_RE.exec(line);
    if (tag) pendingTag = tag[1].trim();

    if (activeEnv) {
      envBody.push(line);
      const endM = MATH_END_RE.exec(line);
      if (endM && envNamesMatch(activeEnv, endM[1])) {
        flushEnv();
      } else if (envBody.length >= MAX_ENV_LINES) {
        flushEnv();
      }
      continue;
    }

    const begin = MATH_BEGIN_RE.exec(line);
    if (begin) {
      flushEnv();
      activeEnv = begin[1];
      envStarred = isStarredEnv(activeEnv);
      envStartLine = lineNo;
      envBody = [line];
      if (!envStarred) state.equation++;
      continue;
    }

    const inlineLabel = LABEL_RE.exec(line);
    LABEL_RE.lastIndex = 0;
    if (inlineLabel && /equation|eq\./i.test(inlineLabel[1])) {
      state.equation++;
      out.push({
        number: formatNumber(state),
        label: inlineLabel[1].trim(),
        filePath,
        line: lineNo,
        preview: simplifyPreview(line)
      });
    }
  }
  flushEnv();
}

/** Flat equation list for a root .tex file (with \\input / \\include). */
export function parseEquationsWithIncludes(
  rootPath: string,
  projectFiles: Map<string, string>
): EquationRef[] {
  if (!projectFiles.has(rootPath)) return [];
  try {
    const out: EquationRef[] = [];
    collectFromFile(rootPath, projectFiles, new Set(), out);
    return out;
  } catch {
    return [];
  }
}

export function parseEquationsInBuffer(source: string, filePath: string): EquationRef[] {
  const m = new Map<string, string>();
  m.set(filePath, source);
  return parseEquationsWithIncludes(filePath, m);
}
