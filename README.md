<p align="right"><strong>English</strong> · <a href="README.zh-CN.md">中文</a></p>

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
  <strong>Browser-only LaTeX → PDF.</strong><br />
  No account. No install. No backend—just a tab.
</p>

<p align="center">
  <a href="https://tex.vanabel.cn"><strong>Open the app → tex.vanabel.cn</strong></a>
</p>

---

### Why it exists

I was tired of paying for basics. I wrote a thesis in LaTeX and fought the toolchain more than the content. Cloud editors paywall git; local setups diverge across machines. I wanted: open browser, write LaTeX, get a PDF. So I built this.

### About this fork

**TeXbrain** was originally created by [Braian Plaku](https://swimmingbrain.dev). **This repository**—[`vanabel/texbrain`](https://github.com/vanabel/texbrain)—is a **maintained fork** with substantial improvements and extra documentation. **Live demo (this fork):** [tex.vanabel.cn](https://tex.vanabel.cn). **Upstream public demo:** [tex.swimmingbrain.dev](https://tex.swimmingbrain.dev)—a different codebase and deployment. **Maintainer / contributor:** [vanabel](https://github.com/vanabel).

---

## Contents

- [Why it exists](#why-it-exists)
- [About this fork](#about-this-fork)
- [What it does](#what-it-does)
- [Features](#features)
- [Editor sidebar](#editor-sidebar-files-outline-references)
- [SyncTeX](#synctex-editor--pdf)
- [BibTeX example](#bibtex-example-english--chinese)
- [Documentation](#documentation)
- [Quick start (local)](#quick-start-local)
- [License](#license)

---

## What it does

TeXbrain is a full editor: your `.tex` files compile to **PDF in the browser**. There is no server processing your sources—the editor, compilers, and git client all run **client-side**.

Open a folder, edit, preview PDF, commit, push to GitHub—**from one tab**.

---

## Features

| | |
| --- | --- |
| **Compile in-browser** | WebAssembly TeX. Default: [SwiftLaTeX](https://github.com/SwiftLaTeX/SwiftLaTeX) pdfTeX. Optional [BusyTeX](https://github.com/TeXlyre/texlyre-busytex) for real **BibTeX** when your project uses classic `\bibliography` / `\bibliographystyle` or biblatex with `backend=bibtex`. |
| **PDF preview** | **Dev:** [pdf.js](https://mozilla.github.io/pdf.js/). **Default production:** native browser PDF. Optional **`VITE_PDF_VIEWER=pdfjs`** at build time for pdf.js + **SyncTeX** in the preview. Details: [FAQ — SyncTeX & PDF.js](docs/en/faq.md#synctex-editor--pdf). |
| **Git** | Clone, branch, stage, commit, push, pull, merge via [isomorphic-git](https://isomorphic-git.org/)—no CLI. |
| **Local files** | [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) on Chromium—read/write your disk folder. |
| **Projects** | Tree, tabs, drag-and-drop; `.tex`, `.bib`, `.sty`, `.cls`, and more. |
| **Sidebar** | **Files**, **Outline** (sections + `\input` / `\include`), **References** (cites + numbered equations). **Ctrl+B** toggles the sidebar. |
| **Editor** | CodeMirror 6—highlighting, completions, folding, snippets, themes. Project-wide `\cite{…}` / `\eqref{…}` completion from `.bib` / `.bbl` and equation labels. |
| **Palette & snippets** | Command palette; searchable math/env snippets. |
| **Offline** | After load, editing and compilation work without the network. |
| **Templates** | Article, thesis, beamer, report, CV, letter, minimal. |
| **SyncTeX** | Double-click editor → PDF; Ctrl/⌘+click PDF → source (**pdf.js** preview). See [FAQ](docs/en/faq.md#synctex-editor--pdf). |

---

## Editor sidebar (files, outline, references)

The left sidebar has three tabs (**Ctrl+B**):

| Tab | What it shows |
| --- | --- |
| **Files** | Project file tree. |
| **Outline** | `\part` … `\subparagraph` from the **active** `.tex`, including `\input` / `\include`. Click to jump. |
| **References** | Citation keys (`.bib` / `.bbl`) and numbered equations (from **entry** `.tex` + includes; skipped when the project has more than 120 `.tex` paths). |

- **Click** a key or equation number → jump to source.
- **Ctrl+click** / **⌘+click** → insert `\cite{key}` or `\eq{number}`.

---

## SyncTeX (editor ↔ PDF)

**Double-click** the editor to scroll the PDF toward the cursor; **Ctrl+click** (Windows/Linux) or **⌘+click** (macOS) on the **pdf.js** preview to open the matching `.tex` line. Default production builds use the native PDF viewer, so preview SyncTeX needs **`VITE_PDF_VIEWER=pdfjs`** at build time.

Full details, env vars, and hosting notes: **[FAQ — SyncTeX](docs/en/faq.md#synctex-editor--pdf)**.

---

## BibTeX example (English / Chinese)

Sample project: [`examples/bibtex-metapost-english-chinese/`](examples/bibtex-metapost-english-chinese/README.md). In the app: welcome screen → **Clone Repository** → **Use official TeXbrain repo (BibTeX EN/ZH example)**. Classic BibTeX needs **BusyTeX** on the host (`pnpm run download-busytex`). Known issues (`cleveref`, `sortname`): **[FAQ — BibTeX](docs/en/faq.md#bibtex--bibliographies)**.

---

## Documentation

| Guide | English | 中文 |
| --- | --- | --- |
| Index | [docs/README.md](docs/README.md) | [docs/README.zh-CN.md](docs/README.zh-CN.md) |
| Technical (architecture, stack, privacy) | [docs/en/technical.md](docs/en/technical.md) | [docs/zh-CN/technical.md](docs/zh-CN/technical.md) |
| Deployment (local, Pages, PM2, NAS, CDN) | [docs/en/deployment.md](docs/en/deployment.md) | [docs/zh-CN/deployment.md](docs/zh-CN/deployment.md) |
| FAQ (SyncTeX, BusyTeX, fonts, troubleshooting) | [docs/en/faq.md](docs/en/faq.md) | [docs/zh-CN/faq.md](docs/zh-CN/faq.md) |
| Roadmap | [ROADMAP.md](ROADMAP.md) | [ROADMAP.zh-CN.md](ROADMAP.zh-CN.md) |

---

## Quick start (local)

```bash
git clone https://github.com/vanabel/texbrain.git
cd texbrain
pnpm install
pnpm exec svelte-kit sync
pnpm dev
```

Open **http://localhost:5173** in Chrome or Edge. Optional BusyTeX: `pnpm run download-busytex`. Deploying to GitHub Pages, PM2, or a NAS: **[Deployment guide](docs/en/deployment.md)**.

---

## License

[MIT](LICENSE)

Original author: [Braian Plaku](https://swimmingbrain.dev). This fork is maintained by [vanabel](https://github.com/vanabel).
