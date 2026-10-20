import { EditorState, Compartment, Prec, type Extension } from '@codemirror/state';
import { EditorView, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor, rectangularSelection, crosshairCursor, keymap } from '@codemirror/view';
import { defaultKeymap as _defaultKeymap, history, historyKeymap } from '@codemirror/commands';

// filter out Mod-/ (toggleComment), reserved for the snippet picker
const defaultKeymap = _defaultKeymap.filter(k => k.key !== 'Mod-/');

import { foldGutter, foldKeymap, bracketMatching, indentOnInput } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap, snippet } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { latexLanguage } from './latex-language';
import { darkEditorTheme, lightEditorTheme, darkHighlight, lightHighlight } from './theme';
import { tabKeymap } from './keybindings';
import { latexAutocomplete } from './autocomplete';
import { latexLintGutter } from './latex-lint';

export interface EditorConfig {
  doc: string;
  parent: HTMLElement;
  dark: boolean;
  onUpdate?: (content: string) => void;
  // pass the result of yCollab(...) here to enable collaborative editing
  collab?: Extension;
  /** Extra CodeMirror extensions (e.g. Cmd/Ctrl+click reference follow). */
  extraExtensions?: Extension[];
}

const themeCompartment = new Compartment();

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

function hasMatchingEnd(doc: EditorState['doc'], pos: number, name: string): boolean {
  const after = doc.sliceString(pos, Math.min(doc.length, pos + 400));
  return after.includes(`\\end{${name}}`);
}

/** Expand display math and environments so the cursor lands inside the pair. */
function autoCloseLatex(): Extension {
  return EditorView.inputHandler.of((view, from, to, text) => {
    if (from !== to || view.state.readOnly || text.length !== 1) return false;
    const doc = view.state.doc;

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
      if (!begun || hasMatchingEnd(doc, to, begun[1])) return false;
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
    tabKeymap,
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
