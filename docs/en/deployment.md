<p align="right"><a href="../README.md">Docs index</a> · <a href="../../README.md">Main README</a> · <a href="../zh-CN/deployment.md">中文</a></p>

# Deployment

## Running locally

```bash
git clone https://github.com/vanabel/texbrain.git
cd texbrain
pnpm install
pnpm exec svelte-kit sync
pnpm dev
```

Open **http://localhost:5173** in Chrome or Edge.

### Optional: BusyTeX assets (BibTeX / XeLaTeX)

For how SwiftLaTeX and BusyTeX split work, see [FAQ — Two compile engines](faq.md#two-compile-engines-swiftlatex--busytex). `pnpm install` adds the **npm package** only. The **~175 MB** WASM / TeX Live bundle is **not** in the tarball — it is downloaded from [texlyre-busytex releases](https://github.com/TeXlyre/texlyre-busytex) into `static/busytex/`:

```bash
pnpm run download-busytex
```

Large downloads from GitHub may time out. After upgrading `@vanabel/texlyre-busytex`, refresh WASM with `pnpm run download-busytex:force` in a shell where **proxy env vars are already set** (e.g. your zsh `enable_proxy`); when `HTTPS_PROXY` / `ALL_PROXY` / `HTTP_PROXY` is set and `curl` exists, the script uses **curl** (proxy-aware, including SOCKS5). Set `BUSYTEX_USE_CURL=1` to force curl.

Without it, SwiftLaTeX still works; classic BibTeX citation resolution needs this step. `static/busytex/` is gitignored — run locally or in CI before deploy if the hosted site should use BusyTeX.

---

## Deploying to GitHub Pages

The included workflow (`.github/workflows/deploy.yml`) builds and publishes the `build/` folder. **Do this first:** enable Pages and choose **GitHub Actions** as the source, or the deploy job fails with **404 / Not Found** when creating the deployment.

1. **Pages (required):** Repository **Settings → Pages → Build and deployment → Source: GitHub Actions**. Save. If you previously used **Deploy from a branch**, switch to **GitHub Actions** (only one source applies). Then re-run the workflow (Actions tab → failed run → **Re-run all jobs**, or **workflow_dispatch** if available).

2. **GitHub repository → Settings → Secrets and variables → Actions → Variables** (or **Repository variables**) — optional but recommended so canonical URLs match your site:
   - **`PUBLIC_SITE_ORIGIN`** — Scheme + host only, **no trailing slash**, e.g. `https://yourname.github.io` for GitHub-hosted sites, or `https://tex.example.com` for a custom domain at the site root.
   - **`BASE_PATH`** — If the app is served under a subpath (typical GitHub **project** Pages: `https://yourname.github.io/repo-name/`), set `BASE_PATH` to `/repo-name` (leading slash). For a **user/org** site at the domain root or a custom domain with no subpath, leave **`BASE_PATH` unset** or empty.
   - **`VITE_PDF_VIEWER`** (optional) — Set to `pdfjs` if you want the production preview to use pdf.js (SyncTeX in the preview pane); omit for the default native PDF viewer. See [FAQ — PDF.js production preview](faq.md#pdfjs-production-preview).
   - **`VITE_PDFJS_LOCAL_PDF_ASSETS`** (optional) — Set to `1` / `true` / `yes` if the build must **not** fetch cmap / standard fonts from jsDelivr (offline or strict CSP).
   - **`VITE_PDFJS_CMAP_URL`** / **`VITE_PDFJS_STANDARD_FONT_URL`** (optional) — Override cmap / standard-font base URLs.
   - **`VITE_PDF_DISABLE_FONT_FACE`** (optional) — Set to `true` to force pdf.js’s non–`FontFace` rendering path.

   **Where to define them:** The workflow’s **build** job uses `${{ vars.* }}` but does **not** attach to the `github-pages` **environment**, so these values must live under **Actions → Variables** at **repository** (or organization) scope. Variables defined **only** under **Settings → Environments → github-pages** are **not** visible to `pnpm build`. The workflow reads `PUBLIC_SITE_ORIGIN` from **`vars` only** (not `secrets`); use a **repository variable** for that public URL — avoid duplicating the same name as both a secret and a variable.

3. Optional: edit `static/sitemap.xml` and `static/robots.txt` so `Sitemap:` and `<loc>` match your public URL.

4. **BusyTeX** (BibTeX in the browser): the workflow **downloads assets before `pnpm build`** (`pnpm run download-busytex:force` with `BUSYTEX_USE_CURL=1` for curl + retries — same files as `download-busytex`), with an **Actions cache** on `static/busytex` keyed by `pnpm-lock.yaml` so unchanged lockfiles skip the ~175 MB download. A **shell `test -f`** gate (not `hashFiles` on gitignored paths) decides whether to download; the next step **fails the job** if `busytex.js` is still missing. To ship without BusyTeX, remove or gate those steps in your fork.

   **Troubleshooting (project Pages):** see [FAQ — GitHub Pages & BusyTeX](faq.md#github-pages--busytex).

---

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

For **SyncTeX in the PDF preview**, build with `VITE_PDF_VIEWER=pdfjs pnpm build` before `pnpm pm2:start` (see [FAQ](faq.md#synctex-editor--pdf)).

`pnpm pm2:start` starts both the **static site** (`texbrain`, default port `4173`) and the **Git CORS proxy** (`texbrain-cors-proxy`, default port `9999`). Remove the `texbrain-cors-proxy` app from `ecosystem.config.cjs` if you do not need in-browser push/pull.

### Static deploy: same-origin CTAN proxy (missing `.sty` / `.cls`)

When a compile log reports `File 'xxx.sty' not found`, TeXbrain may fetch from CTAN and retry. Browsers cannot call `ctan.org` cross-origin from your site. **Git CORS proxies** (`git-cors.*`, `cors.isomorphic-git.org`) are **git-only** and return **403** for CTAN URLs — do not use them for package download.

Expose these paths on the **same origin** as TeXbrain (e.g. `https://tex.vanabel.cn`), matching `vite.config.ts` dev routes (`ctan-download.ts` tries them first):

| Path prefix | Upstream (example) |
| --- | --- |
| `/__texbrain_ctan_json/` | `https://www.ctan.org/` |
| `/__texbrain_ctan_ustc/` | `https://mirrors.ustc.edu.cn/` |
| `/__texbrain_ctan_tsinghua/` | `https://mirrors.tuna.tsinghua.edu.cn/` |

#### cloudflared + single NAS port (typical)

Expose **one** tunnel hostname to your NAS. You do **not** add separate Cloudflare rules or hostnames for CTAN.

```text
Browser → Cloudflare (tex.example.com)
       → cloudflared tunnel
       → NAS 192.168.x.x:19003   ← Nginx (or similar) listens here
             ├─ /__texbrain_ctan_json/     → www.ctan.org
             ├─ /__texbrain_ctan_ustc/      → USTC mirror
             ├─ /__texbrain_ctan_tsinghua/ → Tsinghua mirror
             └─ /                         → TeXbrain PM2 (e.g. 127.0.0.1:19903)
```

**cloudflared** `ingress` (adjust to your config file):

```yaml
ingress:
  - hostname: tex.vanabel.cn
    service: http://192.168.8.38:19003
  - service: http_status:404
```

Put the three `location` blocks on **Nginx listening on `19003`**, not inside cloudflared. PM2 defaults to `PORT=19903` (`ecosystem.config.cjs`); Nginx `location /` forwards there.

**Full Nginx example** (`listen 19003`; change the TeXbrain backend port if needed):

```nginx
server {
  listen 19003;
  server_name _;

  location ^~ /__texbrain_ctan_json/ {
    proxy_pass https://www.ctan.org/;
    proxy_ssl_server_name on;
    proxy_set_header Host www.ctan.org;
  }

  location ^~ /__texbrain_ctan_ustc/ {
    proxy_pass https://mirrors.ustc.edu.cn/;
    proxy_ssl_server_name on;
    proxy_set_header Host mirrors.ustc.edu.cn;
  }

  location ^~ /__texbrain_ctan_tsinghua/ {
    proxy_pass https://mirrors.tuna.tsinghua.edu.cn/;
    proxy_ssl_server_name on;
    proxy_set_header Host mirrors.tuna.tsinghua.edu.cn;
  }

  location / {
    proxy_pass http://127.0.0.1:19903;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
  }
}
```

Do **not** point `https://tex.vanabel.cn/__texbrain_ctan_*` at the `git-cors` host; that proxy is git-only.

**Smoke test (check the body, not only the status code):**

```bash
curl -sS "https://tex.vanabel.cn/__texbrain_ctan_json/json/2.0/pkg/extarrows" | head -c 120
```

Expect JSON starting with **`{"id":"extarrows"`**. If you see **`<!doctype html>`**, the request hit the TeXbrain SPA fallback (`serve -s` without CTAN routes). Fix:

- **Recommended:** `pnpm pm2:restart` so PM2 runs `serve:prod` (`scripts/serve-prod-ctan.mjs`, built-in CTAN proxy), or
- Use Nginx **`^~`** locations for CTAN paths (below) before the static `location /`.

```nginx
location ^~ /__texbrain_ctan_json/ { ... }
location ^~ /__texbrain_ctan_ustc/ { ... }
location ^~ /__texbrain_ctan_tsinghua/ { ... }
```

**cloudflared → PM2 directly:** the tunnel must target `serve:prod` (`serve-prod-ctan.mjs`, CTAN proxy + correct `.mjs` MIME), not `serve:prod:spa-only` (`serve -s`). **cloudflared → Nginx :19003 → PM2 :19903:** configure CTAN on Nginx **or** on PM2, not both in conflicting ways.

**pdf.js preview:** if the console reports `pdf.worker.*.mjs` with MIME `application/octet-stream`, the static host is not serving `.mjs` as JavaScript — use this repo’s `serve:prod` or add Nginx `types { application/javascript mjs; }`.

`pnpm dev` / `pnpm preview` on localhost use Vite’s built-in proxies. See [FAQ — CTAN auto-fetch](faq.md#ctan-auto-fetch-missing-packages).

### Optional: self-hosted Git CORS proxy

Browser Git (isomorphic-git) cannot talk to GitHub directly; it needs a CORS proxy. This repo ships [`@isomorphic-git/cors-proxy`](https://github.com/isomorphic-git/cors-proxy) as a devDependency and runs it via PM2.

Example (cloudflared + custom domain):

| Service | Local port | Public URL (example) |
| --- | --- | --- |
| TeXbrain static | `4173` | `https://tex.vanabel.cn` |
| CORS proxy | `9999` | `https://git-cors.vanabel.cn` |

1. `pnpm install`, `pnpm build`, then `pnpm pm2:start`.
2. Optional overrides before start: `GIT_CORS_ALLOW_ORIGIN=https://tex.vanabel.cn`, `GIT_CORS_PROXY_PORT=9999` (must match the browser origin where users open TeXbrain).
3. Point a second tunnel/ingress (e.g. `git-cors.vanabel.cn`) at `127.0.0.1:9999`.
4. In TeXbrain: **Git → Remote → CORS Proxy** = `https://git-cors.vanabel.cn` (no trailing slash), **for Git push/pull only**. For CTAN, configure [same-origin CTAN routes](#static-deploy-same-origin-ctan-proxy-missing-sty--cls) on the main site.

Local test: `ALLOW_ORIGIN=http://localhost:5173 pnpm run serve:cors-proxy`, then set CORS Proxy to `http://127.0.0.1:9999`.

---

## Updating on a NAS (PM2 static host)

TeXbrain on a NAS is usually a **git clone** + **`pnpm build`** + **PM2** serving the `build/` folder (same as [PM2 deployment](#pm2-deployment) above).

**One-shot (recommended):** from the project root:

```bash
pnpm run update
```

That runs: `git pull` → `pnpm install` → `VITE_PDF_VIEWER=pdfjs pnpm build` → `pnpm pm2:restart` (`scripts/nas-update.sh`). `pnpm build` already defaults to pdf.js; the script sets the env explicitly for clarity.

Manual steps (or when BusyTeX assets changed):

1. **SSH** into the NAS and `cd` to the project directory (the folder that contains `package.json`).
2. **Pull** the latest code: `git fetch origin && git checkout main && git pull origin main` (adjust branch if needed) — or just `pnpm run update`.
3. **Install deps:** `pnpm install`
4. **BusyTeX (if you ship it on the NAS):** `pnpm run download-busytex` — only when `@vanabel/texlyre-busytex` / upstream assets changed, or `static/busytex/` is missing.
5. **Rebuild:** `pnpm build` (already includes `VITE_PDF_VIEWER=pdfjs`).
6. **Restart PM2:** `pnpm pm2:restart` — or `PORT=8080 pnpm pm2:restart` if you override the port.
7. **Reverse proxy / CDN:** if you use Cloudflare and updated BusyTeX, follow [Cloudflare cache purge (BusyTeX)](#cloudflare-cache-purge-busytex).
8. **Browser:** hard refresh so clients load new `/_app/immutable/...` chunks.

No database or server-side migration is required — this app is static files plus optional BusyTeX assets under `static/`.

---

## Cloudflare cache purge (BusyTeX)

**When to purge:** After you deploy new files under `static/busytex/` (WASM / JS / `.data`) and the site is behind **Cloudflare proxy (orange cloud)**, edges may keep serving old objects. After a normal `pnpm build` (SvelteKit `/_app/immutable/…` chunks), aggressive HTML or asset caching can also warrant a targeted purge or waiting for TTL.

**Option A: Dashboard (no scripts)**

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com/) and select your **zone**.
2. **Caching** → **Configuration**.
3. Under **Purge Cache**:
   - **Custom Purge** → **URL**: paste full URLs users hit (including `https://`), e.g. `https://your.domain/busytex/busytex.wasm`, etc. — good for BusyTeX-only updates.
   - **Purge Everything**: clears the whole zone’s edge cache for that site; simplest but increases origin load briefly and evicts unrelated cached assets.

**Option B: API (CI-friendly)**

- **Zone ID**: **Overview** for the zone, right-hand **API** section.
- **API Token**: avatar → **My Profile** → **API Tokens** → **Create Token**. Use template **“Cache Purge - Purge”**, or custom: **Zone** → **Cache Purge** → **Edit**.
- Replace `https://tex.vanabel.cn/...` in the JSON with your **public site origin** (same host users type in the browser). If you also load `busytex_pipeline.js`, `busytex_worker.js`, etc., add those URLs to `files`, or use **purge by prefix** in the dashboard / API `prefixes` (e.g. `https://your.domain/busytex`) to drop everything under that path — confirm exact fields in Cloudflare’s API docs for your plan.

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

---

## Related docs

- [Technical guide](technical.md)
- [FAQ](faq.md)
- [Main README](../../README.md)
