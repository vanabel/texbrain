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
  <a href="https://tex.swimmingbrain.dev"><strong>Open the app → tex.swimmingbrain.dev</strong></a>
</p>

---

### Why it exists

I was tired of paying for basics. I wrote a thesis in LaTeX and fought the toolchain more than the content. Cloud editors paywall git; local setups diverge across machines. I wanted: open browser, write LaTeX, get a PDF. So I built this.

---

## Contents

- [What it does](#what-it-does)
- [Features](#features)
- [How it works](#how-it-works)
- [Security & privacy](#security--privacy)
- [Tech stack](#tech-stack)
- [Running locally](#running-locally)
- [PM2 deployment](#pm2-deployment)
- [Browser support](#browser-support)
- [License](#license)

---

## What it does

TeXbrain is a full editor: your `.tex` files compile to **PDF in the browser**. There is no server processing your sources—the editor, compilers, and git client all run **client-side**.

Open a folder, edit, preview PDF, commit, push to GitHub—**from one tab**.

---

## Features

| | |
| --- | --- |
| **Compile in-browser** | WebAssembly TeX. Default: [SwiftLaTeX](https://github.com/SwiftLaTeX/SwiftLaTeX) pdfTeX. Optional [BusyTeX](https://github.com/TeXlyre/texlyre-busytex) (`texlyre-busytex`) for real **BibTeX** when your project uses classic `\bibliography` / `\bibliographystyle` or biblatex with `backend=bibtex`. First SwiftLaTeX run can take ~1 min (TexLive cache); later runs are usually seconds. |
| **PDF preview** | [pdf.js](https://mozilla.github.io/pdf.js/)—multi-page, zoom, text selection. |
| **Git** | Clone, branch, stage, commit, push, pull, merge via [isomorphic-git](https://isomorphic-git.org/)—no CLI. |
| **Local files** | [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) on Chromium—read/write your disk folder. |
| **Projects** | Tree, tabs, drag-and-drop; `.tex`, `.bib`, `.sty`, `.cls`, and more. |
| **Editor** | CodeMirror 6—highlighting, 70+ command completions, folding, snippets, themes. |
| **Palette & snippets** | Command palette; searchable math/env snippets. |
| **Offline** | After load, editing and compilation work without the network. |
| **Templates** | Article, thesis, beamer, report, CV, letter, minimal. |

---

## How it works

**Editor.** [CodeMirror 6](https://codemirror.net/) + custom LaTeX grammar (Lezer), autocomplete, themes. Tabs sync with the local folder and the in-memory git tree.

**Compiler—two backends, auto-selected:**

1. **[SwiftLaTeX](https://github.com/SwiftLaTeX/SwiftLaTeX)** pdfTeX (WASM) — default. MEMFS for project files; TexLive cache from static assets on first compile; preprocessor for unsupported bits. Biblatex + **Biber** (typical default) stays here with a small bibliography workaround.

2. **[BusyTeX](https://github.com/TeXlyre/texlyre-busytex)** ([`texlyre-busytex`](https://www.npmjs.com/package/texlyre-busytex)) — when BibTeX is required **and** `static/busytex/` is present. PdfLaTeX + bibtex8 pipeline. NPM ships only the JS API; large WASM assets are downloaded separately (upstream design).

**Compile target mode (top bar `Compile`).**

- `Active Tab`: compile the currently focused `.tex` tab first, then fallback to entry point.
- `Entry Point`: always compile the project entry file (`Entry: ...`).
- The last resolved target is shown as `Target: ...` in the top bar.

**Git.** [isomorphic-git](https://isomorphic-git.org/) + [LightningFS](https://github.com/isomorphic-git/lightning-fs) / IndexedDB. Remotes use a CORS proxy (browsers cannot speak git natively).

**PDF.** [pdf.js](https://mozilla.github.io/pdf.js/).

**Filesystem.** File System Access API on Chromium; **OPFS** fallback elsewhere.

**App shell.** [SvelteKit](https://kit.svelte.dev/) static adapter + [Tailwind CSS 4](https://tailwindcss.com/)—static deploy (e.g. GitHub Pages), no SSR API.

---

## Security & privacy

Everything runs in your browser unless **you** push to a remote.

- No telemetry, analytics, or tracking  
- No accounts or cookies  
- Git tokens: `localStorage` only—never a server we control  
- LaTeX in WASM—no shell `pdflatex`, no `exec` / `spawn`  
- Git is a JS library—no shell injection  
- Default git CORS proxy: `cors.isomorphic-git.org` (replaceable)  
- TeX/LaTeX are FOSS; this repo does not redistribute TeX sources  

---

## Tech stack

| Layer | Stack |
| --- | --- |
| UI | Svelte 5 + SvelteKit (static) |
| Editor | CodeMirror 6 + LaTeX tooling |
| Compile | SwiftLaTeX WASM; optional BusyTeX for BibTeX |
| Git | isomorphic-git + LightningFS |
| PDF | pdf.js |
| Style | Tailwind CSS 4 |
| Lang | TypeScript |

---

## Running locally

```bash
git clone https://github.com/swimmingbrain/texbrain.git
cd texbrain
pnpm install
pnpm dev
```

Open **http://localhost:5173** in Chrome or Edge.

### Optional: BusyTeX assets (BibTeX)

`pnpm install` adds the **npm package** only. The **~175 MB** WASM / TeX Live bundle is **not** in the tarball—it is downloaded from [texlyre-busytex releases](https://github.com/TeXlyre/texlyre-busytex) into `static/busytex/`:

```bash
pnpm run download-busytex
```

Without it, SwiftLaTeX still works; classic BibTeX citation resolution needs this step. `static/busytex/` is gitignored—run locally or in CI before deploy if the hosted site should use BusyTeX.

## PM2 deployment

Use PM2 to host the static build with automatic restarts:

```bash
pnpm build
pnpm pm2:start
```

`serve` is already included in this repo (`devDependencies`), so you **do not** need to run `pnpm add -D serve ...` on deployment machines. Just run `pnpm install` first.

Default port is `4173` (from `ecosystem.config.cjs`). To change it per machine/user:

```bash
PORT=8080 pnpm pm2:restart
```

Useful commands:

```bash
pnpm pm2:logs
pnpm pm2:stop
pnpm pm2:delete
```

Enable startup on boot:

```bash
pm2 save
pm2 startup
```

---

## Browser support

Full folder read/write needs the **File System Access API** (Chrome, Edge, Arc, Brave, Opera). Firefox and Safari can use the editor with a virtual FS fallback but not direct folder pickers.

---

## License

[MIT](LICENSE)

Built by [Braian Plaku](https://swimmingbrain.dev)
