<p align="right"><a href="../README.md">Docs index</a> · <a href="../../README.md">Main README</a> · <a href="../zh-CN/editor-completion.md">中文</a></p>

# Editor completion and shortcuts

The editor closes math and environments as you type, and jumps between placeholders. Citation keys, labels, and equation numbers still come from the project’s `.bib` files and `\label`s. The command set follows the packages mathpaper.sty actually loads (mathtools, amssymb, mathrsfs, amsrefs, cleveref, amsthm, thmtools, hyperref, xcolor), plus mathpaper’s own macros.

Refresh an already open editor after these extensions change. CodeMirror keeps the keymap from when the view was created.

## Pair expansion

The cursor lands in the content, at the same indent as the opening line.

| Typed | Result |
| --- | --- |
| `\[` | Display math, cursor on the inner line. `\\[` stays a line break. |
| `\(` | `\(` … `\)`, cursor between them. |
| A second `$` immediately after one `$` | A `$$` display, cursor on the middle line. |
| `}` or Enter after `\begin{name}` | `\begin{name}`, a blank line, `\end{name}`. Skipped when a matching `\end` is already ahead. |
| Accepting `\beg` | `\begin{name}` and `\end{name}` share the name, so editing one updates the other. |

If `\begin{eq}` has the longer `equation` completion highlighted, `}` accepts that name.

## Snippet fields

Accepting a command with arguments (`\frac`, `\textbf`, `\cite`, …) places the cursor in the first argument.

| Key | Action |
| --- | --- |
| **Ctrl+J** | Next field |
| **Ctrl+K** | Previous field |
| **Tab** | Accept the open completion menu; otherwise jump to the next field |
| **Shift+Tab** | Previous field |
| **Esc** | Close the completion menu. If the menu is already closed, clear the snippet |

An empty field sits after the last real placeholder, so **Ctrl+K** can leave that last argument. The command palette is **⌘K**, which leaves **Ctrl+K** free.

## VimTeX-style insert maps

Maps expand only in math: `$` / `$$`, `\(` `\)`, `\[` `\]`, and environments such as `equation`, `align`, `gather`, and `matrix`. They stay inert in `verbatim`, `lstlisting`, and `minted`. The leader is a backtick. A backtick preceded by an odd number of backslashes is not a leader.

| Typed | Expansion |
| --- | --- |
| `` `a `` … `` `z `` | Greek letters, matching vimtex (`q` is `\theta`, `f` is `\phi`, `w` is `\omega`) |
| `` `D `` and other capitals | `\Delta`, `\Phi`, `\Gamma`, and the rest of that list |
| `` `N `` | `\nabla` |
| `` `2 `` | `\sqrt` |
| `` `6 `` | `\partial` |
| `` `8 `` | `\infty` |
| `` `jj `` / `` `jk `` / `` `jh `` / `` `jl `` | Down, up, left, and right arrows; a capital second letter makes the double arrow |
| `` `ve `` and similar | `\varepsilon`, `\varphi`, `\vartheta`, and the other `v` variants |

`j` and `v` wait for a second character. A second backtick in math collapses to one literal backtick; outside math both backticks stay, so `` ``text'' `` still works.

`#`, a style letter, and one character wrap that character: `#bx` becomes `\mathbf{x}`. Styles: `b` mathbf, `f` mathfrak, `c` mathcal, `B` mathbb, `-` overline, `/` slashed.

The full table is `src/lib/editor/vimtex-imaps.ts`.

## Citations and mathpaper commands

Both `\cite{` and `\cites{` complete bibliography keys. In `\cites{key1, key2}` only the segment after the last comma is completed, so accepting a key leaves the earlier keys in place. **Ctrl/⌘+click** in the References sidebar appends a key when the cursor is already inside one of these commands.

The same key completion covers `\ocite`, `\ocites`, `\citeauthor`, `\citeyear`, `\nocite`, `\bibselect`, and the existing biblatex aliases. Keys inside `\cites` are included in static diagnostics and reference following.

cleveref: `\cref`, `\Cref`, `\crefrange`, `\eqref`, `\autoref`, `\namecref`, `\cpageref`. The second brace of `\crefrange` completes labels too.

mathpaper’s own macros: `\step`, `\lh`, `\div`, `\curl`, `\tr`, `\osc`. Short environment names: `thm`, `lem`, `cor`, `prop`, `defn`, `rmk`, `clm`.

Common math commands include `\tag`, `\notag`, `\intertext`, `\shortintertext`, `\coloneqq`, `\mathclap`, `\binom`, `\mathscr`, `\textcolor`, and symbols such as `\in`, `\subset`, and `\implies`. The snippet picker trigger `cites` inserts `\cites{…}`.

## Vim mode

Toggle **Vim mode** on the toolbar, or “Toggle Vim mode” in the command palette. The choice is stored locally (`texbrain-preferences`). The editor then uses `@replit/codemirror-vim`: `i` enters insert mode, **Esc** returns to normal mode, and the editor footer shows `--INSERT--` or `--NORMAL--`.

Completion keys are compared with Vim’s default map (`src/lib/editor/key-conflicts.ts`):

- **Ctrl+J / Ctrl+K** are not in that map, so snippet jumps stay. If they ever clash, they move to **Alt+J / Alt+K**, then **Ctrl+Alt+J / Ctrl+Alt+K**. The button tooltip says which pair is active.
- **Esc** closes an open completion menu. With the menu closed, Vim leaves insert mode and any active snippet is cleared.
- **Enter** accepts a completion while the menu is open, still expands `\begin` in insert mode, and stays with Vim in normal mode.
- **Arrow keys** move the menu selection while it is open, and otherwise stay with Vim.

While Vim mode is on and the editor is focused, these **Ctrl** chords stay with Vim instead of the page shortcuts: **Ctrl+O** walks the jump list backward (one normal command from insert mode), **Ctrl+B** pages up, and **Ctrl+P** moves up a line. The matching **⌘** shortcuts on macOS are unchanged (open file, toggle the sidebar, toggle the preview).

Editing commands that write through this editor:

- **`:w`** writes the current buffer to the open file, the same path as the toolbar Save button.
- **`=`** / **`V=`** reindents from environment nesting. The body of `document` stays at column 0; contents of verbatim-like environments are left as typed, and only the closing `\end` lines up with `\begin`. **`>>`** / **`<<`** still shift by one indent level.
- **`gc`** / **`gcc`** toggle a `%` line comment.
