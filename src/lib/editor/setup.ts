import { EditorState, Compartment, Prec, type Extension } from '@codemirror/state';
import { EditorView, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor, rectangularSelection, crosshairCursor, keymap } from '@codemirror/view';
import { defaultKeymap as _defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';

// filter out Mod-/ (toggleComment), reserved for the snippet picker
const defaultKeymap = _defaultKeymap.filter(k => k.key !== 'Mod-/');

import { foldable, foldAll, foldEffect, foldGutter, foldKeymap, foldedRanges, bracketMatching, indentOnInput, unfoldAll, unfoldEffect } from '@codemirror/language';
import { acceptCompletion, clearSnippet, closeBrackets, closeBracketsKeymap, closeCompletion, nextSnippetField, prevSnippetField, selectedCompletion, snippet, snippetKeymap } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { latexFolding, latexLanguage } from './latex-language';
import { darkEditorTheme, lightEditorTheme, darkHighlight, lightHighlight } from './theme';
import { tabKeymap } from './keybindings';
import { hasMatchingEnd, latexAutocomplete } from './autocomplete';
import { latexLintGutter } from './latex-lint';
import { snippetFieldKeys } from './key-conflicts';
import { expandVimtexImap } from './vimtex-imaps';
import { CodeMirror, getCM, Vim, vim } from '@replit/codemirror-vim';

export interface EditorConfig {
  doc: string;
  parent: HTMLElement;
  dark: boolean;
  onUpdate?: (content: string) => void;
  // pass the result of yCollab(...) here to enable collaborative editing
  collab?: Extension;
  /** Extra CodeMirror extensions (e.g. Cmd/Ctrl+click reference follow). */
  extraExtensions?: Extension[];
  /** Vim normal/insert mode. Snippet keys move when they clash with Vim. */
  vimMode?: boolean;
}

const themeCompartment = new Compartment();
const behaviorCompartment = new Compartment();

let vimSave: ((view: EditorView) => void) | null = null;

/** `:w` only runs if CodeMirror.commands.save is set; the stock adapter leaves it empty. */
export function setVimSaveHandler(handler: ((view: EditorView) => void) | null) {
  vimSave = handler;
}

CodeMirror.commands.save = (cm: { cm6?: EditorView }) => {
  if (cm?.cm6) vimSave?.(cm.cm6);
};

type FoldRange = { from: number; to: number };

function foldRangeAtCursor(view: EditorView): FoldRange | null {
  const pos = view.state.selection.main.head;
  const cursorLine = view.state.doc.lineAt(pos);
  for (let n = cursorLine.number; n >= 1; n--) {
    const line = view.state.doc.line(n);
    const range = foldable(view.state, line.from, line.to);
    if (!range) continue;
    const startsHere = view.state.doc.lineAt(range.from).number === cursorLine.number;
    if (range.to > pos && (range.from <= pos || startsHere)) return range;
  }
  return null;
}

function foldedAtCursor(view: EditorView): FoldRange | null {
  const pos = view.state.selection.main.head;
  const cursorLine = view.state.doc.lineAt(pos);
  const hits: FoldRange[] = [];
  foldedRanges(view.state).between(0, view.state.doc.length, (from, to) => {
    if (to <= pos) return;
    const startsHere = view.state.doc.lineAt(from).number === cursorLine.number;
    if (from <= pos || startsHere) hits.push({ from, to });
  });
  let best: FoldRange | null = null;
  for (const range of hits) {
    if (!best || range.from > best.from) best = range;
  }
  return best;
}

function vimEditor(cm: { cm6?: EditorView }): EditorView | null {
  return cm.cm6 ?? null;
}

const foldFlag = globalThis as { __texbrainVimFolds?: boolean };
if (!foldFlag.__texbrainVimFolds) {
  foldFlag.__texbrainVimFolds = true;
  Vim.defineAction('texbrainToggleFold', (cm) => {
    const view = vimEditor(cm as { cm6?: EditorView });
    if (!view) return;
    const open = foldedAtCursor(view);
    if (open) view.dispatch({ effects: unfoldEffect.of(open) });
    else {
      const range = foldRangeAtCursor(view);
      if (range) view.dispatch({ effects: foldEffect.of(range) });
    }
  });
  Vim.defineAction('texbrainCloseFold', (cm) => {
    const view = vimEditor(cm as { cm6?: EditorView });
    const range = view && foldRangeAtCursor(view);
    if (view && range) view.dispatch({ effects: foldEffect.of(range) });
  });
  Vim.defineAction('texbrainOpenFold', (cm) => {
    const view = vimEditor(cm as { cm6?: EditorView });
    const open = view && foldedAtCursor(view);
    if (view && open) view.dispatch({ effects: unfoldEffect.of(open) });
  });
  Vim.defineAction('texbrainFoldAll', (cm) => {
    const view = vimEditor(cm as { cm6?: EditorView });
    if (view) foldAll(view);
  });
  Vim.defineAction('texbrainUnfoldAll', (cm) => {
    const view = vimEditor(cm as { cm6?: EditorView });
    if (view) unfoldAll(view);
  });
  Vim.mapCommand('za', 'action', 'texbrainToggleFold', {}, {});
  Vim.mapCommand('zc', 'action', 'texbrainCloseFold', {}, {});
  Vim.mapCommand('zo', 'action', 'texbrainOpenFold', {}, {});
  Vim.mapCommand('zM', 'action', 'texbrainFoldAll', {}, {});
  Vim.mapCommand('zR', 'action', 'texbrainUnfoldAll', {}, {});
}

function vimInsertMode(view: EditorView): boolean | null {
  const cm = getCM(view);
  if (!cm?.state.vim) return null;
  return cm.state.vim.insertMode;
}

export function editorThemeExtensions(dark: boolean): Extension {
  return dark
    ? [darkEditorTheme, darkHighlight]
    : [lightEditorTheme, lightHighlight];
}

export function setEditorTheme(view: EditorView, dark: boolean) {
  view.dispatch({
    effects: themeCompartment.reconfigure(editorThemeExtensions(dark))
  });
}

const ENV_NAME = /^[A-Za-z*][A-Za-z0-9*]*$/;

/** Enter on `\begin{name}` (cursor may sit just before the auto-closed `}`) inserts `\end`. */
function expandBeginOnEnter(view: EditorView): boolean {
  if (view.state.readOnly || !view.state.selection.main.empty) return false;
  // Vim normal-mode Enter is `j^`. Only expand environments while typing.
  if (vimInsertMode(view) === false) return false;
  const head = view.state.selection.main.head;
  const line = view.state.doc.lineAt(head);
  const before = line.text.slice(0, head - line.from);
  const after = line.text.slice(head - line.from);
  if (!/^\s*\}?\s*$/.test(after)) return false;
  const match = before.match(/^(\s*)\\begin\{([A-Za-z*][A-Za-z0-9*]*)\}?\s*$/);
  if (!match || !ENV_NAME.test(match[2]) || hasMatchingEnd(view.state.doc, line.to, match[2])) return false;
  snippet('\\begin\\{' + match[2] + '\\}\n${}\n\\end\\{' + match[2] + '\\}')(
    view,
    null,
    line.from + match[1].length,
    line.to
  );
  return true;
}

function tabSnippetOrComplete(view: EditorView): boolean {
  if (acceptCompletion(view)) return true;
  if (nextSnippetField(view)) return true;
  const insert = vimInsertMode(view);
  if (insert === null) return false;
  if (insert) return indentWithTab.run?.(view) ?? false;
  return true;
}

function escapeSnippet(view: EditorView): boolean {
  if (closeCompletion(view)) return true;
  if (vimInsertMode(view) !== null) {
    clearSnippet(view);
    return false;
  }
  return clearSnippet(view);
}

function editorBehavior(vimMode: boolean): Extension {
  const fields = snippetFieldKeys(vimMode);
  return [
    vimMode ? vim({ status: true }) : [],
    Prec.high(keymap.of([
      { key: 'Enter', run: expandBeginOnEnter },
      { key: 'Tab', run: tabSnippetOrComplete },
      { key: 'Escape', run: escapeSnippet }
    ])),
    snippetKeymap.of([
      { key: 'Tab', run: tabSnippetOrComplete, shift: prevSnippetField },
      { key: fields.next, run: nextSnippetField },
      { key: fields.prev, run: prevSnippetField },
      { key: 'Escape', run: escapeSnippet }
    ]),
    vimMode ? [] : tabKeymap
  ];
}

export function setEditorBehavior(view: EditorView, vimMode: boolean) {
  view.dispatch({
    effects: behaviorCompartment.reconfigure(editorBehavior(vimMode))
  });
}

/** Expand display math and environments so the cursor lands inside the pair. */
function autoCloseLatex(): Extension {
  return EditorView.inputHandler.of((view, from, to, text) => {
    if (from !== to || view.state.readOnly || text.length !== 1) return false;
    const doc = view.state.doc;
    if (expandVimtexImap(view, from, to, text)) return true;

    if (text === '[' || text === '(' || text === '$') {
      const prev = doc.sliceString(Math.max(0, from - 2), from);
      const escaped = prev.endsWith('\\\\');
      if (text === '[' && prev.endsWith('\\') && !escaped) {
        snippet('[\n${}\n\\]')(view, null, from, to);
        return true;
      }
      if (text === '(' && prev.endsWith('\\') && !escaped) {
        snippet('(${}\\)')(view, null, from, to);
        return true;
      }
      if (text === '$' && prev.endsWith('$') && !prev.endsWith('$$')) {
        snippet('$\n${}\n$$')(view, null, from, to);
        return true;
      }
      return false;
    }

    if (text === '}') {
      const before = doc.sliceString(Math.max(0, from - 120), from);
      const begun = before.match(/\\begin\{([A-Za-z*][A-Za-z0-9*]*)\s*$/);
      if (!begun || !ENV_NAME.test(begun[1])) return false;
      const selected = selectedCompletion(view.state);
      if (
        selected &&
        selected.label.startsWith(begun[1]) &&
        selected.label.length > begun[1].length &&
        acceptCompletion(view)
      ) {
        return true;
      }
      if (hasMatchingEnd(doc, to, begun[1])) return false;
      const end = doc.sliceString(to, to + 1) === '}' ? to + 1 : to;
      snippet('\\}\n${}\n\\end\\{' + begun[1] + '\\}')(view, null, from, end);
      return true;
    }

    if (text === '\n') {
      const line = doc.lineAt(from);
      if (from < line.to && line.text.slice(from - line.from).trim() !== '') return false;
      const match = line.text.match(/^(\s*)\\begin\{([A-Za-z*][A-Za-z0-9*]*)\}\s*$/);
      if (!match || !ENV_NAME.test(match[2]) || hasMatchingEnd(doc, line.to, match[2])) return false;
      snippet('\n${}\n\\end\\{' + match[2] + '\\}')(view, null, from, to);
      return true;
    }

    return false;
  });
}

export function createEditor(config: EditorConfig): EditorView {
  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged && config.onUpdate) {
      config.onUpdate(update.state.doc.toString());
    }
  });

  const extensions: Extension[] = [
    lineNumbers(),
    highlightActiveLineGutter(),
  ];

  // history only in solo mode; yCollab provides its own undo manager
  if (!config.collab) {
    extensions.push(history());
  }

  extensions.push(
    foldGutter(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    bracketMatching(),
    Prec.high(autoCloseLatex()),
    behaviorCompartment.of(editorBehavior(config.vimMode ?? false)),
    closeBrackets(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    EditorView.lineWrapping,
    EditorState.tabSize.of(2),
  );

  // collab extension (yCollab) includes remote cursors and undo keybindings
  if (config.collab) {
    extensions.push(
      config.collab,
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...foldKeymap
      ])
    );
  } else {
    extensions.push(
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap
      ])
    );
  }

  extensions.push(
    latexLanguage,
    latexFolding,
    themeCompartment.of(editorThemeExtensions(config.dark)),
    latexAutocomplete,
    latexLintGutter(),
    updateListener
  );

  if (config.extraExtensions?.length) {
    extensions.push(...config.extraExtensions);
  }

  const state = EditorState.create({
    doc: config.doc,
    extensions
  });

  return new EditorView({ state, parent: config.parent });
}

export function replaceEditorContent(view: EditorView, content: string) {
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: content }
  });
}

export function insertAtCursor(view: EditorView, text: string) {
  const cursor = view.state.selection.main.head;
  const cursorPlaceholder = text.indexOf('|');

  if (cursorPlaceholder !== -1) {
    const before = text.slice(0, cursorPlaceholder);
    const after = text.slice(cursorPlaceholder + 1);
    view.dispatch({
      changes: { from: cursor, insert: before + after },
      selection: { anchor: cursor + before.length }
    });
  } else {
    view.dispatch({
      changes: { from: cursor, insert: text },
      selection: { anchor: cursor + text.length }
    });
  }
  view.focus();
}
