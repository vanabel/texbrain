<p align="right"><a href="../README.zh-CN.md">文档索引</a> · <a href="../../README.zh-CN.md">主 README</a> · <a href="../en/technical.md">English</a></p>

# 技术说明

## 架构概览

TeXbrain 是**纯静态** [SvelteKit](https://kit.svelte.dev/) 应用：编辑器、编译器与 Git 客户端均在**浏览器内**运行，没有服务端处理你的 `.tex` 源码。

### 编辑器

[CodeMirror 6](https://codemirror.net/) + 自定义 LaTeX 语法（Lezer）、补全、主题与片段。多标签与本地目录（File System Access API）及内存中的 Git 工作区保持同步。

带标签页的**侧栏**会解析工程 `.tex` / `.bib`，用于：

- **大纲** — 章节树与 `\input` / `\include` 导航
- **引用** — 文献键与带编号公式
- 在 `\cite` / `\eqref` 等处的工程级补全

用户向说明见主 [README — 编辑器侧栏](../../README.zh-CN.md#编辑器侧栏文件--大纲--引用)。

### 编译器 — 两套后端（自动选择）

1. **[SwiftLaTeX](https://github.com/SwiftLaTeX/SwiftLaTeX)** pdfTeX（WASM）——**默认**。项目文件写入 MEMFS；首次编译从静态资源加载 TexLive 缓存；对部分不兼容内容做预处理。biblatex + **Biber**（常见默认）仍走此路径，并辅以文献方面的折中处理。

2. **[BusyTeX](https://github.com/TeXlyre/texlyre-busytex)**（[`texlyre-busytex`](https://www.npmjs.com/package/texlyre-busytex)）——在需要经典 **BibTeX** 且宿主存在 `static/busytex/` 时使用。XeLaTeX + bibtex8 流水线。npm 包仅含 JS API；大体积 WASM 需单独下载（见[部署指南](deployment.md#可选busytex-资源bibtex)）。

### 缓存与下载

| 路径 | TeXLive / 缓存 |
| --- | --- |
| SwiftLaTeX（`pdfLaTeX`） | IndexedDB 中的 TeXLive 缓存；首次可能较慢，后续明显加快 |
| BusyTeX（XeLaTeX / BibTeX） | **不**走 TeXbrain 的 TeXLive 预热 |
| 隐私 / 无痕模式 | 存储临时，大文件可能每次会话重新下载 |

### 编译目标（顶栏 **Compile**）

- **Active Tab** — 优先编译当前 `.tex` 标签，否则回退到入口文件。
- **Entry Point** — 始终编译入口文件（`Entry: …`）。
- **Target** — 显示上次实际编译的文件。

### CTAN 自动拉包（缺 `.sty` / `.cls`）

编译失败时，`compileLaTeX` 解析日志（`parse-missing-tex.ts`），必要时从 CTAN 拉取（`ctan-download.ts`：JSON、镜像 zip、`/install/…` TDS 包），以**文件名**并入编译根 map 后重编（默认开启，最多三轮）。浏览器优先请求主站同源路径 `/__texbrain_ctan_*`（`pnpm dev` 由 Vite 提供；NAS 需 Nginx，见[部署 — CTAN 同源代理](deployment.md#静态部署ctan-同源代理编译缺-sty--cls)）；**不会**经 Git 专用 CORS 代理。说明与排错见[常见问题 — CTAN 自动拉包](faq.md#ctan-自动拉包缺-sty--cls)。

### Git

[isomorphic-git](https://isomorphic-git.org/) + [LightningFS](https://github.com/isomorphic-git/lightning-fs) / IndexedDB；远程经 **CORS 代理**（浏览器无法直接使用 git 协议）。默认：`cors.isomorphic-git.org`（可在界面替换）。**CTAN 拉包**与 Git 代理分离，见上文 CTAN 小节。

打开本地目录**不会**导入磁盘 `.git`；师生以 GitHub 协作为主流程见 **[多人协作流程](collaboration-workflow.md)**。

### PDF 预览

开发与 `VITE_PDF_VIEWER=pdfjs` 构建时使用 [pdf.js](https://mozilla.github.io/pdf.js/)。**默认生产构建**为 `<iframe>` 内置 PDF。详见 [常见问题 — SyncTeX 与 PDF.js](faq.md#synctex编辑器--pdf)。

### 文件系统

- **Chromium 系：** [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) 直接读写自选文件夹。
- **其他浏览器：** OPFS / 虚拟 FS 回退（无原生文件夹选择器）。见 [常见问题 — 浏览器支持](faq.md#浏览器支持)。

### 前端框架

SvelteKit **静态适配器** + [Tailwind CSS 4](https://tailwindcss.com/)，可部署为 GitHub Pages、NAS + PM2 等纯静态站点，无 SSR API。

---

## 技术栈

| 层次 | 技术 |
| --- | --- |
| 界面 | Svelte 5 + SvelteKit（静态） |
| 编辑器 | CodeMirror 6 + LaTeX 支持 |
| 编译 | SwiftLaTeX WASM；可选 BusyTeX |
| Git | isomorphic-git + LightningFS |
| PDF | pdf.js（生产可选） |
| 样式 | Tailwind CSS 4 |
| 语言 | TypeScript |

---

## 安全与隐私

除非**你主动**推送到远程，数据均在浏览器内处理。

- 无遥测、无统计、无跟踪
- 无账号、无 Cookie
- Git 凭据仅存 `localStorage`，不经我们控制的服务器
- LaTeX 在 WASM 中运行，无本机 `pdflatex` 子进程
- Git 为纯 JS 实现，无命令行注入面
- 默认 CORS 代理 `cors.isomorphic-git.org`（可替换）
- TeX/LaTeX 为自由软件；本仓库不随项目分发 TeX 源码

---

## 相关文档

- [部署](deployment.md) — 本地开发、GitHub Pages、PM2、NAS、Cloudflare
- [常见问题](faq.md) — SyncTeX、CTAN 自动拉包、构建变量、BusyTeX 字体、排错
- [多人协作流程](collaboration-workflow.md) — GitHub 课程协作与 Collab 房间
- [主 README](../../README.zh-CN.md) — 功能概览与快速上手
