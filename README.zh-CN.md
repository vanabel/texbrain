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
  <a href="https://tex.vanabel.cn"><strong>立即使用 → tex.vanabel.cn</strong></a>
</p>

---

### 项目由来

许多在线服务把本该免费的基础功能放在付费墙后；本地环境又在不同机器上难以一致。写论文时花在工具链上的时间往往多过写作本身。我想要的是：打开浏览器，写 LaTeX，得到 PDF。于是有了 TeXbrain。

### 关于本分支

TeXbrain 应用由 [Braian Plaku](https://swimmingbrain.dev) 开创并推广。**本仓库** [`vanabel/texbrain`](https://github.com/vanabel/texbrain) 是在此基础上的**持续维护分支**。**本分支在线演示：** [tex.vanabel.cn](https://tex.vanabel.cn)。**上游公开演示：** [tex.swimmingbrain.dev](https://tex.swimmingbrain.dev)。**当前维护者：** [vanabel](https://github.com/vanabel)。

---

## 目录

- [项目由来](#项目由来)
- [关于本分支](#关于本分支)
- [它能做什么](#它能做什么)
- [功能概览](#功能概览)
- [编辑器侧栏](#编辑器侧栏文件--大纲--引用)
- [SyncTeX](#synctex编辑器--pdf)
- [双语 BibTeX 示例](#双语-bibtex-示例)
- [文档](#文档)
- [快速开始（本地）](#快速开始本地)
- [许可证](#许可证)

---

## 它能做什么

TeXbrain 在**浏览器里**把 `.tex` 编译成 **PDF**，编辑器、编译器、Git 均在**客户端**运行。打开文件夹、编辑、预览、提交并推送，**一个标签页**完成。

---

## 功能概览

| | |
| --- | --- |
| **浏览器内编译** | 默认 [SwiftLaTeX](https://github.com/SwiftLaTeX/SwiftLaTeX) pdfTeX；经典 BibTeX 可选用 [BusyTeX](https://github.com/TeXlyre/texlyre-busytex)。 |
| **PDF 预览** | 开发环境为 [pdf.js](https://mozilla.github.io/pdf.js/)；默认生产为内置 PDF。构建时 **`VITE_PDF_VIEWER=pdfjs`** 可启用 pdf.js 与预览栏 **SyncTeX**。详见 [常见问题 — SyncTeX](docs/zh-CN/faq.md#synctex编辑器--pdf)。 |
| **Git** | 克隆、分支、提交、推送等，基于 [isomorphic-git](https://isomorphic-git.org/)。 |
| **本地文件** | Chromium 系通过 [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) 读写磁盘目录。 |
| **多文件工程** | 文件树、标签页、拖拽；`.tex`、`.bib`、`.sty`、`.cls` 等。 |
| **侧栏** | **文件**、**大纲**（章节 + `\input` / `\include`）、**引用**（文献键 + 带编号公式）。**Ctrl+B** 切换侧栏。 |
| **编辑器** | CodeMirror 6；工程级 `\cite` / `\eqref` 补全。 |
| **命令面板与片段** | 命令面板；可搜索片段。 |
| **离线** | 加载后可离线编辑与编译。 |
| **模板** | 文章、论文、Beamer、报告、简历等。 |
| **SyncTeX** | 双击编辑器定位 PDF；pdf.js 预览上 Ctrl/⌘+单击回跳源码。见 [常见问题](docs/zh-CN/faq.md#synctex编辑器--pdf)。 |

---

## 编辑器侧栏（文件 / 大纲 / 引用）

左侧三个标签（**Ctrl+B**）：

| 标签 | 内容 |
| --- | --- |
| **文件** | 工程文件树。 |
| **大纲** | 当前 `.tex` 的 `\part` … `\subparagraph`，含 `\input` / `\include`。 |
| **引用** | `.bib` / `.bbl` 文献键；入口 `.tex` 链上的带编号公式（`.tex` 超过 120 个路径时不列公式）。 |

- **单击** → 跳转源码行。
- **Ctrl+单击** / **⌘+单击** → 插入 `\cite{键}` 或 `\eq{编号}`。

---

## SyncTeX（编辑器 ↔ PDF）

**双击**编辑器可滚动 PDF；在 **pdf.js** 预览上 **Ctrl / ⌘ + 单击** 打开对应 `.tex` 行。默认生产构建为内置 PDF，预览内 SyncTeX 需构建时设置 **`VITE_PDF_VIEWER=pdfjs`**。

完整说明与托管变量：**[常见问题 — SyncTeX](docs/zh-CN/faq.md#synctex编辑器--pdf)**。

---

## 双语 BibTeX 示例

示例目录：[`examples/bibtex-metapost-english-chinese/`](examples/bibtex-metapost-english-chinese/README.md)。网页中：欢迎页 → **Clone Repository** → 官方 BibTeX 中英示例。经典 BibTeX 需宿主含 BusyTeX（`pnpm run download-busytex`）。`cleveref`、`sortname` 等：**[常见问题 — BibTeX](docs/zh-CN/faq.md#bibtex-与参考文献)**。

---

## 文档

| 指南 | English | 中文 |
| --- | --- | --- |
| 索引 | [docs/README.md](docs/README.md) | [docs/README.zh-CN.md](docs/README.zh-CN.md) |
| 技术说明（架构、技术栈、隐私） | [docs/en/technical.md](docs/en/technical.md) | [docs/zh-CN/technical.md](docs/zh-CN/technical.md) |
| 部署（本地、Pages、PM2、NAS、CDN） | [docs/en/deployment.md](docs/en/deployment.md) | [docs/zh-CN/deployment.md](docs/zh-CN/deployment.md) |
| 常见问题（SyncTeX、BusyTeX、字体、排错） | [docs/en/faq.md](docs/en/faq.md) | [docs/zh-CN/faq.md](docs/zh-CN/faq.md) |
| 路线图 | [ROADMAP.md](ROADMAP.md) | [ROADMAP.zh-CN.md](ROADMAP.zh-CN.md) |

---

## 快速开始（本地）

```bash
git clone https://github.com/vanabel/texbrain.git
cd texbrain
pnpm install
pnpm exec svelte-kit sync
pnpm dev
```

在 Chrome 或 Edge 打开 **http://localhost:5173**。可选 BusyTeX：`pnpm run download-busytex`。部署到 GitHub Pages、PM2 或 NAS：**[部署指南](docs/zh-CN/deployment.md)**。

---

## 许可证

[MIT](LICENSE)

原项目作者：[Braian Plaku](https://swimmingbrain.dev)。本分支由 [vanabel](https://github.com/vanabel) 维护。
