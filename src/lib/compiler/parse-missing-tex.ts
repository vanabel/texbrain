/** LaTeX / pdfTeX log lines for missing inputs (sty, cls, …). */
const RE_FILE_NOT_FOUND = /File [`']([^`']+)[`'] not found/gi;

const TEX_INPUT_EXT = /\.(sty|cls|clo|cfg|def|fd|ltx)$/i;

/**
 * Collect missing TeX inputs from a compile log (deduped, stable order).
 * Matches e.g. `LaTeX Error: File `physics.sty' not found.`
 */
export function parseMissingTexFilesFromLog(log: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of log.matchAll(RE_FILE_NOT_FOUND)) {
    const name = m[1]?.trim().replace(/\\/g, '/');
    if (!name || !TEX_INPUT_EXT.test(name)) continue;
    const base = name.includes('/') ? name.slice(name.lastIndexOf('/') + 1) : name;
    const key = base.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(base);
  }
  return out;
}
