<p align="right"><a href="../README.zh-CN.md">文档索引</a> · <a href="../../README.zh-CN.md">主 README</a> · <a href="../en/technical.md">English</a></p>

# 技术说明

## 架构概览

TeXbrain 是**纯静态** [SvelteKit](https://kit.svelte.dev/) 应用：编辑器、编译器与 Git 客户端均在**浏览器内**运行，没有服务端处理你的 `.tex` 源码。

### 编辑器

[CodeMirror 6](https://codemirror.net/) + 自定义 LaTeX 语法（Lezer）、补全、主题与片段。多标签与本地目录（File System Access API）及内存中的 Git 工作区保持同步。

带标签页的**侧栏**会解析工程 `.tex` / `.bib`，用于：

- **大纲** — 章节树与 `\input` / `\include` 导航
- **引用** — 文献键、`\label` 目标与带编号公式
- 在 `\cite` / `\ref` / `\eqref` 等处的工程级补全（文献详情来自 `.bib` 作者/标题）

**导航与诊断（纯客户端）：**

- 编辑器内 **Cmd/Ctrl+单击** 跟随 `\cite` / `\ref` / `\input` / `\include` / `\includegraphics` / `\url`（`reference-links.ts` + `reference-follow.ts`）
- **静态诊断**（`latex-diagnostics.ts`）检测重复 `\label`、未定义 cite/ref；进入警告/日志面板，并以 CodeMirror lint（`latex-lint.ts`）标在当前文件
- **编译日志解析**（`parse-log.ts`）结构化 Errors/Warnings 并置顶首个致命错误；Log 标签为「诊断」+ 原始输出
- **过期 PDF**：编译失败或继续编辑时保留上次成功预览，直到下次成功编译
- **工程搜索/替换**（`search-replace.ts`，**Ctrl/⌘+Shift+F**）在内存中运行；打开文件夹时经 `writeTextAtProjectPath` 写回磁盘

用户向说明见主 [README — 编辑器侧栏](../../README.zh-CN.md#编辑器侧栏文件--大纲--引用) 与 [常见问题 — 诊断与搜索](faq.md#诊断日志与工程搜索)。

### 编译器 — 两套后端（互补，自动选择）

TeXbrain **同时保留** [SwiftLaTeX](https://github.com/SwiftLaTeX/SwiftLaTeX) 与 [BusyTeX](https://github.com/TeXlyre/texlyre-busytex)（[`texlyre-busytex`](https://www.npmjs.com/package/texlyre-busytex)）。二者不是重复实现，而是覆盖不同能力：前者作默认轻量 pdfTeX；后者提供 XeLaTeX、经典 BibTeX（bibtex8）与中文 fontspec 路径。用户向对照见 [常见问题 — 两套编译引擎](faq.md#两套编译引擎-swiftlatex--busytex)。

| | **SwiftLaTeX** | **BusyTeX** |
| --- | --- | --- |
| 角色 | **默认**引擎 | 按需启用的「重引擎」 |
| 引擎形态 | pdfTeX（WASM） | XeLaTeX + bibtex8 流水线（WASM） |
| 适合 | 普通英文稿、简单 pdfLaTeX、首次之后靠缓存加速 | 经典 `\bibliography`、biblatex+bibtex8、中文 Xe / `fontspec`、ElegantBook 等 |
| 资源 | 随构建的 TeXLive 缓存；写入 IndexedDB 预热 | 约 **175 MB**，需 `pnpm run download-busytex` 落到 `static/busytex/`（见[部署](deployment.md#可选busytex-资源bibtex)） |
| 未部署 BusyTeX 时 | 仍可编译 | 相关工程会回退或缺少 BibTeX / Xe 能力 |
| SyncTeX | 若 MEMFS 中有 `.synctex.gz` 则可用 | 通常由 `result.synctex` 提供（gzip） |

**自动选择（实现：`busytex-bibtex.ts` → `needsBusyTexForProject`）：**

1. 顶栏引擎为 **XeLaTeX** → 一律走 BusyTeX（需已部署 BusyTeX 资源）。
2. 顶栏为 **pdfLaTeX**，且工程需要真正的 BibTeX 流水线 → BusyTeX；否则 → SwiftLaTeX。
3. 「需要 BibTeX」包括：源码中有 `\bibliography` / `\bibliographystyle`；或识别到 biblatex（且**未**显式 `backend=biber`）。类文件里用宏展开 `backend=…` 的模板也会按窄源码启发触发 bibtex8。
4. 显式 **biblatex + Biber**（`backend=biber`）→ **仍走 SwiftLaTeX**，并做文献方面的折中（浏览器 WASM **不能跑 biber**）。

**两边都做不到：** 浏览器内 **Biber**；完整本机 TeX Live 的包集合（缺包时依赖 [CTAN 自动拉包](faq.md#ctan-自动拉包缺-sty--cls)）。

**为何不合并成单一引擎：** 只留 SwiftLaTeX 会失去 Xe / 经典 BibTeX；只留 BusyTeX 则默认路径永远背大包、冷启动变慢。路线图中的服务端 Tectonic 是另一条统一方向，与「两个 WASM 二选一」不同。

### 缓存与下载

| 路径 | TeXLive / 缓存 |
| --- | --- |
| SwiftLaTeX（`pdfLaTeX`） | IndexedDB 中的 TeXLive 缓存；首次可能较慢，后续明显加快 |
| BusyTeX（XeLaTeX / BibTeX） | **不**走 TeXbrain 的 TeXLive 预热；自带 TeX Live 数据包 |
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
| 编译 | SwiftLaTeX（默认 pdfTeX）+ BusyTeX（Xe / BibTeX），自动选择 |
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
- [常见问题](faq.md) — 双引擎对照、SyncTeX、诊断/搜索、CTAN 自动拉包、构建变量、BusyTeX 字体、排错
- [多人协作流程](collaboration-workflow.md) — GitHub 课程协作与 Collab 房间
- [主 README](../../README.zh-CN.md) — 功能概览与快速上手
