<p align="right"><a href="../README.zh-CN.md">文档索引</a> · <a href="../../README.zh-CN.md">主 README</a> · <a href="../en/faq.md">English</a></p>

# 常见问题

## SyncTeX（编辑器 ↔ PDF）

编译器若返回 SyncTeX 数据，TeXbrain 在**当前会话内存**中解析使用（不额外写盘）。来源：**BusyTeX** 的 `result.synctex`（gzip），或 SwiftLaTeX 路径下 MEMFS 中的 `.synctex.gz`。

- **正向（源码 → PDF）：** 编译成功后预览尽量按 SyncTeX 滚动；**双击**编辑器可再次定位。
- **反向（PDF → 源码）：** 在 **pdf.js** 页面上 **Ctrl / ⌘ + 主键单击**。
- **线上 / NAS：** `VITE_PDF_VIEWER=pdfjs pnpm build` 后重新部署；GitHub Actions 可在仓库变量中设 **`VITE_PDF_VIEWER=pdfjs`**。
- **协作：** 仅收到远端 PDF 的参与者**没有** synctex 数据；精确跳转以**本机**含 synctex 的编译为准。

**为何默认生产环境没有 SyncTeX？** 默认生产构建使用浏览器**内置 PDF**（`<iframe>`），页面无法读取内部点击坐标或按 SyncTeX 框滚动。需要时在构建阶段加 **`VITE_PDF_VIEWER=pdfjs`**，与 `pnpm dev` 一致。

入口/目标旁的状态栏会在 SyncTeX 或**引用**侧栏相关时显示提示。

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

浏览器内**经典 BibTeX** 需要部署端含 BusyTeX（`pnpm run download-busytex`）；仅 SwiftLaTeX 无法跑 bibtex8。

**`cleveref`** 在部分 BusyTeX 运行中可能报 `Extra \endcsname` 等；本仓库 `Chinese-biblatex` 示例在 `\BUSYTEX` 时将 `\cref/\Cref` 回退为 `\autoref`。

**biblatex + `backend=bibtex`：** 非拉丁作者请写 **`sortname`**，例如 `author = {{周志华}}, sortname = {Zhou, Zhihua}`。

**双语示例：** [`examples/bibtex-metapost-english-chinese/`](../../examples/bibtex-metapost-english-chinese/README.md)。

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

- **单击** 文献键或公式编号 → 跳转源码行。
- **Ctrl+单击** / **⌘+单击** → 插入 `\cite{键}` 或 `\eq{编号}`。
- `.tex` 路径超过 **120** 个时不列出公式（性能保护）。

---

## 相关文档

- [多人协作流程](collaboration-workflow.md)
- [技术说明](technical.md)
- [部署](deployment.md)
- [主 README](../../README.zh-CN.md)
