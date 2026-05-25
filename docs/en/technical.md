<p align="right"><a href="../README.md">Docs index</a> · <a href="../../README.md">Main README</a> · <a href="../zh-CN/technical.md">中文</a></p>

# Technical guide

## Architecture overview

TeXbrain is a **static** [SvelteKit](https://kit.svelte.dev/) app: the editor, compilers, and git client run **entirely in the browser**. There is no server that processes your `.tex` sources.

### Editor

[CodeMirror 6](https://codemirror.net/) with a custom LaTeX grammar (Lezer), autocomplete, themes, and snippets. Tabs stay in sync with the local folder (File System Access API) and the in-memory git tree.

The tabbed **sidebar** parses project `.tex` / `.bib` for:

- **Outline** — section tree and `\input` / `\include` navigation
- **References** — citation keys and numbered equations
- In-editor completion for `\cite{…}` / `\eqref{…}` from the same parsed sources

See the main [README — Editor sidebar](../../README.md#editor-sidebar-files-outline-references) for user-facing behavior.

### Compiler — two backends (auto-selected)

1. **[SwiftLaTeX](https://github.com/SwiftLaTeX/SwiftLaTeX)** pdfTeX (WASM) — **default**. Project files go to MEMFS; TexLive cache loads from static assets on first compile; a preprocessor handles unsupported constructs. Projects using biblatex + **Biber** (typical default) stay on this path with a small bibliography workaround.

2. **[BusyTeX](https://github.com/TeXlyre/texlyre-busytex)** ([`texlyre-busytex`](https://www.npmjs.com/package/texlyre-busytex)) — when classic **BibTeX** is required **and** `static/busytex/` exists on the host. XeLaTeX + bibtex8 pipeline. The npm package ships only the JS API; large WASM assets are downloaded separately ([deployment guide](deployment.md#optional-busytex-assets-bibtex)).

### Cache and download behavior

| Path | TeXLive / cache |
| --- | --- |
| SwiftLaTeX (`pdfLaTeX`) | TeXLive cache in IndexedDB; first compile may be slow, later runs faster |
| BusyTeX (XeLaTeX / BibTeX) | Does **not** use TeXbrain’s TeXLive warmup |
| Incognito / private browsing | Storage is ephemeral; large downloads may repeat each session |

### Compile target mode (top bar **Compile**)

- **Active Tab** — compile the focused `.tex` tab first, then fall back to the entry point.
- **Entry Point** — always compile the project entry file (`Entry: …`).
- **Target** — the bar shows the file actually compiled last time.

### Git

[isomorphic-git](https://isomorphic-git.org/) + [LightningFS](https://github.com/isomorphic-git/lightning-fs) / IndexedDB. Remotes require a **CORS proxy** (browsers cannot speak git natively). Default proxy: `cors.isomorphic-git.org` (replaceable in the UI).

**Open Folder** does not import a disk `.git`. For course-style GitHub collaboration, see **[Collaboration workflow](collaboration-workflow.md)**.

### PDF preview

[pdf.js](https://mozilla.github.io/pdf.js/) in **dev** and when built with `VITE_PDF_VIEWER=pdfjs`. Default **production** builds use the browser’s native PDF viewer in an `<iframe>`. See [FAQ — SyncTeX & PDF.js](faq.md#synctex-editor--pdf).

### Filesystem

- **Chromium:** [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) for direct folder read/write.
- **Other browsers:** OPFS / virtual FS fallback (no native folder picker). See [FAQ — Browser support](faq.md#browser-support).

### App shell

SvelteKit **static adapter** + [Tailwind CSS 4](https://tailwindcss.com/). Deploy as static files (GitHub Pages, NAS + PM2, etc.) — no SSR API.

---

## Tech stack

| Layer | Stack |
| --- | --- |
| UI | Svelte 5 + SvelteKit (static) |
| Editor | CodeMirror 6 + LaTeX tooling |
| Compile | SwiftLaTeX WASM; optional BusyTeX for BibTeX |
| Git | isomorphic-git + LightningFS |
| PDF | pdf.js (optional in production) |
| Style | Tailwind CSS 4 |
| Language | TypeScript |

---

## Security & privacy

Everything runs in your browser unless **you** push to a remote.

- No telemetry, analytics, or tracking
- No accounts or cookies
- Git tokens: `localStorage` only — never sent to a server we control
- LaTeX in WASM — no shell `pdflatex`, no `exec` / `spawn`
- Git is a JS library — no shell injection
- Default git CORS proxy: `cors.isomorphic-git.org` (replaceable)
- TeX/LaTeX are FOSS; this repo does not redistribute TeX sources

---

## Related docs

- [Deployment](deployment.md) — local dev, GitHub Pages, PM2, NAS, Cloudflare
- [FAQ](faq.md) — SyncTeX, build env vars, BusyTeX fonts, troubleshooting
- [Collaboration workflow](collaboration-workflow.md) — GitHub + Collab for classes
- [Main README](../../README.md) — features and quick start
