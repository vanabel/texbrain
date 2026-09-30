import { type Extension } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';
import { lintGutter, setDiagnostics, type Diagnostic } from '@codemirror/lint';

export type EditorDiagItem = {
  type: 'error' | 'warning';
  message: string;
  line?: number;
  file?: string;
  from?: number;
  to?: number;
  source?: 'compiler' | 'latex';
};

function sameFile(diagPath: string | undefined, activePath: string): boolean {
  if (!diagPath) return true;
  const a = diagPath.replace(/\\/g, '/').replace(/^\.\//, '');
  const b = activePath.replace(/\\/g, '/').replace(/^\.\//, '');
  if (a === b) return true;
  if (b.endsWith('/' + a) || a.endsWith('/' + b)) return true;
  const ab = a.split('/').pop();
  const bb = b.split('/').pop();
  return !!ab && ab === bb;
}

function lineRange(doc: { lines: number; line: (n: number) => { from: number; to: number } }, line: number) {
  const ln = Math.max(1, Math.min(line, doc.lines));
  const row = doc.line(ln);
  return { from: row.from, to: row.to };
}

/** Gutter markers for CodeMirror lint diagnostics. */
export function latexLintGutter(): Extension {
  return lintGutter();
}

/**
 * Push static + compiler diagnostics for the active file into the editor.
 * Call whenever the active file or diagnostic stores change.
 */
export function applyEditorDiagnostics(
  view: EditorView,
  activePath: string | null | undefined,
  staticDiags: EditorDiagItem[],
  compileDiags: EditorDiagItem[] = []
): void {
  if (!activePath) {
    view.dispatch(setDiagnostics(view.state, []));
    return;
  }

  const doc = view.state.doc;
  const out: Diagnostic[] = [];
  const seen = new Set<string>();

  const push = (d: EditorDiagItem, source: string) => {
    if (!sameFile(d.file, activePath)) return;
    let from = d.from;
    let to = d.to;
    if (from == null || to == null || from < 0 || to > doc.length || from >= to) {
      if (!d.line) return;
      const range = lineRange(doc, d.line);
      from = range.from;
      to = range.to;
    } else {
      from = Math.max(0, Math.min(from, doc.length));
      to = Math.max(from, Math.min(to, doc.length));
    }
    const key = `${from}:${to}:${d.message}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      from,
      to,
      severity: d.type === 'error' ? 'error' : 'warning',
      message: d.message,
      source
    });
  };

  for (const d of staticDiags) push(d, d.source === 'latex' ? 'latex' : 'static');
  for (const d of compileDiags) push(d, 'compiler');

  view.dispatch(setDiagnostics(view.state, out));
}
