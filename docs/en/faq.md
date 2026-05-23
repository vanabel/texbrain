<p align="right"><a href="../README.md">Docs index</a> · <a href="../../README.md">Main README</a> · <a href="../zh-CN/faq.md">中文</a></p>

# FAQ

## SyncTeX (editor ↔ PDF)

When the compiler returns SyncTeX data, TeXbrain keeps it **in memory** for the current session (no extra disk write). Parsing uses the gzip payload from **BusyTeX** (`result.synctex`) or, on the SwiftLaTeX path, `.synctex.gz` read from the engine MEMFS when present.

- **Forward (source → PDF):** after a successful compile, the preview scrolls using SyncTeX when possible; **double-click** the editor pane to jump again without recompiling.
- **Inverse (PDF → source):** **Ctrl** or **⌘** + **primary click** on the rendered page (**pdf.js** path only).
- **Hosted sites:** run **`VITE_PDF_VIEWER=pdfjs pnpm build`** (and redeploy). For GitHub Actions, set repository variable **`VITE_PDF_VIEWER`** to `pdfjs` (see `.github/workflows/deploy.yml`).
- **Collaboration:** guests who receive only the remote PDF do **not** receive SyncTeX blobs; inverse/forward from SyncTeX apply to **local** compiles with synctex data.

**Why doesn’t SyncTeX work in production by default?** The default production build uses the browser’s **native PDF** viewer in an `<iframe>`. That surface is opaque — TeXbrain cannot read click positions or scroll to a SyncTeX box. Rebuild with **`VITE_PDF_VIEWER=pdfjs`** for the same behavior as `pnpm dev`.

Status bar hints appear next to Entry/Target when SyncTeX or the References panel is relevant.

### PDF.js production preview

When you build with **`VITE_PDF_VIEWER=pdfjs`**, the preview pane uses pdf.js in **production** the same way as in dev. CMap and standard-font files are loaded from **jsDelivr** (`pdfjs-dist@<same version as your lockfile>`), which avoids broken CJK / `translateFont` issues that can appear with **`pnpm preview`** or some static hosts when those binaries are served only from hashed `/_app/immutable/assets/*.bcmap` (e.g. empty `Content-Type`).

- **Sanity check:** `VITE_PDF_VIEWER=pdfjs pnpm build` then **`pnpm preview`** — Chinese and other CID fonts should render if the browser can reach **cdn.jsdelivr.net**.
- **Offline / air-gapped:** set **`VITE_PDFJS_LOCAL_PDF_ASSETS=1`** (or `true` / `yes`) at **build time** to bundle cmap/pfb from `pdfjs-dist` and load them from your origin instead.
- **Optional overrides:** **`VITE_PDFJS_CMAP_URL`**, **`VITE_PDFJS_STANDARD_FONT_URL`** — base directories for cmap / `standard_fonts` (trailing slash optional; resolved against the page URL when relative).
- **Optional:** **`VITE_PDF_DISABLE_FONT_FACE=true`** — force pdf.js’s non–`FontFace` canvas path (only if you hit a rare host/browser font issue).

---

## GitHub Pages & BusyTeX

**Symptom:** Browser requests `…/texbrain/busytex/busytex.js` but gets **404**.

**Cause:** The deployed `build/` was produced **without** `static/busytex/` on disk.

**Fix:**

1. Check the GitHub Actions log for the BusyTeX download step (must run before `pnpm build`).
2. Set **`BASE_PATH`** to your repo subpath (e.g. `/texbrain`) so client URLs and output layout match project Pages.

**Manifest icon loads wrong host:** If Chrome warns about `https://<user>.github.io/favicon.svg` on a **project** site, `static/manifest.json` must use **relative** `icons[].src` / `start_url` (no leading `/`) so paths resolve under the subpath.

---

## BibTeX & bibliographies

**Classic BibTeX in the browser** requires BusyTeX assets on the deployment (`pnpm run download-busytex`). SwiftLaTeX alone does not run bibtex8.

**`cleveref` (`\cref` / `\Cref`) errors** (e.g. `Extra \endcsname`) can appear in some BusyTeX runs. The `Chinese-biblatex` example in this repo maps `\cref/\Cref` to `\autoref` when `\BUSYTEX` is defined; local TeX keeps native `cleveref`.

**biblatex with `backend=bibtex` (BusyTeX bibtex8):** provide **`sortname`** for non-Latin author names to stabilize hashing. Example: `author = {{周志华}}, sortname = {Zhou, Zhihua}`.

**Bilingual sample project:** [`examples/bibtex-metapost-english-chinese/`](../../examples/bibtex-metapost-english-chinese/README.md) — clone via welcome screen preset or `https://github.com/vanabel/texbrain.git`.

---

## BusyTeX: `ctex` with Adobe OTF fonts

On the **BusyTeX (XeLaTeX)** path, you can disable `ctex`’s bundled `fontset` (e.g. `fandol`) and point at local **Adobe OTF** files. Place the fonts next to your main `.tex` (or set `Path` to a dedicated folder) and add to the preamble:

```tex
\documentclass[11pt,a4paper,fontset=none]{ctexart}

\setCJKmainfont[
  BoldFont       = AdobeHeitiStd-Regular.otf,
  ItalicFont     = AdobeKaitiStd-Regular.otf,
  BoldItalicFont = AdobeHeitiStd-Regular.otf
]{AdobeSongStd-Light.otf}

\setCJKsansfont{AdobeHeitiStd-Regular.otf}
\setCJKmonofont{AdobeFangsongStd-Regular.otf}
```

Notes:

- **`fontset=none`** — skips `ctex`’s default CJK font bundle.
- **File names** must match the OTF on disk; absolute paths work.
- **Font directory** — add `Path` with trailing `/` when fonts live in one folder.
- **Engine** — requires **BusyTeX / XeLaTeX**; SwiftLaTeX (pdfTeX) does not use this `fontspec` / `xeCJK` setup.
- **TeXbrain** — copy `.otf` files into the project; no server-side font install.

**ElegantBook sample:** [`Elegantbook-cn/`](../../examples/bibtex-metapost-english-chinese/Elegantbook-cn/) — use `\documentclass[...,cn,nofont,bibtex]{elegantbook}`, `\input{elegantbook-cn-adobe-fonts.tex}`, **XeLaTeX**. BusyTeX WASM often lacks **TeXGyreTermesX** from `newtx`; run `./setup-fonts.sh --latin` into `fonts/` (from system paths such as `.../newtx` and `.../tex-gyre`). Adobe CJK: `./setup-fonts.sh --adobe`. Avoid the `newtx` math class option. Test: `pnpm run test:elegantbook-cn`.

---

## BusyTeX font override (SWUThesis example)

If a template already defines `\youyuan`, `\newCJKfontfamily\youyuan` may fail with *already defined*. Register a new family and remap:

```tex
\usepackage{xeCJK}
\IfFileExists{YouYuan.ttf}{
  \setCJKfamilyfont{yy}{YouYuan.ttf}
  \renewcommand{\youyuan}{\CJKfamily{yy}}
}{
  \typeout{[FONT] YouYuan.ttf not found, keep default \string\youyuan}
}
```

- Does not change `ctex` main fonts — only `\youyuan`.
- Compile with **XeLaTeX** / BusyTeX.
- For `fonts/YouYuan.ttf`: `\setCJKfamilyfont{yy}[Path=./fonts/,Extension=.ttf]{YouYuan}`.

In TeXbrain, use the **SWUThesis** clone preset or branch **`online-texbrain`** (see [Template repos & Git](#template-repos--git) below).

---

## Browser support

Full folder read/write needs the **File System Access API** (Chrome, Edge, Arc, Brave, Opera). Firefox and Safari can use the editor with a virtual FS fallback but not direct folder pickers.

---

## Template repos & Git

Copy-friendly guidance for thesis/class template maintainers:

TeXbrain is **not** a “live-sync to the cloud” editor: edits are saved to the **local project folder you picked** by default. Unless you configure credentials and explicitly **push**, your changes will **not** affect the template repository on GitHub.

Do not treat the **upstream template** as your day-to-day working repo: **fork** it to your account and work on the fork; keep upstream read-only and pull updates when needed.

If you must connect TeXbrain to GitHub in the browser: use a **read-only** token, or a **least-privilege** token; do not grant write access to a shared template repository.

For thesis/class templates: prefer the maintainer’s **`online-texbrain`** branch for browser/TeXbrain compatibility. In TeXbrain, use the **SWUThesis** clone preset, or set **Branch** to `online-texbrain`.

---

## Sidebar references panel

- **Click** citation key or equation number → jump to source line.
- **Ctrl+click** (Windows/Linux) or **⌘+click** (macOS) → insert `\cite{key}` or `\eq{number}` at the cursor.
- Equation list is skipped when the project has more than **120** `.tex` paths (performance guard).

---

## Related docs

- [Technical guide](technical.md)
- [Deployment](deployment.md)
- [Main README](../../README.md)
