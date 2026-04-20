#!/usr/bin/env bash
# Link ./active -> Chinese-bibtex / Chinese-biblatex / English-bibtex.
# Usage: ./switch.sh chinese | ./switch.sh chinese-biblatex | ./switch.sh english
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

mode="${1:-}"
case "$mode" in
  chinese|zh|cn)
    target="Chinese-bibtex"
    ;;
  chinese-biblatex|zh-biblatex|cn-biblatex)
    target="Chinese-biblatex"
    ;;
  english|en)
    target="English-bibtex"
    ;;
  *)
    echo "Usage: $0 {chinese|chinese-biblatex|english}" >&2
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
