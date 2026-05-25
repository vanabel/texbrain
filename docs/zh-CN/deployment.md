<p align="right"><a href="../README.zh-CN.md">文档索引</a> · <a href="../../README.zh-CN.md">主 README</a> · <a href="../en/deployment.md">English</a></p>

# 部署

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

大文件从 GitHub 拉取可能超时；升级 `@vanabel/texlyre-busytex` 后可在**已设置代理的终端**执行 `pnpm run download-busytex:force`（检测到 `HTTPS_PROXY` / `ALL_PROXY` 等且系统有 `curl` 时会用 **curl**，可走 zsh 里的 `enable_proxy` 等 SOCKS5）。也可设置 `BUSYTEX_USE_CURL=1` 强制 curl。

若不执行此步，SwiftLaTeX 仍可编译；经典 BibTeX 引用解析则依赖上述资源。`static/busytex/` 默认已 gitignore；线上需要 BusyTeX 时请在本地或 CI 构建前执行。

---

## 部署到 GitHub Pages

工作流见 `.github/workflows/deploy.yml`。**请先完成第 1 步**：启用 Pages 并将来源设为 **GitHub Actions**，否则创建部署时会 **404 / Not Found**。

1. **Pages（必做）：** **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions** 并保存。若此前为 **Deploy from a branch**，请改为 **GitHub Actions**（同一时间只能一种来源）。保存后在 **Actions** 中对失败运行 **Re-run all jobs**，或使用 **workflow_dispatch**。

2. **Settings → Secrets and variables → Actions → Variables**（建议配置，以便 canonical URL 与站点一致）：
   - **`PUBLIC_SITE_ORIGIN`**：公网 origin（仅协议 + 主机，**无**末尾斜杠）。
   - **`BASE_PATH`**：子路径站点填 `/仓库名`；根路径或自定义域根站点**留空**。
   - **`VITE_PDF_VIEWER`**（可选）：填 `pdfjs` 时生产环境使用 pdf.js（预览栏 SyncTeX）。见 [常见问题 — PDF.js](faq.md#pdfjs-生产预览)。
   - **`VITE_PDFJS_LOCAL_PDF_ASSETS`**（可选）：`1` / `true` / `yes` 时不从 jsDelivr 拉 cmap / 标准字体。
   - **`VITE_PDFJS_CMAP_URL`** / **`VITE_PDFJS_STANDARD_FONT_URL`**（可选）：自定义字体资源基址。
   - **`VITE_PDF_DISABLE_FONT_FACE`**（可选）：`true` 时强制非 `FontFace` 渲染路径。

   **定义位置：** build 任务使用 `${{ vars.* }}` 且**未**绑定 `environment: github-pages`，变量须写在仓库/组织的 **Actions → Variables**。**仅**写在 **Environments → github-pages** 下的变量**不会**传给 `pnpm build`。`PUBLIC_SITE_ORIGIN` 来自 **vars（非 secrets）**；勿对同名项同时配置 Secret 与 Variable。

3. 可选：修改 `static/sitemap.xml`、`static/robots.txt` 中的 URL。

4. **BusyTeX：** 工作流在 **`pnpm build` 前**执行 `pnpm run download-busytex:force`（`BUSYTEX_USE_CURL=1`），并对 `static/busytex` 按 `pnpm-lock.yaml` 做 Actions 缓存；用 shell `test -f` 判断是否下载；若无 `busytex.js` 则**失败**以防空目录发布。

   **排查：** 见 [常见问题 — GitHub Pages 与 BusyTeX](faq.md#github-pages-与-busytex)。

---

## PM2 部署

```bash
pnpm build
pnpm pm2:start
```

`serve` 已在 `devDependencies` 中，NAS 上**无需**再 `pnpm add -D serve`；先 `pnpm install`。

默认端口 `4173`（`ecosystem.config.cjs`）。自定义端口：

```bash
PORT=8080 pnpm pm2:restart
```

```bash
pnpm pm2:logs
pnpm pm2:stop
pnpm pm2:delete
```

开机自启：`pm2 save` 与 `pm2 startup`。

预览栏 **SyncTeX** 需先 `VITE_PDF_VIEWER=pdfjs pnpm build`（见 [常见问题](faq.md#synctex编辑器--pdf)）。

`pnpm pm2:start` 会同时启动 **静态站点**（`texbrain`，默认端口 `4173`）与 **Git CORS 代理**（`texbrain-cors-proxy`，默认端口 `9999`）。若不需要浏览器内 Push/Pull，可在 `ecosystem.config.cjs` 中删除 `texbrain-cors-proxy` 条目，或 `pm2 delete texbrain-cors-proxy`。

### 静态部署：CTAN 同源代理（编译缺 `.sty` / `.cls`）

编译时若日志出现 `File 'xxx.sty' not found`，TeXbrain 会从 CTAN 拉包并重试。浏览器**不能**跨域直连 `ctan.org`；**Git CORS 代理**（`git-cors.vanabel.cn`、`cors.isomorphic-git.org`）**仅用于 Git**，对 CTAN 会返回 **403**，勿用于拉包。

在 **TeXbrain 主站同一 origin**（例如 `https://tex.vanabel.cn`）上配置反向代理，路径与 `vite.config.ts` 中开发代理一致（`ctan-download.ts` 会优先请求这些 URL）：

| 路径前缀 | 上游（示例） |
| --- | --- |
| `/__texbrain_ctan_json/` | `https://www.ctan.org/` |
| `/__texbrain_ctan_ustc/` | `https://mirrors.ustc.edu.cn/`（含 `/CTAN/...`） |
| `/__texbrain_ctan_tsinghua/` | `https://mirrors.tuna.tsinghua.edu.cn/` |

#### cloudflared + NAS 单端口（常见）

公网只暴露 **一个** tunnel 入口即可，**不必**在 Cloudflare 控制台为 CTAN 单独加规则或子域名。

```text
浏览器 → Cloudflare (tex.vanabel.cn)
      → cloudflared tunnel
      → NAS 192.168.x.x:19003   ← Nginx（或其它反代）监听
            ├─ /__texbrain_ctan_json/     → www.ctan.org
            ├─ /__texbrain_ctan_ustc/      → USTC 镜像
            ├─ /__texbrain_ctan_tsinghua/ → 清华镜像
            └─ /                         → TeXbrain PM2（如 127.0.0.1:19903）
```

**cloudflared** `ingress` 示例（概念上，按你实际配置文件调整）：

```yaml
ingress:
  - hostname: tex.vanabel.cn
    service: http://192.168.8.38:19003
  - service: http_status:404
```

三个 `location` 写在 **监听 `19003` 的 Nginx** 上，而不是写在 cloudflared 里。PM2 默认 `PORT=19903`（见 `ecosystem.config.cjs`），由 Nginx `location /` 转发。

**Nginx 完整示例**（`listen 19003`；TeXbrain 后端端口按本机修改）：

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

**不要**把 `https://tex.vanabel.cn/__texbrain_ctan_*` 指到 `git-cors` 子域；Git 代理仅用于 Push/Pull。

**自检（必须看响应体，不能只看状态码）：**

```bash
curl -sS "https://tex.vanabel.cn/__texbrain_ctan_json/json/2.0/pkg/extarrows" | head -c 120
```

应看到 **`{"id":"extarrows"`** 等 JSON。若出现 **`<!doctype html>`**，说明请求落到了 TeXbrain 的 SPA 回退（常见于仅用 `serve -s` 且无 Nginx CTAN 路由）。处理：

- **推荐：** `pnpm pm2:restart` 使用本仓库默认的 `serve:prod`（`scripts/serve-prod-ctan.mjs`，内置 CTAN 代理）；或
- 在 Nginx 上对 CTAN 路径使用 **`^~`** 优先匹配（见下），再 `proxy_pass` 到上游。

```nginx
location ^~ /__texbrain_ctan_json/ { ... }
location ^~ /__texbrain_ctan_ustc/ { ... }
location ^~ /__texbrain_ctan_tsinghua/ { ... }
```

**cloudflared 直连 PM2 端口时：** tunnel 指向的进程必须是 `serve:prod`（含 CTAN 代理），**不要**单独用 `serve:prod:spa-only`（即 `serve -s`）。若 tunnel → `19003` Nginx → `19903` PM2，则 Nginx 与 PM2 至少一侧要提供 CTAN 路径（二选一，避免重复代理）。

本机 `pnpm dev` / `pnpm preview` 由 Vite 自动提供上述路径，无需 Nginx。说明见 [常见问题 — CTAN 自动拉包](faq.md#ctan-自动拉包缺-sty--cls)。

### 可选：自建 Git CORS 代理（浏览器 Push/Pull）

浏览器里的 Git（isomorphic-git）无法直接访问 GitHub，需要 CORS 代理。公共地址 `https://cors.isomorphic-git.org` 在部分网络不可用；本仓库已包含 [`@isomorphic-git/cors-proxy`](https://github.com/isomorphic-git/cors-proxy)（`devDependencies`），可由 PM2 在 NAS 上同机运行。

**架构示例（cloudflared + 自家域名）：**

| 服务 | 本机端口 | 公网 URL（示例） |
| --- | --- | --- |
| TeXbrain 静态站 | `4173` | `https://tex.vanabel.cn` |
| Git CORS 代理 | `9999` | `https://git-cors.vanabel.cn` |

1. **安装依赖并构建**（与上文 PM2 部署相同）：`pnpm install`、`pnpm build`。

2. **环境变量（可选，覆盖 `ecosystem.config.cjs` 默认值）：**

   ```bash
   export GIT_CORS_ALLOW_ORIGIN=https://tex.vanabel.cn   # 与浏览器地址栏 origin 完全一致
   export GIT_CORS_PROXY_PORT=9999
   pnpm pm2:start
   ```

   `GIT_CORS_ALLOW_ORIGIN` 必须等于用户打开 TeXbrain 的 **协议 + 主机 + 端口**（无末尾 `/`）。本地调试可设为 `http://localhost:5173`。PM2 使用前台命令 `cors-proxy run`（勿用 `start`，后者会再 fork 守护进程）。

3. **cloudflared（或反向代理）** 为 CORS 代理增加一条公网入口，将 `git-cors.vanabel.cn`（示例）指到 NAS `127.0.0.1:9999`。TeXbrain 主站 `tex.vanabel.cn` 仍指到 `4173`（或你现有的 ingress）。

4. **在 TeXbrain 界面配置：** 打开 `https://tex.vanabel.cn` → **Git** → **Remote** → **CORS Proxy** 填 `https://git-cors.vanabel.cn`（**不要**末尾斜杠），**仅用于 Git Push/Pull**。CTAN 拉包请配置上文 [CTAN 同源代理](#静态部署ctan-同源代理编译缺-sty--cls)。同时配置 remote URL 与 GitHub PAT（公开库 push 建议 `public_repo` scope）。

5. **自检：**

   ```bash
   pnpm pm2:logs:cors
   curl -sS -o /dev/null -w "%{http_code}\n" \
     "https://git-cors.vanabel.cn/github.com/octocat/Hello-World.git/info/refs?service=git-upload-pack"
   ```

   返回非 `000` 即说明隧道与代理大致可达（`401` 等亦可能表示代理在工作）。

**仅本地试跑代理（不用 PM2）：**

```bash
ALLOW_ORIGIN=http://localhost:5173 pnpm run serve:cors-proxy
```

然后在 TeXbrain **Remote → CORS Proxy** 填 `http://127.0.0.1:9999`。

**安全：** 勿将 `ALLOW_ORIGIN` 设为 `*`；代理仅应服务于你自己的 TeXbrain 站点。PAT 仍只存在浏览器 `localStorage`。

---

## 在 NAS 上更新部署

常见为 **git 克隆** + **`pnpm build`** + **PM2** 托管 `build/`（同 [PM2 部署](#pm2-部署)）。

1. SSH 到项目根目录。
2. `git fetch origin && git checkout main && git pull origin main`（按实际分支调整）。
3. `pnpm install`
4. 需要 BusyTeX 且资源有变或缺失时：`pnpm run download-busytex`
5. `pnpm build`；要预览 SyncTeX 用 `VITE_PDF_VIEWER=pdfjs pnpm build`
6. `pnpm pm2:restart`（会重启静态站与 CORS 代理；或 `PORT=8080 pnpm pm2:restart` 仅影响 `texbrain` 端口）
7. 若走 Cloudflare 且更新了 BusyTeX：见下文 [Cloudflare 缓存清理](#cloudflare-缓存清理busytex)
8. 浏览器 **强制刷新**

无数据库或服务端迁移，仅为静态文件 + 可选 `static/busytex/`。

---

## Cloudflare 缓存清理（BusyTeX）

**何时清：** 更新了 `static/busytex/` 且站点走 **Cloudflare 橙色云** 时，边缘可能仍返回旧 WASM/JS。仅更新前端 `build/` 时也可能需按 URL 清理或等 TTL。

**方式一：控制台** — [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Caching** → **Configuration** → **Purge Cache**（按 URL 或 **Purge Everything**）。

**方式二：API** — 需 **Zone ID** 与 **Cache Purge** 权限的 Token；将脚本中 `https://tex.vanabel.cn/...` 换成你的公网域名。

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

返回 `"success": true` 后建议浏览器强制刷新。

---

## 相关文档

- [技术说明](technical.md)
- [常见问题](faq.md)
- [主 README](../../README.zh-CN.md)
