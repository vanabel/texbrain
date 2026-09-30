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
- [诊断、日志与搜索](#诊断日志与搜索)
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
| **浏览器内编译** | 默认 [SwiftLaTeX](https://github.com/SwiftLaTeX/SwiftLaTeX) pdfTeX；经典 BibTeX 可选用 [BusyTeX](https://github.com/TeXlyre/texlyre-busytex)。缺 `.sty` / `.cls` 时可 **[CTAN 自动拉包](docs/zh-CN/faq.md#ctan-自动拉包缺-sty--cls)** 并重试编译。 |
| **PDF 预览** | 开发环境为 [pdf.js](https://mozilla.github.io/pdf.js/)；默认生产为内置 PDF。构建时 **`VITE_PDF_VIEWER=pdfjs`** 可启用 pdf.js 与预览栏 **SyncTeX**。详见 [常见问题 — SyncTeX](docs/zh-CN/faq.md#synctex编辑器--pdf)。 |
| **Git** | 克隆、分支、提交、推送等，基于 [isomorphic-git](https://isomorphic-git.org/)。 |
| **本地文件** | Chromium 系通过 [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) 读写磁盘目录。 |
| **多文件工程** | 文件树、标签页、拖拽；`.tex`、`.bib`、`.sty`、`.cls` 等。 |
| **侧栏** | **文件**、**大纲**（章节 + `\input` / `\include`）、**引用**（文献键、`\label`、带编号公式）。**Ctrl+B** 切换侧栏。 |
| **编辑器** | CodeMirror 6；补全、片段、lint 标记；工程级 `\cite` / `\ref` / `\eqref` 补全（文献含标题/作者）。编辑器内 **Ctrl/⌘+单击** 可跟随 cite/ref/input/include/includegraphics/url。 |
| **诊断与日志** | 结构化 Errors/Warnings/Log（置顶首致命错误，单击跳源）。静态检查重复 `\label`、未定义 cite/ref。PDF 可能过期时显示 **过期** 标记。 |
| **工程搜索** | **Ctrl/⌘+Shift+F** — 多文件搜索与替换预览；打开文件夹工程时应用后写回磁盘。 |
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
| **引用** | `.bib` / `.bbl` 文献键、`\label{…}`，以及入口 `.tex` 链上的带编号公式（`.tex` 超过 120 个路径时不列公式）。 |

- **单击** 键 / label / 公式编号 → 跳转源码行。
- 在 **引用** 侧栏 **Ctrl+单击** / **⌘+单击** → 插入 `\cite{键}`、`\ref{label}` 或 `\eq{编号}`。
- 在 **编辑器** 内按住 **Ctrl/⌘** 并单击 `\cite` / `\ref` / `\input` / `\include` / `\includegraphics` / `\url` 的参数可跟随跳转。

---

## 诊断、日志与搜索

| 区域 | 行为 |
| --- | --- |
| **错误 / 警告** | 编译诊断 + 静态检查（重复 label、未定义 cite/ref）。单击跳到文件与行；首个致命错误置顶。 |
| **日志** | 上方为可点击的 **诊断** 列表，下方为原始编译输出。 |
| **编辑器 lint** | 当前文件内下划线 / gutter 标记。 |
| **过期 PDF** | 编译失败或继续编辑后仍保留上次成功 PDF；预览标签显示 **过期**，直到下次成功编译。 |
| **搜索** | 命令面板「在工程中搜索…」，或 **Ctrl/⌘+Shift+F**。可预览替换；打开文件夹时应用会写回磁盘。 |

详见：[常见问题 — 诊断与搜索](docs/zh-CN/faq.md#诊断日志与工程搜索)。

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
| 常见问题（SyncTeX、诊断、搜索、CTAN、BusyTeX、字体） | [docs/en/faq.md](docs/en/faq.md) | [docs/zh-CN/faq.md](docs/zh-CN/faq.md) |
| 多人协作流程（GitHub、Collab） | [docs/en/collaboration-workflow.md](docs/en/collaboration-workflow.md) | [docs/zh-CN/collaboration-workflow.md](docs/zh-CN/collaboration-workflow.md) |
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
