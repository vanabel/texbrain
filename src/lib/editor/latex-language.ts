import { foldService, StreamLanguage, type IndentContext } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';

type EnvFrame = { name: string; verbatim: boolean };

type LatexState = {
  inMath: boolean;
  mathDelim: string;
  /** `\begin` / `\end` waiting for its `{name}`. */
  pendingEnv: 'begin' | 'end' | null;
  envStack: EnvFrame[];
  /** Brace depth inside an `@entry{...}` bibliography record. */
  bibDepth: number;
};

type IndentCx = IndentContext & {
  pos: number;
  column(pos: number): number;
  lineIndent(pos: number): number;
};

/** Body of these stays at column 0; inner environments still indent. */
const FLAT_ENVS = new Set(['document']);

/** Contents are not reindented. The closing `\end` still lines up with `\begin`. */
const VERBATIM_ENVS = new Set([
  'verbatim',
  'Verbatim',
  'lstlisting',
  'minted',
  'comment',
  'filecontents',
  'filecontents*'
]);

function takeEnvironment(stream: any, state: LatexState): string | null | false {
  if (state.pendingEnv) {
    if (stream.eatSpace()) return null;
    const nameMatch = stream.match(/^\{([^{}]*)\}/);
    if (nameMatch) {
      const name = nameMatch[1] as string;
      if (!FLAT_ENVS.has(name)) {
        if (state.pendingEnv === 'begin') {
          state.envStack.push({ name, verbatim: VERBATIM_ENVS.has(name) });
        } else if (state.envStack.length) {
          state.envStack.pop();
        }
      }
      state.pendingEnv = null;
      return 'typeName';
    }
    state.pendingEnv = null;
  }
  const cmd = stream.match(/^\\(begin|end)\b/);
  if (!cmd) return false;
  state.pendingEnv = cmd[1] === 'begin' ? 'begin' : 'end';
  return 'keyword';
}

/** Continuation of a `\bibitem` lines up with the text after the citation key. */
function bibliographyHang(context: IndentCx, textAfter: string): number | null {
  if (context.pos == null || !textAfter) return null;
  if (/^\\(begin|end|bibitem|item|part|chapter|section|subsection|subsubsection|paragraph|subparagraph)\b/.test(textAfter)) {
    return null;
  }
  const doc = context.state.doc;
  const line = doc.lineAt(context.pos);
  for (let n = line.number - 1; n >= 1; n--) {
    const prev = doc.line(n);
    const trimmed = prev.text.trim();
    if (!trimmed) return null;
    if (/^\\(begin|end|item)\b/.test(trimmed)) return null;
    const match = prev.text.match(/^(\s*)\\bibitem(?:\s*\[[^\]]*\])?\s*\{[^{}]*\}(.*)$/);
    if (!match) continue;
    const rest = match[2].trimStart();
    if (!rest) return context.lineIndent(prev.from) + context.unit;
    return context.column(prev.from + prev.text.length - rest.length);
  }
  return null;
}

const latexStreamParser = {
  languageData: {
    commentTokens: { line: '%' }
  },
  startState(): LatexState {
    return { inMath: false, mathDelim: '', pendingEnv: null, envStack: [], bibDepth: 0 };
  },
  /** `=` / `V=` reindents from environment nesting. `document` itself stays flat. */
  indent(state: LatexState, textAfter: string, context: IndentContext): number | null {
    const closing = /^\s*\\end\b/.test(textAfter);
    const depth = state.envStack.length;
    if (state.bibDepth > 0) {
      if (state.bibDepth === 1 && /^\}\s*,?\s*(%.*)?$/.test(textAfter)) return 0;
      return context.unit;
    }
    if (closing && depth > 0) return (depth - 1) * context.unit;
    if (state.envStack.some((frame) => frame.verbatim)) return null;
    const hang = bibliographyHang(context as IndentCx, textAfter);
    if (hang != null) return hang;
    return depth * context.unit;
  },
  token(stream: any, state: LatexState): string | null {
    if (stream.peek() === '%' && stream.string[stream.pos - 1] !== '\\') {
      stream.skipToEnd();
      return 'comment';
    }

    if (state.bibDepth > 0) {
      const ch = stream.next();
      if (ch === '{') state.bibDepth++;
      else if (ch === '}') state.bibDepth--;
      return ch === '=' ? 'operator' : null;
    }

    if (stream.match(/^@\w+\s*\{/)) {
      state.bibDepth = 1;
      return 'keyword';
    }

    // display math $$
    if (!state.inMath && stream.match('$$')) {
      state.inMath = true;
      state.mathDelim = '$$';
      return 'keyword';
    }
    if (state.inMath && state.mathDelim === '$$' && stream.match('$$')) {
      state.inMath = false;
      state.mathDelim = '';
      return 'keyword';
    }

    // inline math $
    if (!state.inMath && stream.peek() === '$' && !stream.match('$$', false)) {
      stream.next();
      state.inMath = true;
      state.mathDelim = '$';
      return 'keyword';
    }
    if (state.inMath && state.mathDelim === '$' && stream.peek() === '$') {
      stream.next();
      state.inMath = false;
      state.mathDelim = '';
      return 'keyword';
    }

    // \[ and \]
    if (!state.inMath && stream.match('\\[')) {
      state.inMath = true;
      state.mathDelim = '\\[';
      return 'keyword';
    }
    if (state.inMath && state.mathDelim === '\\[' && stream.match('\\]')) {
      state.inMath = false;
      state.mathDelim = '';
      return 'keyword';
    }

    const envToken = takeEnvironment(stream, state);
    if (envToken !== false) return envToken;

    if (state.inMath) {
      if (stream.match(/^\\[a-zA-Z@]+/)) return 'atom';
      if (stream.match(/^[{}]/)) return 'bracket';
      if (stream.match(/^[0-9]+(\.[0-9]+)?/)) return 'number';
      stream.next();
      return 'string';
    }

    if (stream.match(/^\\[a-zA-Z@]+\*?/)) {
      return 'tagName';
    }

    if (stream.match(/^\\./)) {
      return 'escape';
    }

    if (stream.match(/^[{}]/)) {
      return 'bracket';
    }

    if (stream.match(/^[\[\]]/)) {
      return 'squareBracket';
    }

    if (stream.match(/^[0-9]+(\.[0-9]+)?/)) {
      return 'number';
    }

    stream.next();
    return null;
  }
};

export const latexLanguage = StreamLanguage.define(latexStreamParser);

const SECTION_RANK: Record<string, number> = {
  part: 0,
  chapter: 1,
  section: 2,
  subsection: 3,
  subsubsection: 4,
  paragraph: 5,
  subparagraph: 6
};

/** Longer names first so `section` does not swallow `subsection`. */
const SECTION_RE =
  /\\(subsubsection|subsection|subparagraph|paragraph|chapter|section|part)\*?/;

function stripLineComment(line: string): string {
  let out = '';
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '%' && line[i - 1] !== '\\') break;
    out += line[i];
  }
  return out;
}

function foldPastLine(lineTo: number, to: number): { from: number; to: number } | null {
  if (to <= lineTo) return null;
  return { from: lineTo, to };
}

/** Folds that start on a line: environments, section headings, and BibTeX entries. */
export function latexFold(
  state: EditorState,
  lineStart: number
): { from: number; to: number } | null {
  const doc = state.doc;
  const line = doc.lineAt(lineStart);
  const text = stripLineComment(line.text);

  const begin = text.match(/\\begin\{([^{}]+)\}/);
  if (begin) {
    const name = begin[1];
    let depth = 1;
    for (let n = line.number + 1; n <= doc.lines; n++) {
      const row = stripLineComment(doc.line(n).text);
      const re = /\\(begin|end)\{([^{}]+)\}/g;
      let match: RegExpExecArray | null;
      while ((match = re.exec(row))) {
        if (match[2] !== name) continue;
        if (match[1] === 'begin') depth++;
        else if (--depth === 0) return foldPastLine(line.to, doc.line(n).from);
      }
    }
  }

  const heading = text.match(SECTION_RE);
  if (heading) {
    const rank = SECTION_RANK[heading[1]];
    for (let n = line.number + 1; n <= doc.lines; n++) {
      const row = stripLineComment(doc.line(n).text);
      const next = row.match(SECTION_RE);
      if (next && SECTION_RANK[next[1]] <= rank) return foldPastLine(line.to, doc.line(n).from);
    }
    return foldPastLine(line.to, doc.length);
  }

  if (/^\s*@\w+\s*\{/.test(text)) {
    let depth = 0;
    for (let n = line.number; n <= doc.lines; n++) {
      const row = stripLineComment(doc.line(n).text);
      for (const ch of row) {
        if (ch === '{') depth++;
        else if (ch === '}' && depth > 0 && --depth === 0) return foldPastLine(line.to, doc.line(n).from);
      }
    }
  }

  return null;
}

export const latexFolding = foldService.of((state, lineStart) => latexFold(state, lineStart));
