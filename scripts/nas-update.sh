#!/usr/bin/env bash
# NAS / PM2 host: pull, install, rebuild (pdf.js), restart.
# Usage: pnpm run update
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> git pull"
git pull

echo "==> pnpm install"
pnpm install

echo "==> VITE_PDF_VIEWER=pdfjs pnpm build"
VITE_PDF_VIEWER=pdfjs pnpm build

echo "==> pnpm pm2:restart"
pnpm pm2:restart

echo "==> done"
