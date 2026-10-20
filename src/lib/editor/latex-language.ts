import { StreamLanguage, type IndentContext } from '@codemirror/language';

type EnvFrame = { name: string; verbatim: boolean };

type LatexState = {
  inMath: boolean;
  mathDelim: string;
  /** `\begin` / `\end` waiting for its `{name}`. */
  pendingEnv: 'begin' | 'end' | null;
  envStack: EnvFrame[];
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

const latexStreamParser = {
  languageData: {
    commentTokens: { line: '%' }
  },
  startState(): LatexState {
    return { inMath: false, mathDelim: '', pendingEnv: null, envStack: [] };
  },
  /** `=` / `V=` reindents from environment nesting. `document` itself stays flat. */
  indent(state: LatexState, textAfter: string, context: IndentContext): number | null {
    const closing = /^\s*\\end\b/.test(textAfter);
    const depth = state.envStack.length;
    if (closing && depth > 0) return (depth - 1) * context.unit;
    if (state.envStack.some((frame) => frame.verbatim)) return null;
    return depth * context.unit;
  },
  token(stream: any, state: LatexState): string | null {
    if (stream.match('%')) {
      stream.skipToEnd();
      return 'comment';
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
