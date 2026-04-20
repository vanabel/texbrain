# BibTeX：英文 / 中文示例（TeXbrain 仓库内）

本目录属于 **TeXbrain** 主仓库的一部分，用于演示经典 **BibTeX**（`gbt7714` 与 `amsrefs` / `amsrn.bst`）在不同子目录中的工程布局。

## 在 TeXbrain（网页）里使用

1. 打开 [TeXbrain](https://tex.vanabel.cn)（或你自托管的实例）。
2. 欢迎页选择 **Clone Repository**。
3. 点击 **Use official TeXbrain repo (BibTeX EN/ZH example)**（会勾选「仅下载 `examples/`」），或手动填写 GitHub 地址并勾选 **Only download `examples/`**：只拉取 `examples/` 目录（zip，体积小、无完整 git 历史）；不勾选则为完整 `git clone`。
   - Repository URL：`https://github.com/vanabel/texbrain.git`
   - Project name：例如 `texbrain-examples`
4. 克隆完成后，在侧栏打开并编辑：
   - 英文：`examples/bibtex-metapost-english-chinese/English-bibtex/test-arxiv.tex`
   - 中文：`examples/bibtex-metapost-english-chinese/Chinese-bibtex/Chinese-bibtex.tex`
   - 中文（BibLaTeX + BibTeX 后端测试）：`examples/bibtex-metapost-english-chinese/Chinese-biblatex/Chinese-biblatex.tex`
   - MetaPost：`examples/bibtex-metapost-english-chinese/Metapost-mpostinl/metapost-mpostinl.tex`
5. 将 **Compile** 设为 **Active Tab**（或把 **Entry** 设为上述路径之一），再编译。编译器会**只使用主 `.tex` 所在子目录作为根目录**（与在该文件夹内单独跑 `pdflatex`/`bibtex` 一致），不要把父目录 `examples/bibtex-metapost-english-chinese/` 当作编译根。托管站点需已部署 **BusyTeX**（`pnpm run download-busytex`），经典 BibTeX 才会跑通。

## 在本地用 Git 获取

```bash
git clone https://github.com/vanabel/texbrain.git
cd texbrain/examples/bibtex-metapost-english-chinese
```

把各子目录中需要的 `.tex`、`.bib`、`.bst`、`.sty` 配齐后，可用本目录下的 `Makefile` / `switch.sh`（见下文）。

## 目录说明

| 子目录 | 用途 |
|--------|------|
| `English-bibtex/` | 英文文献示例（如 `test-arxiv.tex` 与相关 `.sty` / `.bst`） |
| `Chinese-bibtex/` | 中文文献示例（如 `Chinese-bibtex.tex`、`references.bib`、`gbt7714`） |
| `Chinese-biblatex/` | 中文 BibLaTeX 示例（`backend=bibtex`，用于测试中文编码兼容性） |
| `Metapost-mpostinl/` | MetaPost（`mpostinl`）示例；TeXbrain 中默认演示预生成 `.mps` 的 `\\includegraphics` 路径 |

> 说明：在部分 BusyTeX 运行环境中，`cleveref` 可能触发异常（例如 `Extra \endcsname`）。
> `Chinese-biblatex` 示例内置了条件降级：仅当检测到 `\BUSYTEX` 时，将 `\cref/\Cref` 回退到 `\autoref`，本地 TeX 保持原生 `cleveref`。

### BusyTeX 字体覆盖（SWUThesis 参考）

若模板中已定义 `\youyuan`，直接 `\newCJKfontfamily\youyuan` 可能报 *already defined*；某些环境里 `\renewCJKfontfamily` 也未必可用。更稳方案是先定义新的 CJK 字体族，再重定向模板命令。

将 `YouYuan.ttf` 放在主 `.tex` 同目录后，可在导言区使用：

```tex
\usepackage{xeCJK}
\IfFileExists{YouYuan.ttf}{
  \setCJKfamilyfont{yy}{YouYuan.ttf}
  \renewcommand{\youyuan}{\CJKfamily{yy}}
}{
  \typeout{[FONT] YouYuan.ttf not found, keep default \string\youyuan}
}
```

该写法不会改 `ctex` 主字体，只影响 `\youyuan` 的输出；需 `xelatex` 编译。若字体放在子目录，可写为 `\setCJKfamilyfont{yy}[Path=./fonts/,Extension=.ttf]{YouYuan}`。

## 切换与本地编译（可选）

### Makefile

```bash
make pdf MODE=english
make pdf MODE=chinese
make pdf MODE=chinese-biblatex
```

### 符号链接 `active`

```bash
chmod +x ./switch.sh
./switch.sh english   # active -> English-bibtex
./switch.sh chinese   # active -> Chinese-bibtex
./switch.sh chinese-biblatex   # active -> Chinese-biblatex
cd active && latexmk -pdf <主文件>.tex
```

`active` 已在仓库根目录 `.gitignore` 中忽略（若在主仓库根执行请注意路径）。

### 直接进入子目录

```bash
cd English-bibtex && latexmk -pdf test-arxiv.tex
cd Chinese-bibtex && latexmk -pdf Chinese-bibtex.tex
cd Chinese-biblatex && latexmk -pdf Chinese-biblatex.tex
```

## 依赖

本地编译需要 TeX Live（或 MacTeX）及 `latexmk`。浏览器内编译依赖 TeXbrain 的 BusyTeX 与静态 TeX 资源。
