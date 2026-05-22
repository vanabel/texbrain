import type { EditorView } from '@codemirror/view';

const CITE_CMD_RE =
  /\\(?:cite|autocite|parencite|textcite|fullcite|citeauthor|citeyear|Cite|Autocite|Parencite|Textcite|Fullcite)(?:\*)?(?:\[[^\]]*\])*\{([^}]*)$/;

/** Insert a citation key at the cursor, merging with an open \\cite{...} if present. */
export function insertCitationKey(view: EditorView, key: string): void {
  const pos = view.state.selection.main.head;
  const before = view.state.doc.sliceString(0, pos);

  const citeMatch = before.match(CITE_CMD_RE);
  if (citeMatch) {
    const existing = citeMatch[1];
    const insertText =
      existing.trim() === '' ? key : existing.endsWith(',') ? key : `${existing},${key}`;
    const from = pos - existing.length;
    view.dispatch({
      changes: { from, to: pos, insert: insertText },
      selection: { anchor: from + insertText.length }
    });
    view.focus();
    return;
  }

  const text = `\\cite{${key}}`;
  view.dispatch({
    changes: { from: pos, insert: text },
    selection: { anchor: pos + text.length }
  });
  view.focus();
}

const EQ_CMD_RE = /\\eq(?:ref)?\{([^}]*)$/;

/** Insert an equation display number inside \\eq{...} or as a full \\eq{num}. */
export function insertEquationNumber(view: EditorView, number: string): void {
  const pos = view.state.selection.main.head;
  const before = view.state.doc.sliceString(0, pos);

  const eqMatch = before.match(EQ_CMD_RE);
  if (eqMatch) {
    const existing = eqMatch[1];
    const from = pos - existing.length;
    view.dispatch({
      changes: { from, to: pos, insert: number },
      selection: { anchor: from + number.length }
    });
    view.focus();
    return;
  }

  const text = `\\eq{${number}}`;
  view.dispatch({
    changes: { from: pos, insert: text },
    selection: { anchor: pos + text.length }
  });
  view.focus();
}
