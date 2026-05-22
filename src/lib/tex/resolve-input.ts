/** Resolve `\\input` / `\\include` path to a project-relative .tex path. */
export function resolveInputPath(
  raw: string,
  fromFile: string,
  projectFiles: Map<string, string>
): string | null {
  let base = raw.trim().replace(/^\.\/+/, '');
  if (!base) return null;
  const withExt = base.toLowerCase().endsWith('.tex') || base.toLowerCase().endsWith('.ltx')
    ? base
    : `${base}.tex`;

  const dir = fromFile.includes('/') ? fromFile.slice(0, fromFile.lastIndexOf('/')) : '';
  const candidates: string[] = [];
  if (dir) candidates.push(`${dir}/${withExt}`);
  candidates.push(withExt);

  const keys = [...projectFiles.keys()];
  for (const c of candidates) {
    if (projectFiles.has(c)) return c;
  }
  for (const key of keys) {
    if (key === withExt || key.endsWith(`/${withExt}`)) return key;
  }
  return null;
}
