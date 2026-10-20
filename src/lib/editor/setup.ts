import { EditorState, Compartment, Prec, type Extension } from '@codemirror/state';
import { EditorView, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor, rectangularSelection, crosshairCursor, keymap } from '@codemirror/view';
import { defaultKeymap as _defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';

// filter out Mod-/ (toggleComment), reserved for the snippet picker
const defaultKeymap = _defaultKeymap.filter(k => k.key !== 'Mod-/');

import { foldGutter, foldKeymap, bracketMatching, indentOnInput } from '@codemirror/language';
import { acceptCompletion, clearSnippet, closeBrackets, closeBracketsKeymap, closeCompletion, nextSnippetField, prevSnippetField, selectedCompletion, snippet, snippetKeymap } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { latexLanguage } from './latex-language';
import { darkEditorTheme, lightEditorTheme, darkHighlight, lightHighlight } from './theme';
import { tabKeymap } from './keybindings';
import { hasMatchingEnd, latexAutocomplete } from './autocomplete';
import { latexLintGutter } from './latex-lint';
import { snippetFieldKeys } from './key-conflicts';
import { expandVimtexImap } from './vimtex-imaps';
import { getCM, vim } from '@replit/codemirror-vim';

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
