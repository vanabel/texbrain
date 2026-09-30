<p align="right"><a href="../README.zh-CN.md">文档索引</a> · <a href="../../README.zh-CN.md">主 README</a> · <a href="../en/faq.md">English</a></p>

# 常见问题

## 两套编译引擎：SwiftLaTeX / BusyTeX

TeXbrain 在浏览器里用 **两套 WASM 后端**，按工程与顶栏引擎**自动选择**，不是让用户在「两个重复编译器」里手工二选一。更细的实现说明见[技术说明 — 编译器](technical.md#编译器--两套后端互补自动选择)。

| 你想做的事 | 通常走哪条 |
| --- | --- |
| 普通 pdfLaTeX 文章、无经典 BibTeX | **SwiftLaTeX**（默认） |
| 顶栏选 **XeLaTeX**（中文 `ctex` / `fontspec`、ElegantBook 等） | **BusyTeX** |
| `\bibliography` / `\bibliographystyle`，或 biblatex 且非 Biber | **BusyTeX**（bibtex8） |
| biblatex + **`backend=biber`** | **SwiftLaTeX**（有折中；**不能**真跑 Biber） |

**如何确认当前路径：** 编译日志里会出现 BusyTeX 加载/步骤提示；按钮在预热 WASM 时显示「BusyTeX 加载中…」。SwiftLaTeX 路径会走 TeXLive 缓存预热说明。

**没有 BusyTeX 资源时：** 未执行 `pnpm run download-busytex`（或部署未带上 `static/busytex/`）时，SwiftLaTeX 仍可用；XeLaTeX / 经典 BibTeX 会失败或能力缺失。线上排查见下文 [GitHub Pages 与 BusyTeX](#github-pages-与-busytex)。

**是否该放弃其中一个？** 短期**不建议**。丢掉 BusyTeX ≈ 失去 Xe 与真正的 bibtex8；丢掉 SwiftLaTeX ≈ 默认永远下载大包、冷启动变慢。两边都无法替代本机完整 TeX 或服务端 latexmk/Tectonic。

---

## SyncTeX（编辑器 ↔ PDF）

编译器若返回 SyncTeX 数据，TeXbrain 在**当前会话内存**中解析使用（不额外写盘）。来源：**BusyTeX** 的 `result.synctex`（gzip），或 SwiftLaTeX 路径下 MEMFS 中的 `.synctex.gz`。

- **正向（源码 → PDF）：** 编译成功后预览尽量按 SyncTeX 滚动；**双击**编辑器可再次定位。
- **反向（PDF → 源码）：** 在 **pdf.js** 页面上 **Ctrl / ⌘ + 主键单击**。
- **线上 / NAS：** `VITE_PDF_VIEWER=pdfjs pnpm build` 后重新部署；GitHub Actions 可在仓库变量中设 **`VITE_PDF_VIEWER=pdfjs`**。
- **协作：** 仅收到远端 PDF 的参与者**没有** synctex 数据；精确跳转以**本机**含 synctex 的编译为准。

**为何默认生产环境没有 SyncTeX？** 默认生产构建使用浏览器**内置 PDF**（`<iframe>`），页面无法读取内部点击坐标或按 SyncTeX 框滚动。需要时在构建阶段加 **`VITE_PDF_VIEWER=pdfjs`**，与 `pnpm dev` 一致。

入口/目标旁的状态栏会在 SyncTeX 或**引用**侧栏相关时显示提示。编辑器内 **Ctrl/⌘+单击跟随** 与 SyncTeX 无关。

### PDF.js 生产预览

**`VITE_PDF_VIEWER=pdfjs`** 时，生产环境与开发一样用 pdf.js。CMap 与标准字体从 **jsDelivr** 加载（版本与 lockfile / worker 一致），可避免仅依赖 `/_app/immutable/assets/*.bcmap` 时的中文缺字、`translateFont` 报错（如 `Content-Type` 为空）。

- **自检：** `VITE_PDF_VIEWER=pdfjs pnpm build` 后 `pnpm preview`，能访问 **cdn.jsdelivr.net** 时应正常显示 CID 字体。
- **离线 / 内网：** 构建时 **`VITE_PDFJS_LOCAL_PDF_ASSETS=1`**（或 `true` / `yes`）。
- **可选：** **`VITE_PDFJS_CMAP_URL`**、**`VITE_PDFJS_STANDARD_FONT_URL`**、**`VITE_PDF_DISABLE_FONT_FACE=true`**。

---

## GitHub Pages 与 BusyTeX

**现象：** 请求 `…/texbrain/busytex/busytex.js` 返回 **404**。

**原因：** 构建时 **`static/busytex/` 不在磁盘上**。

**处理：** 查看 Actions 中 BusyTeX 下载步骤；确认 **`BASE_PATH`** 与项目站子路径一致（如 `/texbrain`）。

**Manifest 图标路径错误：** 项目站若去拉 `https://<用户>.github.io/favicon.svg`，请将 `static/manifest.json` 中 `icons` / `start_url` 改为**相对路径**（不要以 `/` 开头）。

---

## BibTeX 与参考文献

引擎如何分流见上文 [两套编译引擎](#两套编译引擎-swiftlatex--busytex)。浏览器内**经典 BibTeX** 需要部署端含 BusyTeX（`pnpm run download-busytex`）；仅 SwiftLaTeX 无法跑 bibtex8。

**`cleveref`** 在部分 BusyTeX 运行中可能报 `Extra \endcsname` 等；本仓库 `Chinese-biblatex` 示例在 `\BUSYTEX` 时将 `\cref/\Cref` 回退为 `\autoref`。

**biblatex + `backend=bibtex`：** 非拉丁作者请写 **`sortname`**，例如 `author = {{周志华}}, sortname = {Zhou, Zhihua}`。

**双语示例：** [`examples/bibtex-metapost-english-chinese/`](../../examples/bibtex-metapost-english-chinese/README.md)。

---

## CTAN 自动拉包（缺 .sty / .cls）

编译日志出现 `File 'foo.sty' not found`（或 `.cls`、`.clo` 等）时，TeXbrain 会**自动**在 [CTAN](https://ctan.org/) 解析包名、从镜像下载压缩包，将所需文件以**文件名**并入**编译根目录**（与 `sliceProjectToCompileRoot` 规则一致），并**重试编译**（最多三轮）。编译日志中可见 `[CTAN]`、`[TeXbrain] CTAN auto-fetch:` 等行。

**不会触发的情况：** 日志里没有缺包错误时，说明依赖已由引擎自带树满足（BusyTeX 内置 TeX Live 或 SwiftLaTeX 缓存）。编译成功时也可能提示「已跳过 CTAN」。

**网络与代理**

| 环境 | CTAN 访问方式 |
| --- | --- |
| **本机 `pnpm dev` / `pnpm preview`** | Vite 同源路径 `/__texbrain_ctan_json`、`/__texbrain_ctan_ustc` 等，一般无需额外配置。 |
| **NAS / 自托管静态站** | 在 **TeXbrain 主站同一域名** 配置反向代理（`/__texbrain_ctan_json/` 等），见[部署 — CTAN 同源代理](deployment.md#静态部署ctan-同源代理编译缺-sty--cls)。**不要**用 Git CORS 代理（`git-cors.*`、`cors.isomorphic-git.org`）拉 CTAN，会 403。 |
| **GitHub Pages 等纯静态** | 无法配同源 CTAN 代理时，将常用 `.sty` 提交进仓库，或在本机 `pnpm dev` 编译。 |

**包结构说明**

- 部分 CTAN **源码** zip（如 `amsrefs.zip`）只有 `.dtx` / `.ins`，没有现成的 `.sty`；此时会再试 **`/install/…` 下的 TDS 安装包**（如 `install/macros/latex/contrib/amsrefs.tds.zip`）。
- 工程若已自带 `foo.sty`（与主 `.tex` 同目录或祖先目录），会优先并入编译根，通常不必走 CTAN。

**命令行冒烟测试（Node）：** `node scripts/test-ctan-fetch.mjs`（USTC + `physics.sty`）。

---

## BusyTeX：`ctex` 与 Adobe OTF 字体

在 **BusyTeX（XeLaTeX）** 下可用 `fontset=none` 并指定本地 OTF，例如：

```tex
\documentclass[11pt,a4paper,fontset=none]{ctexart}

\setCJKmainfont[
  BoldFont       = AdobeHeitiStd-Regular.otf,
  ItalicFont     = AdobeKaitiStd-Regular.otf,
  BoldItalicFont = AdobeHeitiStd-Regular.otf
]{AdobeSongStd-Light.otf}

\setCJKsansfont{AdobeHeitiStd-Regular.otf}
\setCJKmonofont{AdobeFangsongStd-Regular.otf}
```

- **`fontset=none`** 避免与自定义字体冲突。
- 文件名需与磁盘一致；可用 `Path` 指向字体目录（末尾建议 `/`）。
- 仅 **BusyTeX / XeLaTeX**；SwiftLaTeX（pdfTeX）不适用。
- 将 `.otf` 放入工程目录即可，无需服务器装字体。

**ElegantBook 示例：** [`Elegantbook-cn/`](../../examples/bibtex-metapost-english-chinese/Elegantbook-cn/) — 使用 `\documentclass[...,cn,nofont,bibtex]{elegantbook}`（勿在类选项里写 `fontset=none`），并 `\input{elegantbook-cn-adobe-fonts.tex}`，编译器选 **XeLaTeX**。BusyTeX 的 WASM TeX Live **常不含** `newtx` 的 **TeXGyreTermesX**，需在工程 `fonts/` 放入西文 OTF：在 `Elegantbook-cn/` 运行 `./setup-fonts.sh --latin`（从系统 TeX Live 的 `newtx/` 与 `tex-gyre/` 复制，例如 NAS 上 `NEWTX_SRC=/usr/share/texmf/fonts/opentype/public/newtx`、`TEXGYRE_SRC=.../tex-gyre`）。中文 Adobe 字体另用 `./setup-fonts.sh --adobe`。勿使用 `newtx` 数学选项。本地测试：`pnpm run test:elegantbook-cn`。

---

## BusyTeX 字体覆盖（SWUThesis 示例）

模板已定义 `\youyuan` 时，可用新字体族并重定向：

```tex
\usepackage{xeCJK}
\IfFileExists{YouYuan.ttf}{
  \setCJKfamilyfont{yy}{YouYuan.ttf}
  \renewcommand{\youyuan}{\CJKfamily{yy}}
}{
  \typeout{[FONT] YouYuan.ttf not found, keep default \string\youyuan}
}
```

TeXbrain 克隆请用 **SWUThesis** 预设或分支 **`online-texbrain`**（见下文）。

---

## 浏览器支持

完整本地文件夹读写依赖 **File System Access API**（Chrome、Edge、Arc、Brave、Opera 等）。Firefox、Safari 可用编辑器与虚拟 FS，但无法像 Chromium 那样直接读写自选文件夹。

---

## 模板仓库与 Git

**多人协作（GitHub + 课堂 Collab）分步说明：** [多人协作流程](collaboration-workflow.md)。

TeXbrain **不会**自动把编辑同步到 GitHub 模板仓库；默认只写本机所选目录，需自行配置凭据并 **push** 才会影响远端。

请 **Fork** 模板到自己的账号再改；上游保持只读并适时拉取更新。

浏览器连 GitHub 时建议 **只读** 或 **最小权限** token，勿给共享模板仓库写权限。

论文类模板建议使用维护者的 **`online-texbrain`** 分支；克隆时选 **SWUThesis** 预设或填写分支 `online-texbrain`。

---

## 侧栏「引用」页

- **单击** 文献键、`\label` 或公式编号 → 跳转源码行。
- 在 **引用** 侧栏 **Ctrl+单击** / **⌘+单击** → 插入 `\cite{键}`、`\ref{label}` 或 `\eq{编号}`。
- 在 **编辑器** 内按住 **Ctrl/⌘** 并单击 `\cite` / `\ref` / `\input` / `\include` / `\includegraphics` / `\url` 的参数可跟随跳转（按住修饰键时高亮）。
- `.tex` 路径超过 **120** 个时不列出公式（性能保护）。

---

## 诊断、日志与工程搜索

### 结构化日志与错误

编译后 **错误** / **警告** 标签列出解析后的编译器消息。**日志** 标签包含：

1. **诊断** — 同样的结构化条目（首个致命错误置顶），含 **静态** 检查；有位置信息时可单击跳到文件与行。
2. **原始日志** — 清洗后的编译器全文。

无需编译即可运行的静态诊断包括：

- 重复的 `\label{…}`
- `\ref` / `\autoref` / `\cref` / `\eqref` 指向未知 label
- `\cite` / `\citep` / `\citet`（及常见变体）指向未知文献键（在已有 `.bib` / `.bbl` 键时）

当前打开文件中的对应问题还会以 CodeMirror **lint** 下划线 / gutter 显示。

### 过期 PDF

编译失败或继续编辑时，仍保留上次 **成功** 的 PDF。预览标签显示 **过期** 标记，直到下次成功编译。失败编译不会悄悄用「空预览」覆盖好的 PDF。

### 工程搜索 / 替换

- 快捷键：**Ctrl+Shift+F**（Windows/Linux）或 **⌘+Shift+F**（macOS）；也可在命令面板中打开。
- 在 `.tex` / `.bib` 等相关文本中搜索（已打开标签 + 已打开文件夹时的磁盘文件）。
- 可选 **替换**，带逐条预览与勾选。
- **应用所选**：更新已打开标签；若已 **打开文件夹**，同时写回磁盘并刷新文件树。无文件夹句柄时变更仅留在内存，需自行保存 / 下载。

---

## 相关文档

- [技术说明 — 两套编译后端](technical.md#编译器--两套后端互补自动选择)
- [多人协作流程](collaboration-workflow.md)
- [部署](deployment.md)
- [主 README](../../README.zh-CN.md)
