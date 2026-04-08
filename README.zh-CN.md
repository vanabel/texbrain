<p align="right"><a href="README.md">English</a> · <strong>中文</strong></p>

<p align="center">
  <img src="static/texbrain-logo-readme.svg" alt="TeXbrain" width="88" />
</p>

<h1 align="center">TeXbrain</h1>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-5c6bc0?style=flat-square" alt="License" /></a>
  <a href="https://kit.svelte.dev/"><img src="https://img.shields.io/badge/SvelteKit-5-ff3e00?style=flat-square&logo=svelte&logoColor=white" alt="SvelteKit" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
</p>

<p align="center">
  <strong>纯浏览器 LaTeX → PDF。</strong><br />
  无需账号、无需安装、无后端——打开标签页即可写作。
</p>

<p align="center">
  <a href="https://tex.swimmingbrain.dev"><strong>立即使用 → tex.swimmingbrain.dev</strong></a>
</p>

---

### 项目由来

许多在线服务把本该免费的基础功能放在付费墙后；本地环境又在不同机器上难以一致。写论文时花在工具链上的时间往往多过写作本身。我想要的是：打开浏览器，写 LaTeX，得到 PDF。于是有了 TeXbrain。

---

## 目录

- [它能做什么](#它能做什么)
- [功能概览](#功能概览)
- [实现方式](#实现方式)
- [安全与隐私](#安全与隐私)
- [技术栈](#技术栈)
- [本地运行](#本地运行)
- [PM2 部署](#pm2-部署)
- [浏览器支持](#浏览器支持)
- [许可证](#许可证)

---

## 它能做什么

TeXbrain 是一套完整的编辑体验：你的 `.tex` 在**浏览器里**编译成 **PDF**，**没有**服务端替你处理源码——编辑器、编译器、Git 均在**客户端**运行。

打开文件夹、编辑、预览 PDF、提交并推送到 GitHub，**一个标签页**内完成。

---

## 功能概览

| | |
| --- | --- |
| **浏览器内编译** | 基于 WebAssembly 的 TeX。默认使用 [SwiftLaTeX](https://github.com/SwiftLaTeX/SwiftLaTeX) pdfTeX。若项目需要真正的 **BibTeX**（经典 `\bibliography` / `\bibliographystyle`，或 biblatex 且 `backend=bibtex`），可选用 [BusyTeX](https://github.com/TeXlyre/texlyre-busytex)（`texlyre-busytex`，PdfLaTeX + bibtex8）。首次 SwiftLaTeX 编译可能需约 1 分钟加载 TexLive 缓存，之后通常只需数秒。 |
| **PDF 预览** | [pdf.js](https://mozilla.github.io/pdf.js/)，多页、缩放、选中文本。 |
| **Git** | 克隆、分支、暂存、提交、推送、拉取、合并，基于 [isomorphic-git](https://isomorphic-git.org/)，无需命令行。 |
| **本地文件** | 在 Chromium 系浏览器中通过 [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) 直接读写磁盘上的项目目录。 |
| **多文件工程** | 文件树、标签页、拖拽；支持 `.tex`、`.bib`、`.sty`、`.cls` 等。 |
| **编辑器** | CodeMirror 6：高亮、70+ 命令补全、折叠、片段、主题。 |
| **命令面板与片段** | 命令面板；可搜索的数学环境 / 结构片段。 |
| **离线** | 页面加载后，编辑与编译可在无网络环境下进行。 |
| **模板** | 文章、学位论文、Beamer、报告、简历、信件、极简稿等。 |

---

## 实现方式

**编辑器。** [CodeMirror 6](https://codemirror.net/) + 自定义 LaTeX 语法（Lezer）、补全与主题；多标签与本地目录、内存中的 Git 工作区同步。

**编译器——两套后端，按项目自动选择：**

1. **[SwiftLaTeX](https://github.com/SwiftLaTeX/SwiftLaTeX)** pdfTeX（WASM）——默认路径。项目文件写入 MEMFS；首次编译从静态资源加载 TexLive 缓存；对部分不兼容内容做预处理。使用 biblatex + **Biber**（常见默认）时仍走此路径，并辅以文献方面的折中处理。

2. **[BusyTeX](https://github.com/TeXlyre/texlyre-busytex)**（[`texlyre-busytex`](https://www.npmjs.com/package/texlyre-busytex)）——在需要 BibTeX **且** 已存在 `static/busytex/` 资源时使用，执行 PdfLaTeX + bibtex8 流水线。npm 包仅包含 JS API；体积较大的 WASM 等资源需单独下载（与上游设计一致）。

**编译目标模式（顶部栏 `Compile`）。**

- `Active Tab`：优先编译当前激活的 `.tex` 标签；不可用时回退到入口文件。
- `Entry Point`：始终编译项目入口文件（`Entry: ...`）。
- 顶栏会显示 `Target: ...`，表示本次实际解析到的编译目标。

**Git。** [isomorphic-git](https://isomorphic-git.org/) + [LightningFS](https://github.com/isomorphic-git/lightning-fs) / IndexedDB；远程操作经 CORS 代理（浏览器无法直接使用 git 协议）。

**PDF。** [pdf.js](https://mozilla.github.io/pdf.js/)。

**文件系统。** Chromium 系使用 File System Access API；其他浏览器可使用 OPFS 等回退方案。

**前端框架。** [SvelteKit](https://kit.svelte.dev/) 静态适配器 + [Tailwind CSS 4](https://tailwindcss.com/)，可部署为纯静态站点（如 GitHub Pages），无服务端 API。

---

## 安全与隐私

除非**你主动**推送到远程，数据都在本机浏览器内处理。

- 无遥测、无统计、无跟踪  
- 无账号体系、无 Cookie  
- Git 凭据仅存于浏览器 `localStorage`，不经由我们控制的服务器  
- LaTeX 在 WASM 沙箱中运行，无本机 `pdflatex` 子进程  
- Git 为纯 JS 实现，无命令行注入面  
- 默认 git CORS 代理为 `cors.isomorphic-git.org`（可自行替换）  
- TeX/LaTeX 为自由软件；本仓库不随项目分发 TeX 源码  

---

## 技术栈

| 层次 | 技术 |
| --- | --- |
| 界面 | Svelte 5 + SvelteKit（静态） |
| 编辑器 | CodeMirror 6 + LaTeX 支持 |
| 编译 | SwiftLaTeX WASM；可选 BusyTeX 处理 BibTeX |
| Git | isomorphic-git + LightningFS |
| PDF | pdf.js |
| 样式 | Tailwind CSS 4 |
| 语言 | TypeScript |

---

## 本地运行

```bash
git clone https://github.com/swimmingbrain/texbrain.git
cd texbrain
pnpm install
pnpm dev
```

在 Chrome 或 Edge 中打开 **http://localhost:5173**。

### 可选：BusyTeX 资源（BibTeX）

`pnpm install` 只会安装 **npm 包**。**约 175 MB** 的 WASM / TeX Live 数据**不在** npm 包内，需从 [texlyre-busytex 的 GitHub Releases](https://github.com/TeXlyre/texlyre-busytex) 下载到 `static/busytex/`：

```bash
pnpm run download-busytex
```

若不执行此步，SwiftLaTeX 仍可编译；经典 BibTeX 引用解析则依赖上述资源。`static/busytex/` 默认已加入 `.gitignore` 以控制仓库体积；若线上站点也需要 BusyTeX，请在本地或 CI 中于构建前执行该命令。

## PM2 部署

使用 PM2 托管静态构建，并支持自动重启：

```bash
pnpm build
pnpm pm2:start
```

`serve` 已经在本仓库的 `devDependencies` 里了，所以部署到 NAS 时**不需要**再执行 `pnpm add -D serve ...`。先执行 `pnpm install` 即可。

默认端口是 `4173`（见 `ecosystem.config.cjs`）。按机器/用户自定义端口：

```bash
PORT=8080 pnpm pm2:restart
```

常用命令：

```bash
pnpm pm2:logs
pnpm pm2:stop
pnpm pm2:delete
```

开机自启：

```bash
pm2 save
pm2 startup
```

---

## 浏览器支持

完整「选择本地文件夹」能力依赖 **File System Access API**（Chrome、Edge、Arc、Brave、Opera 等）。Firefox、Safari 可使用编辑器与虚拟文件系统回退，但无法像 Chromium 那样直接读写自选文件夹。

---

## 许可证

[MIT](LICENSE)

作者：[Braian Plaku](https://swimmingbrain.dev)
