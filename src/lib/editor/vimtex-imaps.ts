import type { EditorView } from '@codemirror/view';
import type { Text } from '@codemirror/state';

/**
 * VimTeX insert-mode maps (`g:vimtex_imaps_list`).
 * Leader is `` ` ``. A second backtick inserts a literal backtick.
 * `#` plus a style letter wraps the following character, as in vimtex.
 */
const LEADER = '`';

const IMAPS: Record<string, string> = {
  '0': '\\emptyset',
  '2': '\\sqrt',
  '6': '\\partial',
  '8': '\\infty',
  '=': '\\equiv',
  '\\': '\\setminus',
  '.': '\\cdot',
  '*': '\\times',
  '<': '\\langle',
  '>': '\\rangle',
  H: '\\hbar',
  '+': '\\dagger',
  '[': '\\subseteq',
  ']': '\\supseteq',
  '(': '\\subset',
  ')': '\\supset',
  A: '\\forall',
  B: '\\boldsymbol',
  E: '\\exists',
  N: '\\nabla',
  jj: '\\downarrow',
  jJ: '\\Downarrow',
  jk: '\\uparrow',
  jK: '\\Uparrow',
  jh: '\\leftarrow',
  jH: '\\Leftarrow',
  jl: '\\rightarrow',
  jL: '\\Rightarrow',
  a: '\\alpha',
  b: '\\beta',
  c: '\\chi',
  d: '\\delta',
  e: '\\epsilon',
  f: '\\phi',
  g: '\\gamma',
  h: '\\eta',
  i: '\\iota',
  k: '\\kappa',
  l: '\\lambda',
  m: '\\mu',
  n: '\\nu',
  p: '\\pi',
  q: '\\theta',
  r: '\\rho',
  s: '\\sigma',
  t: '\\tau',
  y: '\\psi',
  u: '\\upsilon',
  w: '\\omega',
  z: '\\zeta',
  x: '\\xi',
  D: '\\Delta',
  F: '\\Phi',
  G: '\\Gamma',
  L: '\\Lambda',
  P: '\\Pi',
  Q: '\\Theta',
  S: '\\Sigma',
  U: '\\Upsilon',
  W: '\\Omega',
  X: '\\Xi',
  Y: '\\Psi',
  ve: '\\varepsilon',
  vf: '\\varphi',
  vk: '\\varkappa',
  vp: '\\varpi',
  vq: '\\vartheta',
  vr: '\\varrho'
};

const STYLE: Record<string, string> = {
  '/': 'slashed',
  b: 'mathbf',
  f: 'mathfrak',
  c: 'mathcal',
  '-': 'overline',
  B: 'mathbb'
};

const MATH_ENVS = new Set([
  'equation', 'equation*', 'align', 'align*', 'alignat', 'alignat*',
  'gather', 'gather*', 'multline', 'multline*', 'flalign', 'flalign*',
  'math', 'displaymath', 'eqnarray', 'eqnarray*', 'split', 'cases',
  'array', 'matrix', 'bmatrix', 'pmatrix', 'vmatrix', 'Vmatrix',
  'smallmatrix', 'xxalignat', 'subequations'
]);

const VERBATIM_ENVS = new Set(['verbatim', 'lstlisting', 'minted', 'Verbatim']);

function isPrefix(partial: string): boolean {
  if (IMAPS[partial]) return false;
  return Object.keys(IMAPS).some((key) => key.startsWith(partial) && key.length > partial.length);
}

function unescapedLeader(doc: Text, pos: number): boolean {
  if (doc.sliceString(pos, pos + 1) !== LEADER) return false;
  let slashes = 0;
  for (let i = pos - 1; i >= 0 && doc.sliceString(i, i + 1) === '\\'; i--) slashes++;
  return slashes % 2 === 0;
}

/** True when `pos` sits in math, using the same zones VimTeX's imaps respect. */
export function inMathZone(doc: Text, pos: number): boolean {
  const text = doc.sliceString(0, pos);
  let i = 0;
  let zone: '' | '$' | '$$' | '\\[' | '\\(' = '';
  const envs: string[] = [];
  let verbatim = 0;

  while (i < text.length) {
    if (text[i] === '%' && (i === 0 || text[i - 1] !== '\\')) {
      const nl = text.indexOf('\n', i);
      i = nl < 0 ? text.length : nl + 1;
      continue;
    }
    if (text[i] === '\\') {
      const rest = text.slice(i);
      if (verbatim === 0 && !zone && rest.startsWith('\\[')) { zone = '\\['; i += 2; continue; }
      if (zone === '\\[' && rest.startsWith('\\]')) { zone = ''; i += 2; continue; }
      if (verbatim === 0 && !zone && rest.startsWith('\\(')) { zone = '\\('; i += 2; continue; }
      if (zone === '\\(' && rest.startsWith('\\)')) { zone = ''; i += 2; continue; }
      const begun = /^\\begin\{([^}]+)\}/.exec(rest);
      if (begun) {
        if (VERBATIM_ENVS.has(begun[1])) verbatim++;
        else if (verbatim === 0 && MATH_ENVS.has(begun[1])) envs.push(begun[1]);
        i += begun[0].length;
        continue;
      }
      const ended = /^\\end\{([^}]+)\}/.exec(rest);
      if (ended) {
        if (VERBATIM_ENVS.has(ended[1]) && verbatim > 0) verbatim--;
        else if (verbatim === 0) {
          const at = envs.lastIndexOf(ended[1]);
          if (at >= 0) envs.splice(at, 1);
        }
        i += ended[0].length;
        continue;
      }
      i += Math.min(2, rest.length);
      continue;
    }
    if (verbatim === 0 && text[i] === '$') {
      const doubled = text[i + 1] === '$';
      if (!zone && envs.length === 0) zone = doubled ? '$$' : '$';
      else if (zone === '$$' && doubled) zone = '';
      else if (zone === '$' && !doubled) zone = '';
      else { i++; continue; }
      i += doubled ? 2 : 1;
      continue;
    }
    i++;
  }
  return verbatim === 0 && (zone !== '' || envs.length > 0);
}

function replaceWith(view: EditorView, from: number, to: number, insert: string) {
  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + insert.length },
    userEvent: 'input'
  });
}

/** Expand a VimTeX imap if the character just typed completes one. */
export function expandVimtexImap(view: EditorView, from: number, to: number, text: string): boolean {
  if (text.length !== 1 || from !== to) return false;
  const doc = view.state.doc;
  const prev2 = doc.sliceString(Math.max(0, from - 2), from);

  if (prev2.length === 2 && prev2[0] === LEADER && unescapedLeader(doc, from - 2)) {
    const lhs = prev2[1] + text;
    const rhs = IMAPS[lhs];
    if (rhs && inMathZone(doc, from - 2)) {
      replaceWith(view, from - 2, to, rhs);
      return true;
    }
  }

  if (prev2.length === 2 && prev2[0] === '#' && STYLE[prev2[1]] && inMathZone(doc, from - 2)) {
    replaceWith(view, from - 2, to, `\\${STYLE[prev2[1]]}{${text}}`);
    return true;
  }

  if (prev2.endsWith(LEADER) && unescapedLeader(doc, from - 1)) {
    if (text === LEADER) {
      if (!inMathZone(doc, from - 1)) return false;
      replaceWith(view, from - 1, to, LEADER);
      return true;
    }
    const rhs = IMAPS[text];
    if (rhs && !isPrefix(text) && inMathZone(doc, from - 1)) {
      replaceWith(view, from - 1, to, rhs);
      return true;
    }
  }

  return false;
}
