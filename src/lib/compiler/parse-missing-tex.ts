/** LaTeX / pdfTeX log lines for missing inputs (sty, cls, …). */
const RE_FILE_NOT_FOUND = /File [`']([^`']+)[`'] not found/gi;
/** BibTeX: `I couldn't open style file foo.bst` */
const RE_BST_NOT_FOUND = /I couldn't open style file\s+(\S+\.bst)/gi;

const TEX_INPUT_EXT = /\.(sty|cls|clo|cfg|def|fd|ltx|bst)$/i;

function pushUnique(out: string[], seen: Set<string>, name: string) {
  const cleaned = name.trim().replace(/\\/g, '/');
  if (!cleaned || !TEX_INPUT_EXT.test(cleaned)) return;
  const base = cleaned.includes('/') ? cleaned.slice(cleaned.lastIndexOf('/') + 1) : cleaned;
  const key = base.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  out.push(base);
}

/**
 * Collect missing TeX / BibTeX inputs from a compile log (deduped, stable order).
 * Matches e.g. `LaTeX Error: File `physics.sty' not found.`
 * and `I couldn't open style file gbt7714-2025-numerical.bst`.
 */
export function parseMissingTexFilesFromLog(log: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of log.matchAll(RE_FILE_NOT_FOUND)) {
    pushUnique(out, seen, m[1] ?? '');
  }
  for (const m of log.matchAll(RE_BST_NOT_FOUND)) {
    pushUnique(out, seen, m[1] ?? '');
  }
  return out;
}
