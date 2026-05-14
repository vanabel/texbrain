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

TeXbrain 应用由 [Braian Plaku](https://swimmingbrain.dev) 开创并推广。**本仓库** [`vanabel/texbrain`](https://github.com/vanabel/texbrain) 是在此基础上的**持续维护分支**，包含大量功能与文档上的改进。**本分支在线演示：** [tex.vanabel.cn](https://tex.vanabel.cn)。**上游公开演示：** [tex.swimmingbrain.dev](https://tex.swimmingbrain.dev)（另一套代码与部署）。**当前维护者 / 贡献者：** [vanabel](https://github.com/vanabel)。

---

## 目录

- [项目由来](#项目由来)
- [关于本分支](#关于本分支)
- [它能做什么](#它能做什么)
- [功能概览](#功能概览)
- [SyncTeX（编辑器 ↔ PDF）](#synctex编辑器--pdf)
- [实现方式](#实现方式)
- [安全与隐私](#安全与隐私)
- [模板仓库与 Git（给用户的说明）](#模板仓库与-git给用户的说明)
- [技术栈](#技术栈)
- [双语 BibTeX 示例](#双语-bibtex-示例)
- [部署到 GitHub Pages](#部署到-github-pages)
- [本地运行](#本地运行)
- [Cloudflare 缓存清理（BusyTeX）](#cloudflare-缓存清理busytex)
- [BusyTeX 字体覆盖（以 SWUThesis 为例）](#busytex-字体覆盖以-swuthesis-为例)
- [PM2 部署](#pm2-部署)
- [在 NAS 上更新部署](#在-nas-上更新部署)
- [未来路线图（草案）](ROADMAP.zh-CN.md)
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
| **浏览器内编译** | 基于 WebAssembly 的 TeX。默认使用 [SwiftLaTeX](https://github.com/SwiftLaTeX/SwiftLaTeX) pdfTeX。若项目需要真正的 **BibTeX**（经典 `\bibliography` / `\bibliographystyle`，或 biblatex 且 `backend=bibtex`），可选用 [BusyTeX](https://github.com/TeXlyre/texlyre-busytex)（`texlyre-busytex`，PdfLaTeX + bibtex8）。**注意：TeXLive 缓存预热是 SwiftLaTeX（pdfTeX）路径的行为，不是 BusyTeX XeLaTeX 路径。** |
| **PDF 预览** | **开发：** [pdf.js](https://mozilla.github.io/pdf.js/)，多页、缩放、选中文本。**默认生产构建：** 浏览器原生 PDF（`<iframe>`），在部分静态托管上更稳。**可选：** 构建时设置 **`VITE_PDF_VIEWER=pdfjs`**，使生产环境也走 pdf.js（**预览栏内 SyncTeX** 依赖此模式）。启用后，**生产环境**会从 **[jsDelivr](https://www.jsdelivr.com/)** 按与当前 **`pdfjs-dist` / worker** 一致的版本加载 **CMap** 与 **标准 14 字体**，使中文等 CID 字体与 **`pnpm preview`** 的表现与 **`pnpm dev`** 一致，而不依赖 `/_app/immutable/` 下 `.bcmap` 的 MIME。**完全离线 / 内网：** 构建时加 **`VITE_PDFJS_LOCAL_PDF_ASSETS=1`** 改为使用打包进站点的资源。详见下文 [PDF.js production preview](#pdfjs-production-preview)。 |
| **Git** | 克隆、分支、暂存、提交、推送、拉取、合并，基于 [isomorphic-git](https://isomorphic-git.org/)，无需命令行。 |
| **本地文件** | 在 Chromium 系浏览器中通过 [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) 直接读写磁盘上的项目目录。 |
| **多文件工程** | 文件树、标签页、拖拽；支持 `.tex`、`.bib`、`.sty`、`.cls` 等。 |
| **编辑器** | CodeMirror 6：高亮、70+ 命令补全、折叠、片段、主题。 |
| **命令面板与片段** | 命令面板；可搜索的数学环境 / 结构片段。 |
| **离线** | 页面加载后，编辑与编译可在无网络环境下进行。 |
| **模板** | 文章、学位论文、Beamer、报告、简历、信件、极简稿等。 |
| **SyncTeX** | 当编译产出 `.synctex.gz`（例如 **BusyTeX XeLaTeX**，或已启用 SyncTeX 的 SwiftLaTeX pdfTeX）时：**双击编辑器区域**可将 PDF 预览定位到光标附近；在 **pdf.js** 预览页上 **Ctrl+单击**（Mac 为 **⌘+单击**）可反向跳转到对应 `.tex` 行；底部**状态栏**在入口/目标旁有简短提示。**为何内置 PDF 没有 SyncTeX：** 内嵌查看器在插件/黑盒里渲染，页面拿不到内部点击坐标，也无法按 SyncTeX 框滚动。**默认生产构建**使用内置查看器，故预览内 SyncTeX 不生效；需要时在构建阶段加上 **`VITE_PDF_VIEWER=pdfjs`**（与本地 `pnpm dev` 的预览行为一致）。 |

---

## SyncTeX（编辑器 ↔ PDF）

编译器若返回 SyncTeX 数据，TeXbrain 会在**当前浏览器会话内存**中解析使用（不会单独再写一份到磁盘）。数据来源：**BusyTeX** 的 `result.synctex`（gzip），或 SwiftLaTeX 路径下从引擎 MEMFS 读取的 `.synctex.gz`（若存在）。

- **正向（源码 → PDF）：** 编译成功后预览会尽量按 SyncTeX 滚动；**双击**编辑器可再次定位（无需立刻重编）。
- **反向（PDF → 源码）：** 在 **pdf.js** 渲染的页面上 **Ctrl / ⌘ + 主键单击**。
- **线上 / NAS：** 使用 **`VITE_PDF_VIEWER=pdfjs pnpm build`** 后重新部署。若用 GitHub Actions，在仓库变量里设置 **`VITE_PDF_VIEWER`** 为 `pdfjs`（见 `.github/workflows/deploy.yml`）。
- **协作：** 仅收到远端 PDF 的参与者**不会**收到 synctex 二进制；正反向精确跳转以**本机**成功编译且含 synctex 为准。

### PDF.js production preview

使用 **`VITE_PDF_VIEWER=pdfjs`** 构建时，生产环境与开发环境一样在侧栏使用 pdf.js。CMap 与标准字体会从 **jsDelivr** 加载（`pdfjs-dist` 版本与 lockfile / 打包的 worker 一致），可避免在 **`pnpm preview`** 或部分静态站仅依赖 `/_app/immutable/assets/*.bcmap` 时出现的 **中文缺字、`translateFont` 报错**（例如 `Content-Type` 为空）。

- **自检：** 执行 **`VITE_PDF_VIEWER=pdfjs pnpm build`** 后 **`pnpm preview`**，在能访问 **cdn.jsdelivr.net** 时应能正常显示中文等 CID 字体。
- **离线 / 无外网：** 构建时设置 **`VITE_PDFJS_LOCAL_PDF_ASSETS=1`**（或 `true` / `yes`），改为从本站加载打包的 cmap / pfb。
- **可选覆盖：** **`VITE_PDFJS_CMAP_URL`**、**`VITE_PDFJS_STANDARD_FONT_URL`**（目录基址，相对路径会按当前页 URL 解析；末尾 `/` 可选）。
- **可选：** **`VITE_PDF_DISABLE_FONT_FACE=true`**，强制走非 `FontFace` 的 canvas 路径（仅当个别浏览器/宿主仍有问题时使用）。

---

## 双语 BibTeX 示例

本仓库在 [`examples/bibtex-metapost-english-chinese/`](examples/bibtex-metapost-english-chinese/README.md) 提供英文 / 中文 BibTeX + MetaPost 工程示例（如 `gbt7714` 与 `amsrefs`，并包含 MetaPost 示例）。**在网页版 TeXbrain 中：** 欢迎页 → **Clone Repository** → **Use official TeXbrain repo (BibTeX EN/ZH example)**，或填写 `https://github.com/vanabel/texbrain.git`。克隆后在侧栏打开 `examples/bibtex-metapost-english-chinese/English-bibtex/` 或 `Chinese-bibtex/` 下的主 `.tex`，用 **Active Tab** 或 **Entry** 指向该文件后编译。经典 BibTeX 需部署端已包含 **BusyTeX**（`pnpm run download-busytex`）。说明见 [examples/bibtex-metapost-english-chinese/README.md](examples/bibtex-metapost-english-chinese/README.md)。

> 已知问题：在部分 BusyTeX 运行环境中，`cleveref`（`\cref` / `\Cref`）可能触发 `Extra \endcsname` 等错误。
> `Chinese-biblatex` 示例已内置 BusyTeX 条件降级：检测到 `\BUSYTEX` 时将 `\cref/\Cref` 回退到 `\autoref`；本地 TeX 仍保留原生 `cleveref`。
> 若使用 `biblatex` 且 `backend=bibtex`（BusyTeX 的 bibtex8 路径），请为非拉丁作者名显式提供 `sortname`，以避免姓名哈希/首字母生成不稳定。示例：`author = {{周志华}}, sortname = {Zhou, Zhihua}`。

---

## 部署到 GitHub Pages

仓库自带工作流 `.github/workflows/deploy.yml`。**请先做第 1 步**：在仓库里启用 Pages，并把部署来源设为 **GitHub Actions**；否则 deploy 步骤会向 Pages API 创建部署时返回 **404 / Not Found**。

1. **Pages（必做）：** 仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions** 并保存。若此前使用 **Deploy from a branch**，请改为 **GitHub Actions**（同一时间只能有一种来源）。保存后在 **Actions** 里对失败的工作流 **Re-run all jobs**，或使用 **workflow_dispatch** 手动再跑一次。

2. **Settings → Secrets and variables → Actions → Variables**（可选但建议配置，以便 canonical URL 与站点一致）：
   - **`PUBLIC_SITE_ORIGIN`**：公网 **origin**（仅协议 + 主机，**不要**末尾斜杠），例如 `https://你的用户名.github.io`，或自定义域名 `https://tex.example.com`。
   - **`BASE_PATH`**：若站点挂在子路径（常见于 **project** Pages：`https://用户名.github.io/仓库名/`），填 `/仓库名`（以 `/` 开头）。根路径或自定义域根站点则**留空**。
   - **`VITE_PDF_VIEWER`**（可选）：填 **`pdfjs`** 时生产构建也使用 pdf.js 预览（预览栏内可配合 SyncTeX）；不填则保持默认的内置 PDF 查看器。
   - **`VITE_PDFJS_LOCAL_PDF_ASSETS`**（可选）：设为 **`1` / `true` / `yes`** 时，构建产物**不**从 jsDelivr 拉 cmap / 标准字体（离线或严格 CSP）。未设置且已启用 `VITE_PDF_VIEWER=pdfjs` 时，生产环境默认走 jsDelivr。
   - **`VITE_PDFJS_CMAP_URL`** / **`VITE_PDFJS_STANDARD_FONT_URL`**（可选）：自定义 cmap / 标准字体基址（见 [PDF.js production preview](#pdfjs-production-preview)）。
   - **`VITE_PDF_DISABLE_FONT_FACE`**（可选）：设为 **`true`** 时强制 pdf.js 使用非 `FontFace` 渲染路径。

   **定义在哪里：** 工作流的 **build** 任务使用 `${{ vars.* }}`，且**没有**声明 `environment: github-pages`，因此这些名字必须配置在仓库（或组织）的 **Actions → Variables** 里。**仅**写在 **Settings → Environments → github-pages** 下的变量 **不会** 传给 `pnpm build`。工作流里的 `PUBLIC_SITE_ORIGIN` 来自 **`vars`（不是 `secrets`）**；公网 origin 请建在 **Variables**。**不要**对同一名称再重复配置 Secret + Variable。

3. 可选：修改 `static/sitemap.xml`、`static/robots.txt` 中的 URL，与公网地址一致。

4. **BusyTeX：** 工作流已在 **`pnpm build` 前**拉取资源（`pnpm run download-busytex:force` 且 `BUSYTEX_USE_CURL=1`，与本地 `download-busytex` 产物一致，并带 curl/重试），并对 **`static/busytex`** 按 **`pnpm-lock.yaml`** 做 **Actions 缓存**。是否下载用 **shell `test -f`** 判断（不用 `hashFiles` 指向已 gitignore 的路径，以免误判）；随后一步若仍无 **`busytex.js`** 会直接 **失败**，避免带着空目录发布。若不需要线上 BusyTeX，可在 fork 里删掉或条件化这些步骤。

   **排查（GitHub Pages 项目站，如 `…/texbrain/`）：** 若浏览器请求 `…/texbrain/busytex/busytex.js` 却 **404**，说明构建当时 **`static/busytex/` 不在磁盘上**，请到 Actions 日志里看下载步骤是否成功。并确认 **`BASE_PATH`** 与站点子路径一致（例如 `/texbrain`）。若控制台提示 manifest 图标去拉 **`https://<用户>.github.io/favicon.svg`**，说明 manifest 里用了以 **`/`** 开头的绝对路径，会相对 **用户站根**解析，而不是仓库子路径；应改为**相对路径**（见本仓库 `static/manifest.json`）。

---

## 实现方式

**编辑器。** [CodeMirror 6](https://codemirror.net/) + 自定义 LaTeX 语法（Lezer）、补全与主题；多标签与本地目录、内存中的 Git 工作区同步。

**编译器——两套后端，按项目自动选择：**

1. **[SwiftLaTeX](https://github.com/SwiftLaTeX/SwiftLaTeX)** pdfTeX（WASM）——默认路径。项目文件写入 MEMFS；首次编译从静态资源加载 TexLive 缓存；对部分不兼容内容做预处理。使用 biblatex + **Biber**（常见默认）时仍走此路径，并辅以文献方面的折中处理。

2. **[BusyTeX](https://github.com/TeXlyre/texlyre-busytex)**（[`texlyre-busytex`](https://www.npmjs.com/package/texlyre-busytex)）——在需要 BibTeX **且** 已存在 `static/busytex/` 资源时使用，执行 PdfLaTeX + bibtex8 流水线。npm 包仅包含 JS API；体积较大的 WASM 等资源需单独下载（与上游设计一致）。

**缓存 / 下载行为速览：**

- **SwiftLaTeX 路径（`pdfLaTeX`）**会使用 TeXLive 缓存（IndexedDB）。首次可能较慢，后续缓存命中会明显变快。
- **BusyTeX 路径（`XeLaTeX` / BusyTeX BibTeX 流水线）**不走 TeXbrain 的 TeXLive 缓存预热逻辑。
- 浏览器**隐私模式**下本地存储是临时的，关闭会话后大体积运行时数据可能需要重新下载。

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

## 模板仓库与 Git（给用户的说明）

以下内容可直接复制到 README / 群公告，用于说明 **能力边界** 与 **推荐工作流**（语气偏说明，不做恐吓式表述）：

TeXbrain 不是“自动同步云端”的编辑器：你的修改默认只保存在本机工程目录；除非你自己配置凭据并执行推送，否则不会影响 GitHub 上的模板仓库。

不要把上游模板当工作仓库：请 Fork 到自己的账号，在 fork 上开发；上游仓库保持只读订阅更新。

如必须在浏览器里连 GitHub：使用只读 token，或最小权限 token；不要给模板仓库写权限。

论文/学位论文类模板：建议固定使用维护者为在线环境准备的 **`online-texbrain`** 分支（兼容性/资源路径等以该分支为准）。在 TeXbrain 欢迎页克隆时，可使用 **SWUThesis** 预设，或在 **分支** 输入框填写 `online-texbrain`。

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
git clone https://github.com/vanabel/texbrain.git
cd texbrain
pnpm install
pnpm exec svelte-kit sync
pnpm dev
```

在 Chrome 或 Edge 中打开 **http://localhost:5173**。

### 可选：BusyTeX 资源（BibTeX）

`pnpm install` 只会安装 **npm 包**。**约 175 MB** 的 WASM / TeX Live 数据**不在** npm 包内，需从 [texlyre-busytex 的 GitHub Releases](https://github.com/TeXlyre/texlyre-busytex) 下载到 `static/busytex/`：

```bash
pnpm run download-busytex
```

大文件从 GitHub 拉取可能超时；升级 `@vanabel/texlyre-busytex` 后需刷新本地 WASM 时，可在**已设置代理的同一终端**执行 `pnpm run download-busytex:force`（脚本在检测到 `HTTPS_PROXY` / `ALL_PROXY` 等且系统有 `curl` 时会用 **curl** 下载，从而走你在 zsh 里配置的 `enable_proxy` 等 SOCKS5）。也可设置 `BUSYTEX_USE_CURL=1` 强制走 curl。

若不执行此步，SwiftLaTeX 仍可编译；经典 BibTeX 引用解析则依赖上述资源。`static/busytex/` 默认已加入 `.gitignore` 以控制仓库体积；若线上站点也需要 BusyTeX，请在本地或 CI 中于构建前执行该命令。

### Cloudflare 缓存清理（BusyTeX）

**何时需要清：** 你在 NAS/CI 上更新了 `static/busytex/` 里的 WASM / JS / `.data`，且站点前面走了 **Cloudflare 代理（橙色云）** 时，边缘节点可能仍返回旧文件，浏览器会一直拿到旧版 BusyTeX。仅更新前端 `build/`（如 SvelteKit 的 `/_app/immutable/…`）时，若 Cloudflare 对 HTML 或静态资源缓存较激进，也可能需要按 URL 清理或等 TTL 过期。

**方式一：控制台（不写脚本）**

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)，选中你的 **站点（Zone）**。
2. 左侧 **Caching（缓存）** → **Configuration（配置）**。
3. 在 **Purge Cache（清除缓存）** 中选其一：
   - **Custom Purge** → **URL**：逐条粘贴用户实际访问的完整 URL（含 `https://`），例如 `https://你的域名/busytex/busytex.wasm` 等；适合只动 BusyTeX。
   - **Purge Everything（清除所有）**：清空该站点在 Cloudflare 上的全部边缘缓存；简单但短期回源会增多，其他大静态资源也会被清掉。

**方式二：API（可放进 CI）**

- **Zone ID**：同一站点的 **Overview** 页面右侧 **API** 小节里可复制。
- **API Token**：右上角头像 → **My Profile** → **API Tokens** → **Create Token**。可用模板 **「Cache Purge - Purge」**；或自建权限：**Zone** → **Cache Purge** → **Edit**。
- 下面脚本里把 `https://tex.vanabel.cn/...` 换成你对外暴露的 **公网域名**（与用户在浏览器里打开的一致）。若还加载了 `busytex_pipeline.js`、`busytex_worker.js` 等，把对应 URL 一并列入 `files`；也可用 Cloudflare 的 **Custom Purge by prefix**（控制台）或 API 的 `prefixes`（例如 `https://你的域名/busytex`）一次清掉该路径下缓存（以你账号里 API 文档为准）。

```bash
#!/usr/bin/env bash
set -euo pipefail

: "${CF_API_TOKEN:?need CF_API_TOKEN}"
: "${CF_ZONE_ID:?need CF_ZONE_ID}"

curl -sS -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{
    "files": [
      "https://tex.vanabel.cn/busytex/busytex.js",
      "https://tex.vanabel.cn/busytex/busytex.wasm",
      "https://tex.vanabel.cn/busytex/texlive-basic.js",
      "https://tex.vanabel.cn/busytex/texlive-basic.data",
      "https://tex.vanabel.cn/busytex/texlive-extra.js",
      "https://tex.vanabel.cn/busytex/texlive-extra.data"
    ]
  }' | jq .
```

成功时 API 返回 JSON 里 `"success": true`。清完后建议浏览器对该站做一次 **强制刷新**（⌘+Shift+R / Ctrl+F5）。

### BusyTeX 字体覆盖（以 SWUThesis 为例）

当模板里已定义 `\youyuan`（或其他命令）时，直接 `\newCJKfontfamily\youyuan` 可能报 *already defined*。在部分环境中，`\renewCJKfontfamily` 也可能不存在。更稳妥的方式是：先注册一个新字体族，再把模板命令重定向到该字体族。

将 `YouYuan.ttf` 放在主文件（如 `swuthesis-main.tex`）同目录后，可在导言区使用：

```tex
\usepackage{xeCJK}
\IfFileExists{YouYuan.ttf}{
  \setCJKfamilyfont{yy}{YouYuan.ttf}
  \renewcommand{\youyuan}{\CJKfamily{yy}}
}{
  \typeout{[FONT] YouYuan.ttf not found, keep default \string\youyuan}
}
```

说明：
- 该方案不会改 `ctex` 主字体，只影响调用 `\youyuan` 的位置。
- 需使用 `xelatex` 编译。
- 若字体在子目录（如 `fonts/`），可改为 `\setCJKfamilyfont{yy}[Path=./fonts/,Extension=.ttf]{YouYuan}`。

## PM2 部署

使用 PM2 托管静态构建，并支持自动重启：

```bash
VITE_PDF_VIEWER=pdfjs pnpm build
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

### 在 NAS 上更新部署

NAS 上常见做法是 **git 克隆本仓库** + **`pnpm build`** + **PM2** 托管 `build/` 目录（与 [PM2 部署](#pm2-部署) 相同）。合并新功能（例如 SyncTeX）后，在 NAS 上大致按下面做即可上线：

1. **SSH** 登录 NAS，`cd` 到项目根目录（含 `package.json` 的目录）。
2. **拉代码：** `git fetch origin && git checkout main && git pull origin main`（若你固定用别的分支，请改成对应分支）。
3. **依赖：** `pnpm install`
4. **BusyTeX（若 NAS 上要带 BibTeX / XeLaTeX 资源）：** 在升级了 `@vanabel/texlyre-busytex` 或该机上还没有 `static/busytex/` 时执行 `pnpm run download-busytex`。
5. **构建：** 一般执行 `pnpm build`；若需**预览栏内 SyncTeX**（与本地 `pnpm dev` 一致），请使用 `VITE_PDF_VIEWER=pdfjs pnpm build`（默认生产构建为 iframe 内置 PDF，无法实现预览内 SyncTeX）。
6. **重启 PM2：** `pnpm pm2:restart`；若需改端口可用 `PORT=8080 pnpm pm2:restart`。若用裸 `pm2 restart`，名称以 `ecosystem.config.cjs` 为准。
7. **反向代理 / CDN：** 若使用 Cloudflare 且刚更新了 BusyTeX，按上文 [Cloudflare 缓存清理（BusyTeX）](#cloudflare-缓存清理busytex) 操作；其他 CDN/nginx 同理按需清缓存或缩短静态资源 TTL。
8. **浏览器：** 让用户 **强制刷新**（如 Ctrl+F5、⌘+Shift+R），确保加载新的 `/_app/immutable/...` 以及更新后的 `busytex/` 等静态路径。

本应用无服务端数据库或迁移脚本，本质是静态文件 + 可选的 `static/busytex/` 资源。

---

## 浏览器支持

完整「选择本地文件夹」能力依赖 **File System Access API**（Chrome、Edge、Arc、Brave、Opera 等）。Firefox、Safari 可使用编辑器与虚拟文件系统回退，但无法像 Chromium 那样直接读写自选文件夹。

---

## 许可证

[MIT](LICENSE)

原项目作者：[Braian Plaku](https://swimmingbrain.dev)。本分支由 [vanabel](https://github.com/vanabel) 维护并持续改进。
