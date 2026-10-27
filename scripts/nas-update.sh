#!/usr/bin/env bash
# NAS / PM2 host: pull, install, rebuild (pdf.js), restart.
# Usage: pnpm run update
set -euo pipefail

cd "$(dirname "$0")/.."

elapsed() {
  local start=$1
  local label=${2:-}
  local end
  end=$(date +%s)
  local secs=$((end - start))
  if [[ -n "$label" ]]; then
    echo "==> $label (${secs}s)"
  else
    echo "    (${secs}s)"
  fi
}

t0=$(date +%s)

echo "==> git pull"
t=$(date +%s)
git pull
elapsed "$t"

echo "==> pnpm install"
t=$(date +%s)
# CI avoids interactive supply-chain prompts that add tens of seconds on NAS.
CI=true pnpm install --reporter=append-only
elapsed "$t"

echo "==> VITE_PDF_VIEWER=pdfjs pnpm build"
t=$(date +%s)
VITE_PDF_VIEWER=pdfjs pnpm build
elapsed "$t"

echo "==> pnpm pm2:restart"
t=$(date +%s)
pnpm pm2:restart
elapsed "$t"

elapsed "$t0" "total"
echo "==> done"
