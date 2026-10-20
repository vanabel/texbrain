<p align="right"><a href="../README.zh-CN.md">文档索引</a> · <a href="../../README.zh-CN.md">主 README</a> · <a href="../en/editor-completion.md">English</a></p>

# 编辑器补全与快捷键

编辑器在输入时闭合数学与环境，并在占位符之间跳转。文献键、标签和公式编号仍按工程里的 `.bib` / `\label` 补全。命令范围以 mathpaper.sty 实际加载的宏包为准（mathtools、amssymb、mathrsfs、amsrefs、cleveref、amsthm、thmtools、hyperref、xcolor），另加 mathpaper 自己的命令。

改完编辑器扩展后，已打开的页面需要刷新，CodeMirror 才会用上新的键位。

## 成对展开

光标落在内容里，缩进与开头那一行相同。

| 输入 | 结果 |
| --- | --- |
| `\[` | 展示公式，光标在中间一行。`\\[` 仍是换行，不会展开。 |
| `\(` | `\(` … `\)`，光标在中间。 |
| 紧挨着的第二个 `$` | `$$` 展示公式，光标在中间一行。 |
| `\begin{名字}` 后按 `}` 或 Enter | `\begin{名字}`、空行、`\end{名字}`。后面已经有配对的 `\end` 时不再插入。 |
| `\beg` 接受补全 | `\begin{名字}` 与 `\end{名字}` 的名字连在一起，改一边另一边跟着改。 |

`\begin{eq}` 时如果菜单里高亮的是更长的 `equation`，按 `}` 会接受这个名字，而不是收成 `\end{eq}`。

## 片段字段

带参数的命令（如 `\frac`、`\textbf`、`\cite`）接受后，光标在第一个参数里。

| 键 | 作用 |
| --- | --- |
| **Ctrl+J** | 下一个字段 |
| **Ctrl+K** | 上一个字段 |
| **Tab** | 菜单开着时接受补全；否则跳到下一个字段 |
| **Shift+Tab** | 上一个字段 |
| **Esc** | 先关掉补全菜单。菜单已经关掉时，清除片段 |

最后一个真正的占位符后面还有一个空字段，所以在最后一个参数上按 **Ctrl+K** 还能跳回去。命令面板是 **⌘K**，不再占用 **Ctrl+K**。

## VimTeX 式插入映射

只在数学区域里展开：`$` / `$$`、`\(` `\)`、`\[` `\]`，以及 `equation`、`align`、`gather`、`matrix` 等环境。`verbatim`、`lstlisting`、`minted` 里不展开。引导符是反引号 `` ` ``。前面有奇数个 `\` 时不当作引导符。

| 输入 | 展开 |
| --- | --- |
| `` `a `` … `` `z `` | 希腊字母（与 vimtex 相同：`q` 是 `\theta`，`f` 是 `\phi`，`w` 是 `\omega`） |
| `` `D `` 等大写 | `\Delta`、`\Phi`、`\Gamma` 等 |
| `` `N `` | `\nabla` |
| `` `2 `` | `\sqrt` |
| `` `6 `` | `\partial` |
| `` `8 `` | `\infty` |
| `` `jj `` / `` `jk `` / `` `jh `` / `` `jl `` | 下、上、左、右箭头；第二下再按大写则是双线箭头 |
| `` `ve `` 等 | `\varepsilon`、`\varphi`、`\vartheta` 等 |

`j` 和 `v` 要等第二个字符，单独按不会展开。数学里再按一个反引号会收成一个普通反引号；数学外面两个反引号保持原样，`` ``文字'' `` 仍可用。

`#` 加样式字母，再加一个字符，包进命令：`#bx` → `\mathbf{x}`。样式：`b` mathbf，`f` mathfrak，`c` mathcal，`B` mathbb，`-` overline，`/` slashed。

完整表在 `src/lib/editor/vimtex-imaps.ts`。

## 引用与 mathpaper 命令

`\cite{` 与 `\cites{` 都按文献键补全。`\cites{key1, key2}` 里逗号后面的那一段单独补全，接受时不会盖掉前面的键。侧栏 **Ctrl/⌘+单击** 插入时，若光标已经在这些命令的花括号里，会把新键接在后面。

一并识别的引用命令还有 `\ocite`、`\ocites`、`\citeauthor`、`\citeyear`、`\nocite`、`\bibselect`，以及原有的 biblatex 别名。`\cites` 里的键也会进入静态诊断和引用跟随。

cleveref：`\cref`、`\Cref`、`\crefrange`、`\eqref`、`\autoref`、`\namecref`、`\cpageref`。`\crefrange` 的第二个花括号同样补标签。

mathpaper 自身：`\step`、`\lh`、`\div`、`\curl`、`\tr`、`\osc`。环境短名：`thm`、`lem`、`cor`、`prop`、`defn`、`rmk`、`clm`。

常用数学命令包括 `\tag`、`\notag`、`\intertext`、`\shortintertext`、`\coloneqq`、`\mathclap`、`\binom`、`\mathscr`、`\textcolor`，以及 `\in`、`\subset`、`\implies` 一类符号。片段面板里可以用触发词 `cites` 插入 `\cites{…}`。

## Vim 模式

工具栏 **Vim 模式**，或命令面板里的「切换 Vim 模式」。选择记在本地（`texbrain-preferences`）。打开后使用 `@replit/codemirror-vim`：`i` 进入插入，**Esc** 回到普通模式，底栏显示 `--INSERT--` / `--NORMAL--`。

和补全键对照过 Vim 的默认键表（`src/lib/editor/key-conflicts.ts`）：

- **Ctrl+J / Ctrl+K** 不在这张表里，片段跳转保持不变。若以后冲突，会改到 **Alt+J / Alt+K**，再不行则是 **Ctrl+Alt+J / Ctrl+Alt+K**。按钮提示会写明。
- **Esc**：补全菜单开着时先关菜单。菜单关掉后交给 Vim 退出插入，同时清掉活动片段。
- **Enter**：菜单开着时接受候选项；插入模式里仍可展开 `\begin`；普通模式留给 Vim。
- **方向键**：菜单开着时移动选择，否则留给 Vim。
