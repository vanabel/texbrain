#!/usr/bin/env bash
# Copy Adobe CJK + Latin (TeXGyreTermesX / texgyreheros) OTFs into ./fonts/
# and optional LaTeX deps (bbding, adforn) for elegantbook under BusyTeX / TeXbrain.
#
# Usage:
#   ./setup-fonts.sh              # Adobe CJK only (needs FONTS_SRC or files in cwd)
#   ./setup-fonts.sh --latin      # Latin fonts from system TeX Live (for BusyTeX)
#   ./setup-fonts.sh --latex      # bbding + adforn into project root
#   ./setup-fonts.sh --all        # latin + latex deps + adobe
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
DEST="$ROOT/fonts"
MODE="${1:-adobe}"

mkdir -p "$DEST"

copy_one() {
  local name="$1"
  shift
  local dir
  for dir in "$@"; do
    [[ -z "$dir" || ! -d "$dir" ]] && continue
    if [[ -f "$dir/$name" ]]; then
      cp -f "$dir/$name" "$DEST/"
      echo "copied $name  (from $dir)"
      return 0
    fi
  done
  echo "Missing: $name (searched: $*)" >&2
  return 1
}

copy_latex_deps() {
  local tl_roots=()
  if [[ -n "${TEXLIVE_ROOT:-}" ]]; then
    tl_roots+=("$TEXLIVE_ROOT/texmf-dist")
  fi
  for y in 2026 2025 2024 2023; do
    tl_roots+=("/usr/local/texlive/$y/texmf-dist")
  done
  tl_roots+=("/usr/share/texmf")

  local root bbding_dir adforn_dir

  bbding_dir=""
  for root in "${tl_roots[@]}"; do
    [[ -f "$root/tex/latex/bbding/bbding.sty" ]] && bbding_dir="$root/tex/latex/bbding" && break
  done
  if [[ -n "$bbding_dir" ]]; then
    cp -f "$bbding_dir/bbding.sty" "$ROOT/"
    cp -f "$bbding_dir/Uding.fd" "$ROOT/"
    echo "copied bbding.sty, Uding.fd"
    for root in "${tl_roots[@]}"; do
      if [[ -f "$root/fonts/type1/public/niceframe-type1/bbding10.pfb" ]]; then
        cp -f "$root/fonts/type1/public/niceframe-type1/bbding10.pfb" "$ROOT/"
        echo "copied bbding10.pfb"
        break
      fi
    done
  else
    echo "bbding.sty not found; elegantbook uses pifont fallbacks" >&2
  fi

  adforn_dir=""
  for root in "${tl_roots[@]}"; do
    [[ -f "$root/tex/latex/adforn/adforn.sty" ]] && adforn_dir="$root/tex/latex/adforn" && break
  done
  if [[ -n "$adforn_dir" ]]; then
    cp -f "$adforn_dir/adforn.sty" "$ROOT/"
    cp -f "$adforn_dir/uornementsadf.fd" "$ROOT/"
    echo "copied adforn.sty, uornementsadf.fd"
    for root in "${tl_roots[@]}"; do
      if [[ -f "$root/tex/latex/svn-prov/svn-prov.sty" ]]; then
        cp -f "$root/tex/latex/svn-prov/svn-prov.sty" "$ROOT/"
        echo "copied svn-prov.sty"
        break
      fi
    done
    for root in "${tl_roots[@]}"; do
      if [[ -f "$root/fonts/type1/arkandis/adforn/OrnementsADF.pfb" ]]; then
        cp -f "$root/fonts/type1/arkandis/adforn/OrnementsADF.pfb" "$ROOT/"
        echo "copied OrnementsADF.pfb"
        break
      fi
    done
  else
    echo "adforn.sty not found; elegantbook uses rule fallbacks for flourishes" >&2
  fi
}

copy_latin() {
  local tl_roots=()
  if [[ -n "${TEXLIVE_ROOT:-}" ]]; then
    tl_roots+=("$TEXLIVE_ROOT/texmf-dist/fonts/opentype/public")
  fi
  for y in 2026 2025 2024 2023; do
    tl_roots+=("/usr/local/texlive/$y/texmf-dist/fonts/opentype/public")
  done
  tl_roots+=("/usr/share/texmf/fonts/opentype/public")

  local newtx_dirs=()
  local gyre_dirs=()
  [[ -n "${NEWTX_SRC:-}" ]] && newtx_dirs+=("$NEWTX_SRC")
  [[ -n "${TEXGYRE_SRC:-}" ]] && gyre_dirs+=("$TEXGYRE_SRC")
  for base in "${tl_roots[@]}"; do
    newtx_dirs+=("$base/newtx")
    gyre_dirs+=("$base/tex-gyre")
  done

  local missing=0
  copy_one TeXGyreTermesX-Regular.otf "${newtx_dirs[@]}" || missing=1
  copy_one TeXGyreTermesX-Bold.otf "${newtx_dirs[@]}" || missing=1
  copy_one TeXGyreTermesX-Slanted.otf "${newtx_dirs[@]}" || missing=1
  copy_one TeXGyreTermesX-BoldSlanted.otf "${newtx_dirs[@]}" 2>/dev/null || {
    if [[ -f "$DEST/TeXGyreTermesX-Bold.otf" ]]; then
      cp -f "$DEST/TeXGyreTermesX-Bold.otf" "$DEST/TeXGyreTermesX-BoldSlanted.otf"
      echo "copied TeXGyreTermesX-BoldSlanted.otf  (copy from Bold — BoldSlanted not in TL)"
    else
      missing=1
    fi
  }
  copy_one texgyreheros-regular.otf "${gyre_dirs[@]}" || missing=1
  copy_one texgyreheros-bold.otf "${gyre_dirs[@]}" || missing=1
  copy_one texgyreheros-italic.otf "${gyre_dirs[@]}" || missing=1
  copy_one texgyreheros-bolditalic.otf "${gyre_dirs[@]}" || missing=1

  if [[ "$missing" -ne 0 ]]; then
    echo >&2
    echo "Could not find all Latin OTFs. Install texlive-fonts-extra (newtx) and tex-gyre, or set:" >&2
    echo "  NEWTX_SRC=/path/to/newtx  TEXGYRE_SRC=/path/to/tex-gyre" >&2
    exit 1
  fi
}

copy_adobe() {
  local SRC="${FONTS_SRC:-$ROOT}"
  local names=(
    AdobeSongStd-Light.otf
    AdobeHeitiStd-Regular.otf
    AdobeKaitiStd-Regular.otf
    AdobeFangsongStd-Regular.otf
  )
  for f in "${names[@]}"; do
    if [[ ! -f "$SRC/$f" ]]; then
      echo "Missing Adobe font: $SRC/$f" >&2
      echo "Set FONTS_SRC to the directory that contains the Adobe OTF files." >&2
      exit 1
    fi
    cp -f "$SRC/$f" "$DEST/"
    echo "copied $f"
  done
}

case "$MODE" in
  --latin|latin)
    copy_latin
    ;;
  --latex|latex)
    copy_latex_deps
    ;;
  --all|all)
    copy_latin
    copy_latex_deps
    copy_adobe
    ;;
  --adobe|adobe|"")
    copy_adobe
    ;;
  *)
    echo "Usage: $0 [--latin | --latex | --adobe | --all]" >&2
    exit 1
    ;;
esac

echo "Done ($MODE)."
