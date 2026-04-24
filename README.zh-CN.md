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
- [实现方式](#实现方式)
- [安全与隐私](#安全与隐私)
- [模板仓库与 Git（给用户的说明）](#模板仓库与-git给用户的说明)
- [技术栈](#技术栈)
- [双语 BibTeX 示例](#双语-bibtex-示例)
- [部署到 GitHub Pages](#部署到-github-pages)
- [本地运行](#本地运行)
- [BusyTeX 字体覆盖（以 SWUThesis 为例）](#busytex-字体覆盖以-swuthesis-为例)
- [PM2 部署](#pm2-部署)
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
| **PDF 预览** | [pdf.js](https://mozilla.github.io/pdf.js/)，多页、缩放、选中文本。 |
| **Git** | 克隆、分支、暂存、提交、推送、拉取、合并，基于 [isomorphic-git](https://isomorphic-git.org/)，无需命令行。 |
| **本地文件** | 在 Chromium 系浏览器中通过 [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) 直接读写磁盘上的项目目录。 |
| **多文件工程** | 文件树、标签页、拖拽；支持 `.tex`、`.bib`、`.sty`、`.cls` 等。 |
| **编辑器** | CodeMirror 6：高亮、70+ 命令补全、折叠、片段、主题。 |
| **命令面板与片段** | 命令面板；可搜索的数学环境 / 结构片段。 |
| **离线** | 页面加载后，编辑与编译可在无网络环境下进行。 |
| **模板** | 文章、学位论文、Beamer、报告、简历、信件、极简稿等。 |

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

3. 可选：修改 `static/sitemap.xml`、`static/robots.txt` 中的 URL，与公网地址一致。

4. 若线上需要 **BusyTeX**，在构建前增加 `pnpm run download-busytex` 或提供 `static/busytex/` 资源。

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

若不执行此步，SwiftLaTeX 仍可编译；经典 BibTeX 引用解析则依赖上述资源。`static/busytex/` 默认已加入 `.gitignore` 以控制仓库体积；若线上站点也需要 BusyTeX，请在本地或 CI 中于构建前执行该命令。

`package.json` 将 `@vanabel/texlyre-busytex` 指向 `file:../texlyre-busytex` 时，请把 [vanabel/texlyre-busytex](https://github.com/vanabel/texlyre-busytex) 仓库检出在与本目录**同级**（例如 `.../node.js/texbrain` 与 `.../node.js/texlyre-busytex`），并建议使用分支 `release/vanabel-0.1.7-beta` 或已合并该修复的提交。当 **`@vanabel/texlyre-busytex@0.1.7-beta` 已发布到 npm** 后，请把该项改为 `"0.1.7-beta"` 并执行 `pnpm install`，以便 CI 与仅克隆本仓库的环境无需同级源码。

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

原项目作者：[Braian Plaku](https://swimmingbrain.dev)。本分支由 [vanabel](https://github.com/vanabel) 维护并持续改进。
