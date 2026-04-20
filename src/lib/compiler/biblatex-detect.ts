/**
 * Detect biblatex bibliography usage by the commands that actually drive
 * biblatex (not by `\\usepackage{biblatex}` alone).
 *
 * Callers join **all** text sources in the compile `files` map (e.g. `.tex`,
 * `.cls`, `.sty`). Typical split (swuthesis): `\\RequirePackage[...,backend=bibtex,...]{biblatex}`
 * lives in `swuthesis.cls`, while `\\addbibresource` / `\\printbibliography` live in
 * `swuthesis-main.tex` — both must be included in that map after
 * `sliceProjectToCompileRoot` (ancestor `.cls` / `.sty` are merged in for detection).
 */

/** `\addbibresource{...}` or `\addbibresource[...]{...}` (optional args may span lines). */
const RE_ADD_BIB_RESOURCE = /\\addbibresource(?:\s*\[[\s\S]*?\])?\s*\{/i;

/** `\printbibliography` / `\printbibliography[...]` (avoid matching `\\printbibliographyheading` etc.). */
const RE_PRINT_BIBLIOGRAPHY = /\\printbibliography\b(?:\s*\[[\s\S]*?\])?/i;

export function projectUsesBiblatexBibliography(allSourcesJoined: string): boolean {
  return (
    RE_ADD_BIB_RESOURCE.test(allSourcesJoined) || RE_PRINT_BIBLIOGRAPHY.test(allSourcesJoined)
  );
}
