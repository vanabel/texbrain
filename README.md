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
- [SyncTeX (editor ↔ PDF)](#synctex-editor--pdf)
- [How it works](#how-it-works)
- [Security & privacy](#security--privacy)
- [Template repos & Git (user guidance)](#template-repos--git-user-guidance)
- [Tech stack](#tech-stack)
- [BibTeX example (English / Chinese)](#bibtex-example-english--chinese)
- [Deploying to GitHub Pages](#deploying-to-github-pages)
- [Running locally](#running-locally)
- [Cloudflare cache purge (BusyTeX)](#cloudflare-cache-purge-busytex)
- [PM2 deployment](#pm2-deployment)
- [Updating on a NAS (PM2 static host)](#updating-on-a-nas-pm2-static-host)
- [Future roadmap (draft)](ROADMAP.md)
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
| **Compile in-browser** | WebAssembly TeX. Default: [SwiftLaTeX](https://github.com/SwiftLaTeX/SwiftLaTeX) pdfTeX. Optional [BusyTeX](https://github.com/TeXlyre/texlyre-busytex) (`texlyre-busytex`) for real **BibTeX** when your project uses classic `\bibliography` / `\bibliographystyle` or biblatex with `backend=bibtex`. **Important:** TeXLive cache warmup applies to the SwiftLaTeX (pdfTeX) path, not the BusyTeX XeLaTeX path. |
| **PDF preview** | **Dev:** [pdf.js](https://mozilla.github.io/pdf.js/) (multi-page, zoom, selection). **Default production build:** native browser PDF in an `<iframe>` (stable on some static hosts). **Optional:** set **`VITE_PDF_VIEWER=pdfjs`** at **build time** to use pdf.js in production too (needed for **SyncTeX** in the preview pane; rare pdf.js font issues on some browsers). |
| **Git** | Clone, branch, stage, commit, push, pull, merge via [isomorphic-git](https://isomorphic-git.org/)—no CLI. |
| **Local files** | [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) on Chromium—read/write your disk folder. |
| **Projects** | Tree, tabs, drag-and-drop; `.tex`, `.bib`, `.sty`, `.cls`, and more. |
| **Editor** | CodeMirror 6—highlighting, 70+ command completions, folding, snippets, themes. |
| **Palette & snippets** | Command palette; searchable math/env snippets. |
| **Offline** | After load, editing and compilation work without the network. |
| **Templates** | Article, thesis, beamer, report, CV, letter, minimal. |
| **SyncTeX** | After a compile that produces `.synctex.gz` (e.g. **BusyTeX XeLaTeX**, or SwiftLaTeX pdfTeX when enabled): **double-click the editor** to scroll the PDF toward the cursor; **Ctrl+click** (Windows/Linux) or **⌘+click** (macOS) on the **pdf.js** preview to jump to the matching `.tex` line. Hints also appear in the **status bar** next to Entry/Target. **Why native PDF has no SyncTeX:** the built-in viewer runs inside an opaque plugin surface—TeXbrain cannot read click positions or scroll to a SyncTeX box there. **Default production** uses that native viewer, so preview SyncTeX is off unless you rebuild with **`VITE_PDF_VIEWER=pdfjs`** (same as `pnpm dev` behavior for the preview). |

---

## SyncTeX (editor ↔ PDF)

When the compiler returns SyncTeX data, TeXbrain keeps it **in memory** for the current session (no extra disk write). Parsing uses the gzip payload from **BusyTeX** (`result.synctex`) or, on the SwiftLaTeX path, `.synctex.gz` read from the engine MEMFS when present.

- **Forward (source → PDF):** after a successful compile, the preview scrolls using SyncTeX when possible; **double-click** the editor pane to jump again without recompiling.
- **Inverse (PDF → source):** **Ctrl** or **⌘** + **primary click** on the rendered page (**pdf.js** path only).
- **Hosted sites:** run **`VITE_PDF_VIEWER=pdfjs pnpm build`** (and redeploy). For GitHub Actions, set repository variable **`VITE_PDF_VIEWER`** to `pdfjs` (see `.github/workflows/deploy.yml`).
- **Collaboration:** guests who receive only the remote PDF do **not** receive SyncTeX blobs; inverse/forward from SyncTeX apply to **local** compiles with synctex data.

---

## BibTeX example (English / Chinese)

This repo includes a small **bilingual BibTeX + MetaPost** layout under [`examples/bibtex-metapost-english-chinese/`](examples/bibtex-metapost-english-chinese/README.md) (e.g. `gbt7714` vs `amsrefs` / `amsrn.bst`, plus a MetaPost sample). **In the web app:** welcome screen → **Clone Repository** → **Use official TeXbrain repo (BibTeX EN/ZH example)** — or paste `https://github.com/vanabel/texbrain.git`. After clone, open the `.tex` you want under `examples/bibtex-metapost-english-chinese/English-bibtex/` or `.../Chinese-bibtex/` and compile (**Active tab** or set **Entry** to that file). Classic BibTeX needs **BusyTeX** on the deployment (`pnpm run download-busytex`). Details: [examples/bibtex-metapost-english-chinese/README.md](examples/bibtex-metapost-english-chinese/README.md).

> Known issue: in some BusyTeX runs, `cleveref` (`\cref` / `\Cref`) may fail with errors like `Extra \endcsname`.
> The `Chinese-biblatex` example includes a BusyTeX-only fallback: when `\BUSYTEX` is defined, it maps `\cref/\Cref` to `\autoref`; local TeX keeps native `cleveref`.
> For `biblatex` with `backend=bibtex` (BusyTeX bibtex8 path), please provide `sortname` for non-Latin author names to avoid unstable name hash/initial generation. Example: `author = {{周志华}}, sortname = {Zhou, Zhihua}`.

---

## Deploying to GitHub Pages

The included workflow (`.github/workflows/deploy.yml`) builds and publishes the `build/` folder. **Do this first:** enable Pages and choose **GitHub Actions** as the source, or the deploy job fails with **404 / Not Found** when creating the deployment.

1. **Pages (required):** Repository **Settings → Pages → Build and deployment → Source: GitHub Actions**. Save. If you previously used **Deploy from a branch**, switch to **GitHub Actions** (only one source applies). Then re-run the workflow (Actions tab → failed run → **Re-run all jobs**, or use **workflow_dispatch** if available).

2. **GitHub repository → Settings → Secrets and variables → Actions → Variables** (or **Repository variables**) — optional but recommended so canonical URLs match your site:
   - **`PUBLIC_SITE_ORIGIN`** — Scheme + host only, **no trailing slash**, e.g. `https://yourname.github.io` for GitHub-hosted sites, or `https://tex.example.com` for a custom domain at the site root.
   - **`BASE_PATH`** — If the app is served under a subpath (typical GitHub **project** Pages: `https://yourname.github.io/repo-name/`), set `BASE_PATH` to `/repo-name` (leading slash). For a **user/org** site at the domain root or a custom domain with no subpath, leave **`BASE_PATH` unset** or empty.

3. Optional: edit `static/sitemap.xml` and `static/robots.txt` so `Sitemap:` and `<loc>` match your public URL.

4. **BusyTeX** (BibTeX in the browser): add a step before `pnpm build` to run `pnpm run download-busytex`, or attach the downloaded `static/busytex/` artifact—same as local optional setup.

---

## How it works

**Editor.** [CodeMirror 6](https://codemirror.net/) + custom LaTeX grammar (Lezer), autocomplete, themes. Tabs sync with the local folder and the in-memory git tree.

**Compiler—two backends, auto-selected:**

1. **[SwiftLaTeX](https://github.com/SwiftLaTeX/SwiftLaTeX)** pdfTeX (WASM) — default. MEMFS for project files; TexLive cache from static assets on first compile; preprocessor for unsupported bits. Biblatex + **Biber** (typical default) stays here with a small bibliography workaround.

2. **[BusyTeX](https://github.com/TeXlyre/texlyre-busytex)** ([`texlyre-busytex`](https://www.npmjs.com/package/texlyre-busytex)) — when BibTeX is required **and** `static/busytex/` is present. PdfLaTeX + bibtex8 pipeline. NPM ships only the JS API; large WASM assets are downloaded separately (upstream design).

**Cache/download behavior at a glance:**

- **SwiftLaTeX path (`pdfLaTeX`)** uses TeXLive cache (IndexedDB). First run may be slow; later runs are faster when cache persists.
- **BusyTeX path (`XeLaTeX` / BusyTeX BibTeX pipeline)** does not use TeXbrain's TeXLive cache warmup path.
- In browser **incognito/private mode**, storage is temporary, so large runtime downloads may repeat each session.

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

## Template repos & Git (user guidance)

You can paste the following into your README / group announcement. It explains **what TeXbrain does and does not do**, and the **recommended workflow** (matter-of-fact, not alarmist):

TeXbrain is **not** a “live-sync to the cloud” editor: your edits are saved to the **local project folder you picked** by default. Unless you configure credentials and explicitly **push**, your changes will **not** affect the template repository on GitHub.

Do not treat the **upstream template** as your day-to-day working repo: **fork** it to your account and work on the fork; keep upstream read-only and pull updates when needed.

If you must connect TeXbrain to GitHub in the browser: use a **read-only** token, or a **least-privilege** token; do not grant write access to a shared template repository.

For thesis/class templates: prefer the maintainer’s **`online-texbrain`** branch for browser/TeXbrain compatibility (paths/resources are maintained against that branch). In TeXbrain, use the **SWUThesis** clone preset, or set **Branch** to `online-texbrain`.

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
git clone https://github.com/vanabel/texbrain.git
cd texbrain
pnpm install
pnpm exec svelte-kit sync
pnpm dev
```

Open **http://localhost:5173** in Chrome or Edge.

### Optional: BusyTeX assets (BibTeX)

`pnpm install` adds the **npm package** only. The **~175 MB** WASM / TeX Live bundle is **not** in the tarball—it is downloaded from [texlyre-busytex releases](https://github.com/TeXlyre/texlyre-busytex) into `static/busytex/`:

```bash
pnpm run download-busytex
```

Large downloads from GitHub may time out. After upgrading `@vanabel/texlyre-busytex`, refresh WASM with `pnpm run download-busytex:force` in a shell where **proxy env vars are already set** (e.g. your zsh `enable_proxy`); when `HTTPS_PROXY` / `ALL_PROXY` / `HTTP_PROXY` is set and `curl` exists, the script uses **curl** (proxy-aware, including SOCKS5). Set `BUSYTEX_USE_CURL=1` to force curl.

Without it, SwiftLaTeX still works; classic BibTeX citation resolution needs this step. `static/busytex/` is gitignored—run locally or in CI before deploy if the hosted site should use BusyTeX.

### Cloudflare cache purge (BusyTeX)

**When to purge:** After you deploy new files under `static/busytex/` (WASM / JS / `.data`) and the site is behind **Cloudflare proxy (orange cloud)**, edges may keep serving old objects. After a normal `pnpm build` (SvelteKit `/_app/immutable/…` chunks), aggressive HTML or asset caching can also warrant a targeted purge or waiting for TTL.

**Option A: Dashboard (no scripts)**

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com/) and select your **zone**.
2. **Caching** → **Configuration**.
3. Under **Purge Cache**:
   - **Custom Purge** → **URL**: paste full URLs users hit (including `https://`), e.g. `https://your.domain/busytex/busytex.wasm`, etc.—good for BusyTeX-only updates.
   - **Purge Everything**: clears the whole zone’s edge cache for that site; simplest but increases origin load briefly and evicts unrelated cached assets.

**Option B: API (CI-friendly)**

- **Zone ID**: **Overview** for the zone, right-hand **API** section.
- **API Token**: avatar → **My Profile** → **API Tokens** → **Create Token**. Use template **“Cache Purge - Purge”**, or custom: **Zone** → **Cache Purge** → **Edit**.
- Replace `https://tex.vanabel.cn/...` in the JSON with your **public site origin** (same host users type in the browser). If you also load `busytex_pipeline.js`, `busytex_worker.js`, etc., add those URLs to `files`, or use **purge by prefix** in the dashboard / API `prefixes` (e.g. `https://your.domain/busytex`) to drop everything under that path—confirm exact fields in Cloudflare’s API docs for your plan.

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

Expect `"success": true` in the JSON response. Then hard-refresh the site in the browser (⌘+Shift+R / Ctrl+F5).

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

### Updating on a NAS (PM2 static host)

TeXbrain on a NAS is usually a **git clone** + **`pnpm build`** + **PM2** serving the `build/` folder (same as [PM2 deployment](#pm2-deployment)). To roll out a new version (e.g. after merging SyncTeX or other changes):

1. **SSH** into the NAS and `cd` to the project directory (the folder that contains `package.json`).
2. **Pull** the latest code: `git fetch origin && git checkout main && git pull origin main` (adjust branch if you deploy from another branch).
3. **Install deps:** `pnpm install`
4. **BusyTeX (if you ship it on the NAS):** `pnpm run download-busytex` — only needed when `@vanabel/texlyre-busytex` or upstream assets changed, or if `static/busytex/` is missing on that machine.
5. **Rebuild:** `pnpm build` — for **SyncTeX in the PDF preview** on this host, use `VITE_PDF_VIEWER=pdfjs pnpm build` instead (native iframe viewer cannot drive SyncTeX).
6. **Restart PM2:** `pnpm pm2:restart` — or `PORT=8080 pnpm pm2:restart` if you override the port; confirm the app name in `ecosystem.config.cjs` if you use raw `pm2 restart <name>`.
7. **Reverse proxy / CDN:** if you use Cloudflare and updated BusyTeX, follow [Cloudflare cache purge (BusyTeX)](#cloudflare-cache-purge-busytex); otherwise purge or shorten TTL for static assets as needed.
8. **Browser:** do a **hard refresh** (e.g. Ctrl+F5 / ⌘+Shift+R) so clients load the new `/_app/immutable/...` chunks and updated `busytex/` URLs if applicable.

No database or server-side migration is required—this app is static files plus optional BusyTeX assets under `static/`.

---

## Browser support

Full folder read/write needs the **File System Access API** (Chrome, Edge, Arc, Brave, Opera). Firefox and Safari can use the editor with a virtual FS fallback but not direct folder pickers.

---

## License

[MIT](LICENSE)

Original author: [Braian Plaku](https://swimmingbrain.dev). This fork is maintained by [vanabel](https://github.com/vanabel).