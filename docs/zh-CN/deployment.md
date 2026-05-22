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

---

## 在 NAS 上更新部署

常见为 **git 克隆** + **`pnpm build`** + **PM2** 托管 `build/`（同 [PM2 部署](#pm2-部署)）。

1. SSH 到项目根目录。
2. `git fetch origin && git checkout main && git pull origin main`（按实际分支调整）。
3. `pnpm install`
4. 需要 BusyTeX 且资源有变或缺失时：`pnpm run download-busytex`
5. `pnpm build`；要预览 SyncTeX 用 `VITE_PDF_VIEWER=pdfjs pnpm build`
6. `pnpm pm2:restart`（或 `PORT=8080 pnpm pm2:restart`）
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
