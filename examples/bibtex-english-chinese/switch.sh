#!/usr/bin/env bash
# Link ./active -> Chinese-bibtex or English-bibtex for a stable working path.
# Usage: ./switch.sh chinese | ./switch.sh english
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

mode="${1:-}"
case "$mode" in
  chinese|zh|cn)
    target="Chinese-bibtex"
    ;;
  english|en)
    target="English-bibtex"
    ;;
  *)
    echo "Usage: $0 {chinese|english}" >&2
    exit 1
    ;;
esac

if [[ ! -d "$target" ]]; then
  echo "Missing directory: $ROOT/$target" >&2
  exit 1
fi

rm -f active
ln -s "$target" active
echo "active -> $target"
