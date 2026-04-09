/** Normalize to forward slashes and trim. */
export function normalizeProjectPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\/+/, '').trim();
}

/**
 * Strip identical leading directory segments from two paths (for side-by-side display).
 */
export function stripSharedDirPrefix(a: string, b: string): [string, string] {
  const pa = normalizeProjectPath(a).split('/').filter(Boolean);
  const pb = normalizeProjectPath(b).split('/').filter(Boolean);
  let i = 0;
  while (i < pa.length && i < pb.length && pa[i] === pb[i]) i++;
  const ra = pa.slice(i).join('/');
  const rb = pb.slice(i).join('/');
  return [ra || pa.join('/') || a, rb || pb.join('/') || b];
}

/**
 * Shorten a project-root-relative path for the status bar: keep at most the last `maxSeg` segments,
 * prefix with `…/` if truncated.
 */
export function compactProjectPath(path: string, maxSeg = 2): string {
  const n = normalizeProjectPath(path);
  if (!n) return '';
  const parts = n.split('/').filter(Boolean);
  if (parts.length <= maxSeg) return n;
  return '…/' + parts.slice(-maxSeg).join('/');
}

export type EntryTargetLabels = {
  entry: string;
  target: string;
  merged: string;
};

/**
 * One-line summary for status bar: avoids duplicating identical paths; compresses long paths.
 */
export function formatEntryTargetLine(
  entryPath: string,
  compileTarget: string,
  L: EntryTargetLabels
): { line: string; title: string } {
  const e = entryPath.trim();
  const t = compileTarget.trim();
  if (!e && !t) return { line: '', title: '' };

  const ne = e ? normalizeProjectPath(e) : '';
  const nt = t ? normalizeProjectPath(t) : '';

  const titleParts: string[] = [];
  if (e) titleParts.push(`${L.entry} ${e}`);
  if (t) titleParts.push(`${L.target} ${t}`);
  const title = titleParts.join('\n');

  if (e && !t) {
    return { line: `${L.entry} ${compactProjectPath(ne)}`, title };
  }
  if (!e && t) {
    return { line: `${L.target} ${compactProjectPath(nt)}`, title };
  }

  if (ne === nt) {
    return { line: `${L.merged} ${compactProjectPath(ne)}`, title };
  }

  const [se, st] = stripSharedDirPrefix(e, t);
  return {
    line: `${L.entry} ${compactProjectPath(se)} · ${L.target} ${compactProjectPath(st)}`,
    title
  };
}
