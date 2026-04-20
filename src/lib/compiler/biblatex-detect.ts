/**
 * Detect biblatex bibliography usage by the commands that actually drive
 * biblatex (not by `\\usepackage{biblatex}` alone).
 */

/** `\addbibresource{...}` or `\addbibresource[...]{...}` (optional args may span lines). */
const RE_ADD_BIB_RESOURCE = /\\addbibresource(?:\s*\[[\s\S]*?\])?\s*\{/;

/** `\printbibliography` / `\printbibliography[...]` (avoid matching `\\printbibliographyheading` etc.). */
const RE_PRINT_BIBLIOGRAPHY = /\\printbibliography\b(?:\s*\[[\s\S]*?\])?/;

export function projectUsesBiblatexBibliography(allSourcesJoined: string): boolean {
  return (
    RE_ADD_BIB_RESOURCE.test(allSourcesJoined) || RE_PRINT_BIBLIOGRAPHY.test(allSourcesJoined)
  );
}
