import { autocompletion, insertCompletionText, pickedCompletion, snippet, type Completion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import type { EditorView } from '@codemirror/view';
import type { Text } from '@codemirror/state';
import { citeKeyCompletions, equationCompletions, labelKeyCompletions } from './project-autocomplete';

/** True when an `\end{name}` ahead closes the begin at `pos`, rather than a later begin. */
export function hasMatchingEnd(doc: Text, pos: number, name: string): boolean {
  const after = doc.sliceString(pos, doc.length);
  const endAt = after.indexOf(`\\end{${name}}`);
  if (endAt < 0) return false;
  const beginAt = after.indexOf(`\\begin{${name}}`);
  return beginAt < 0 || endAt < beginAt;
}

/**
 * `$` is the first placeholder. Each remaining empty `{}` is another.
 * An extra field after the text keeps the snippet active on the last
 * real placeholder, so Ctrl+K can jump back from it.
 */
function withCursor(template: string) {
  let n = 0;
  const marked = template
    .replace(/\$/g, () => `\${${++n}}`)
    .replace(/\{\}/g, () => `{\${${++n}}}`);
  return snippet(n > 1 ? `${marked}\${${n + 1}}` : marked);
}

const beginEnvironment = snippet('\\begin{${1}}\n${2}\n\\end{${1}}${3}');


const latexCommands = [
  { label: '\\begin', detail: 'Begin environment', apply: beginEnvironment },
  { label: '\\end', detail: 'End environment', apply: withCursor('\\end{$}') },
  { label: '\\textbf', detail: 'Bold text', apply: withCursor('\\textbf{$}') },
  { label: '\\textit', detail: 'Italic text', apply: withCursor('\\textit{$}') },
  { label: '\\underline', detail: 'Underline text', apply: withCursor('\\underline{$}') },
  { label: '\\emph', detail: 'Emphasis', apply: withCursor('\\emph{$}') },
  { label: '\\section', detail: 'Section heading', apply: withCursor('\\section{$}') },
  { label: '\\subsection', detail: 'Subsection heading', apply: withCursor('\\subsection{$}') },
  { label: '\\subsubsection', detail: 'Sub-subsection', apply: withCursor('\\subsubsection{$}') },
  { label: '\\chapter', detail: 'Chapter heading', apply: withCursor('\\chapter{$}') },
  { label: '\\paragraph', detail: 'Paragraph heading', apply: withCursor('\\paragraph{$}') },
  { label: '\\cite', detail: 'Citation', apply: withCursor('\\cite{$}') },
  { label: '\\cites', detail: 'Multiple citations (amsrefs)', apply: withCursor('\\cites{$}') },
  { label: '\\ocite', detail: 'Citation without brackets', apply: withCursor('\\ocite{$}') },
  { label: '\\ocites', detail: 'Multiple citations without brackets', apply: withCursor('\\ocites{$}') },
  { label: '\\citeauthor', detail: 'Cite author', apply: withCursor('\\citeauthor{$}') },
  { label: '\\citeyear', detail: 'Cite year', apply: withCursor('\\citeyear{$}') },
  { label: '\\nocite', detail: 'Cite without printing', apply: withCursor('\\nocite{$}') },
  { label: '\\bibselect', detail: 'Select bibliography (amsrefs)', apply: withCursor('\\bibselect{$}') },
  { label: '\\bibliography', detail: 'BibTeX bibliography files', apply: withCursor('\\bibliography{$}') },
  { label: '\\bibliographystyle', detail: 'BibTeX style', apply: withCursor('\\bibliographystyle{$}') },
  { label: '\\addbibresource', detail: 'biblatex bibliography file', apply: withCursor('\\addbibresource{$}') },
  { label: '\\printbibliography', detail: 'Print bibliography (biblatex)' },
  { label: '\\bibitem', detail: 'Manual bibliography item', apply: withCursor('\\bibitem{$}') },
  { label: '\\parencite', detail: 'Parenthetical citation (biblatex)', apply: withCursor('\\parencite{$}') },
  { label: '\\textcite', detail: 'Textual citation (biblatex)', apply: withCursor('\\textcite{$}') },
  { label: '\\autocite', detail: 'Automatic citation (biblatex)', apply: withCursor('\\autocite{$}') },
  { label: '\\footcite', detail: 'Footnote citation (biblatex)', apply: withCursor('\\footcite{$}') },
  { label: '\\fullcite', detail: 'Full citation (biblatex)', apply: withCursor('\\fullcite{$}') },
  { label: '\\citep', detail: 'Parenthetical citation (natbib)', apply: withCursor('\\citep{$}') },
  { label: '\\citet', detail: 'Textual citation (natbib)', apply: withCursor('\\citet{$}') },
  { label: '\\cref', detail: 'Clever reference', apply: withCursor('\\cref{$}') },
  { label: '\\Cref', detail: 'Clever reference, capitalized', apply: withCursor('\\Cref{$}') },
  { label: '\\crefrange', detail: 'Reference range', apply: withCursor('\\crefrange{$}{}') },
  { label: '\\eqref', detail: 'Equation reference', apply: withCursor('\\eqref{$}') },
  { label: '\\autoref', detail: 'Automatic reference', apply: withCursor('\\autoref{$}') },
  { label: '\\namecref', detail: 'Reference name', apply: withCursor('\\namecref{$}') },
  { label: '\\cpageref', detail: 'Page reference', apply: withCursor('\\cpageref{$}') },
  { label: '\\step', detail: 'Proof step' },
  { label: '\\lh', detail: 'Lie bracket' },
  { label: '\\div', detail: 'Divergence' },
  { label: '\\curl', detail: 'Curl' },
  { label: '\\tr', detail: 'Trace' },
  { label: '\\osc', detail: 'Oscillation' },
  { label: '\\qedhere', detail: 'Place the QED mark here' },
  { label: '\\tag', detail: 'Equation tag', apply: withCursor('\\tag{$}') },
  { label: '\\notag', detail: 'Suppress equation number' },
  { label: '\\intertext', detail: 'Text between aligned lines', apply: withCursor('\\intertext{$}') },
  { label: '\\shortintertext', detail: 'Short intertext', apply: withCursor('\\shortintertext{$}') },
  { label: '\\coloneqq', detail: 'Colon-equals' },
  { label: '\\eqqcolon', detail: 'Equals-colon' },
  { label: '\\mathclap', detail: 'Overlapping math', apply: withCursor('\\mathclap{$}') },
  { label: '\\binom', detail: 'Binomial coefficient', apply: withCursor('\\binom{$}{}') },
  { label: '\\substack', detail: 'Stacked subscript', apply: withCursor('\\substack{$}') },
  { label: '\\DeclareMathOperator', detail: 'Named operator', apply: withCursor('\\DeclareMathOperator{$}{}') },
  { label: '\\mathscr', detail: 'Script letters', apply: withCursor('\\mathscr{$}') },
  { label: '\\mathfrak', detail: 'Fraktur letters', apply: withCursor('\\mathfrak{$}') },
  { label: '\\textcolor', detail: 'Colored text', apply: withCursor('\\textcolor{$}{}') },
  { label: '\\emptyset', detail: 'Empty set' },
  { label: '\\in', detail: 'Element of' },
  { label: '\\notin', detail: 'Not an element of' },
  { label: '\\subset', detail: 'Subset' },
  { label: '\\subseteq', detail: 'Subset or equal' },
  { label: '\\supset', detail: 'Superset' },
  { label: '\\supseteq', detail: 'Superset or equal' },
  { label: '\\cup', detail: 'Union' },
  { label: '\\cap', detail: 'Intersection' },
  { label: '\\forall', detail: 'For all' },
  { label: '\\exists', detail: 'There exists' },
  { label: '\\implies', detail: 'Implies' },
  { label: '\\iff', detail: 'If and only if' },
  { label: '\\mapsto', detail: 'Maps to' },
  { label: '\\to', detail: 'Right arrow' },
  { label: '\\otimes', detail: 'Tensor product' },
  { label: '\\oplus', detail: 'Direct sum' },
  { label: '\\sim', detail: 'Similar' },
  { label: '\\cong', detail: 'Congruent' },
  { label: '\\equiv', detail: 'Equivalent' },
  { label: '\\pm', detail: 'Plus-minus' },
  { label: '\\eq', detail: 'Equation ref (display number)', apply: withCursor('\\eq{$}') },
  { label: '\\ref', detail: 'Reference', apply: withCursor('\\ref{$}') },
  { label: '\\label', detail: 'Label', apply: withCursor('\\label{$}') },
  { label: '\\footnote', detail: 'Footnote', apply: withCursor('\\footnote{$}') },
  { label: '\\href', detail: 'Hyperlink', apply: withCursor('\\href{$}{}') },
  { label: '\\url', detail: 'URL', apply: withCursor('\\url{$}') },
  { label: '\\includegraphics', detail: 'Include image', apply: withCursor('\\includegraphics[width=\\textwidth]{$}') },
  { label: '\\usepackage', detail: 'Import package', apply: withCursor('\\usepackage{$}') },
  { label: '\\documentclass', detail: 'Document class', apply: withCursor('\\documentclass{$}') },
  { label: '\\frac', detail: 'Fraction', apply: withCursor('\\frac{$}{}') },
  { label: '\\sqrt', detail: 'Square root', apply: withCursor('\\sqrt{$}') },
  { label: '\\sum', detail: 'Summation', apply: withCursor('\\sum_{$}^{}') },
  { label: '\\int', detail: 'Integral', apply: withCursor('\\int_{$}^{}') },
  { label: '\\lim', detail: 'Limit', apply: withCursor('\\lim_{$ \\to }') },
  { label: '\\alpha', detail: 'Greek: alpha' },
  { label: '\\beta', detail: 'Greek: beta' },
  { label: '\\gamma', detail: 'Greek: gamma' },
  { label: '\\delta', detail: 'Greek: delta' },
  { label: '\\epsilon', detail: 'Greek: epsilon' },
  { label: '\\theta', detail: 'Greek: theta' },
  { label: '\\lambda', detail: 'Greek: lambda' },
  { label: '\\mu', detail: 'Greek: mu' },
  { label: '\\pi', detail: 'Greek: pi' },
  { label: '\\sigma', detail: 'Greek: sigma' },
  { label: '\\phi', detail: 'Greek: phi' },
  { label: '\\omega', detail: 'Greek: omega' },
  { label: '\\infty', detail: 'Infinity symbol' },
  { label: '\\partial', detail: 'Partial derivative' },
  { label: '\\nabla', detail: 'Nabla/del' },
  { label: '\\cdot', detail: 'Center dot' },
  { label: '\\times', detail: 'Multiplication' },
  { label: '\\leq', detail: 'Less than or equal' },
  { label: '\\geq', detail: 'Greater than or equal' },
  { label: '\\neq', detail: 'Not equal' },
  { label: '\\approx', detail: 'Approximately' },
  { label: '\\rightarrow', detail: 'Right arrow' },
  { label: '\\leftarrow', detail: 'Left arrow' },
  { label: '\\Rightarrow', detail: 'Double right arrow' },
  { label: '\\overline', detail: 'Overline', apply: withCursor('\\overline{$}') },
  { label: '\\underbrace', detail: 'Underbrace', apply: withCursor('\\underbrace{$}_{}') },
  { label: '\\overbrace', detail: 'Overbrace', apply: withCursor('\\overbrace{$}^{}') },
  { label: '\\mathbb', detail: 'Blackboard bold', apply: withCursor('\\mathbb{$}') },
  { label: '\\mathcal', detail: 'Calligraphic', apply: withCursor('\\mathcal{$}') },
  { label: '\\mathrm', detail: 'Roman math', apply: withCursor('\\mathrm{$}') },
  { label: '\\text', detail: 'Text in math', apply: withCursor('\\text{$}') },
  { label: '\\item', detail: 'List item' },
  { label: '\\hspace', detail: 'Horizontal space', apply: withCursor('\\hspace{$}') },
  { label: '\\vspace', detail: 'Vertical space', apply: withCursor('\\vspace{$}') },
  { label: '\\newcommand', detail: 'New command', apply: withCursor('\\newcommand{$}{}') },
  { label: '\\renewcommand', detail: 'Renew command', apply: withCursor('\\renewcommand{$}{}') },
  { label: '\\newpage', detail: 'New page' },
  { label: '\\clearpage', detail: 'Clear page' },
  { label: '\\tableofcontents', detail: 'Table of contents' },
  { label: '\\maketitle', detail: 'Make title' },
  { label: '\\title', detail: 'Document title', apply: withCursor('\\title{$}') },
  { label: '\\author', detail: 'Author', apply: withCursor('\\author{$}') },
  { label: '\\date', detail: 'Date', apply: withCursor('\\date{$}') },
];

const environments = [
  'document', 'figure', 'table', 'tabular', 'equation', 'equation*',
  'align', 'align*', 'gather', 'gather*', 'itemize', 'enumerate',
  'description', 'abstract', 'center', 'flushleft', 'flushright',
  'minipage', 'frame', 'lstlisting', 'verbatim', 'quote',
  'theorem', 'thm', 'lemma', 'lem', 'cor', 'prop',
  'definition', 'defn', 'rmk', 'clm', 'proof', 'example', 'array', 'matrix',
  'bmatrix', 'pmatrix', 'cases', 'split', 'multline', 'thebibliography'
];

function applyBeginEnvironment(view: EditorView, completion: Completion, from: number, to: number) {
  const name = completion.label;
  const braceAlreadyClosed = view.state.sliceDoc(to, to + 1) === '}';
  const end = braceAlreadyClosed ? to + 1 : to;
  if (braceAlreadyClosed || hasMatchingEnd(view.state.doc, end, name)) {
    view.dispatch({
      ...insertCompletionText(view.state, name, from, to),
      annotations: pickedCompletion.of(completion)
    });
    return;
  }
  snippet(`${name}}\n\${1}\n\\end{${name}}\${2}`)(view, completion, from, end);
}

function latexCompletions(context: CompletionContext): CompletionResult | null {
  const commandMatch = context.matchBefore(/\\[a-zA-Z]*/);
  if (commandMatch) {
    return {
      from: commandMatch.from,
      options: latexCommands.map((cmd) => ({
        label: cmd.label,
        detail: cmd.detail,
        type: 'keyword',
        apply: cmd.apply || cmd.label
      })),
      validFor: /^\\[a-zA-Z]*$/
    };
  }

  const envMatch = context.matchBefore(/\\(begin|end)\{[a-zA-Z*]*/);
  if (envMatch) {
    const prefix = envMatch.text;
    const braceIdx = prefix.indexOf('{');
    const isBegin = prefix.startsWith('\\begin');
    return {
      from: envMatch.from + braceIdx + 1,
      options: environments.map((env) => ({
        label: env,
        type: 'type',
        apply: isBegin ? applyBeginEnvironment : undefined
      })),
      validFor: /^[a-zA-Z*]*$/
    };
  }

  return null;
}

export const latexAutocomplete = autocompletion({
  override: [citeKeyCompletions, labelKeyCompletions, equationCompletions, latexCompletions],
  icons: false,
  activateOnTyping: true,
  defaultKeymap: true
});
