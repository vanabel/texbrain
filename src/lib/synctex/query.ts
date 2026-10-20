import { gunzipSync } from 'fflate';
import { parseSyncTex, type Block, type PdfSyncObject } from './parse-synctex';

function normPath(p: string): string {
  return p
    .replace(/\\/g, '/')
    .replace(/(\r\n|\n|\r)+/g, '')
    .replace(/^\.\/+/, '')
    .replace(/^\/+/, '')
    .trim();
}

function basename(p: string): string {
  const n = normPath(p);
  const i = n.lastIndexOf('/');
  return i >= 0 ? n.slice(i + 1) : n;
}

function isTexLikePath(p: string): boolean {
  return /\.(tex|ltx)$/i.test(normPath(p));
}

/** Variants of a synctex Input: path to try against the project tree. */
function synctexPathCandidates(synctexPath: string): string[] {
  const raw = synctexPath.replace(/(\r\n|\n|\r)+/g, '').trim();
  if (!raw) return [];
  const out = new Set<string>([raw, normPath(raw), basename(raw)]);
  const noDrive = raw.replace(/^[A-Za-z]:[\\/]/, '').replace(/\\/g, '/');
  if (noDrive !== raw) {
    out.add(noDrive);
    out.add(normPath(noDrive));
    out.add(basename(noDrive));
  }
  return [...out].filter(Boolean);
}

/** Longest matching path suffix in segments (e.g. `a/b/c.tex` vs `b/c.tex` → 2). */
function longestPathSuffixSegments(a: string, b: string): number {
  const pa = normPath(a).split('/').filter(Boolean);
  const pb = normPath(b).split('/').filter(Boolean);
  let best = 0;
  for (let i = 1; i <= Math.min(pa.length, pb.length); i++) {
    const sa = pa.slice(-i).join('/');
    const sb = pb.slice(-i).join('/');
    if (sa === sb) best = i;
    else break;
  }
  return best;
}

function scoreSynctexToProject(synctexPath: string, projectPath: string, compileRootDir?: string): number {
  const ns = normPath(synctexPath);
  const p = normPath(projectPath);
  if (!ns || !p) return 0;
  const bs = basename(ns);
  const bp = basename(p);
  const root = compileRootDir ? normPath(compileRootDir) : '';

  let s = 0;
  if (p === ns) s = 1000;
  else if (p.endsWith('/' + ns) || ns.endsWith('/' + p)) s = 650;
  else if (p.endsWith(ns) || ns.endsWith(p)) s = 500;
  else if (bp === bs && bs.length > 0) s = 100;

  const suffix = longestPathSuffixSegments(p, ns);
  if (suffix > 0) s = Math.max(s, 320 + suffix * 80);

  if (root) {
    const rooted = `${root}/${ns}`;
    if (p === rooted) s = Math.max(s, 900);
    else {
      const rs = longestPathSuffixSegments(p, rooted);
      if (rs > 0) s = Math.max(s, 340 + rs * 80);
    }
    const stripped = p.startsWith(root + '/') ? p.slice(root.length + 1) : '';
    if (stripped && (stripped === ns || ns.endsWith(stripped))) s = Math.max(s, 600);
  }

  return s;
}

/** Decompress `.synctex.gz` or accept plain synctex text. */
export function decodeSynctexPayload(data: Uint8Array): string | null {
  if (!data?.byteLength) return null;
  const isGz = data[0] === 0x1f && data[1] === 0x8b;
  try {
    const raw = isGz ? gunzipSync(data) : data;
    return new TextDecoder('utf-8', { fatal: false }).decode(raw);
  } catch {
    try {
      return new TextDecoder().decode(data);
    } catch {
      return null;
    }
  }
}

export function parseSynctexFromBytes(data: Uint8Array | undefined): PdfSyncObject | undefined {
  if (!data?.byteLength) return undefined;
  const text = decodeSynctexPayload(data);
  if (!text?.trim()) return undefined;
  return parseSyncTex(text);
}

export function bestSynctexFileKey(
  obj: PdfSyncObject,
  projectRelativePath: string
): string | undefined {
  const keys = Object.keys(obj.blockNumberLine || {});
  if (!keys.length) return undefined;
  const nt = normPath(projectRelativePath);
  const tb = basename(nt);
  let best: { k: string; s: number } | undefined;
  for (const k of keys) {
    const nk = normPath(k);
    const kb = basename(nk);
    let s = 0;
    if (nk === nt) s = 1000;
    else if (nt.endsWith(nk) || nk.endsWith(nt)) s = 500;
    else if (kb === tb) s = 100;
    else if (nk.includes(tb) && tb.length > 3) s = 50;
    if (s > 0 && (!best || s > best.s)) best = { k, s };
  }
  return best?.k;
}

function collectBlocksForLine(
  byRoot: PdfSyncObject['blockNumberLine'],
  fileKey: string,
  line: number,
  maxLookback: number
): Block[] {
  const byLine = byRoot[fileKey];
  if (!byLine) return [];
  const exact = byLine[line];
  if (exact) {
    const out: Block[] = [];
    for (const p of Object.keys(exact)) {
      const arr = exact[Number(p)];
      if (arr?.length) out.push(...arr);
    }
    if (out.length) return out;
  }
  const out: Block[] = [];
  for (let L = line - 1; L >= Math.max(1, line - maxLookback); L--) {
    const pageMap = byLine[L];
    if (!pageMap) continue;
    for (const p of Object.keys(pageMap)) {
      const arr = pageMap[Number(p)];
      if (arr?.length) out.push(...arr);
    }
    if (out.length) break;
  }
  return out;
}

function bboxOfBlocks(blocks: Block[]): {
  page: number;
  left: number;
  bottom: number;
  width: number;
  height: number;
} | null {
  if (!blocks.length) return null;
  const byPage = new Map<number, Block[]>();
  for (const b of blocks) {
    const arr = byPage.get(b.page) || [];
    arr.push(b);
    byPage.set(b.page, arr);
  }
  let bestPage = blocks[0].page;
  let bestCount = 0;
  for (const [p, arr] of byPage) {
    if (arr.length > bestCount) {
      bestCount = arr.length;
      bestPage = p;
    }
  }
  const pageBlocks = byPage.get(bestPage) || blocks;
  let minL = Infinity;
  let maxR = -Infinity;
  let minB = Infinity;
  let maxT = -Infinity;
  for (const b of pageBlocks) {
    const w = b.width ?? 0;
    const h = b.height ?? 0;
    minL = Math.min(minL, b.left);
    maxR = Math.max(maxR, b.left + w);
    minB = Math.min(minB, b.bottom);
    maxT = Math.max(maxT, b.bottom + h);
  }
  if (!Number.isFinite(minL)) return null;
  return {
    page: bestPage,
    left: minL,
    bottom: minB,
    width: Math.max(1, maxR - minL),
    height: Math.max(1, maxT - minB)
  };
}

/** Forward: project .tex path + 1-based line → PDF box in points (PDF user space, origin bottom-left). */
export function synctexForward(
  obj: PdfSyncObject,
  projectRelativePath: string,
  line: number,
  _pageCountHint?: number
): { page: number; left: number; bottom: number; width: number; height: number } | null {
  const key = bestSynctexFileKey(obj, projectRelativePath);
  if (!key) return null;
  const blocks = collectBlocksForLine(obj.blockNumberLine, key, line, 40);
  if (!blocks.length) return null;
  const bbox = bboxOfBlocks(blocks);
  if (!bbox) return null;
  const ox = obj.offset?.x ?? 0;
  const oy = obj.offset?.y ?? 0;
  return {
    page: bbox.page,
    left: bbox.left - ox,
    bottom: bbox.bottom - oy,
    width: bbox.width,
    height: bbox.height
  };
}

/** SyncTeX box in PDF user space (origin bottom-left, y upward), same as forward search. */
type SyncRect = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

function blockToSyncRect(block: Block): SyncRect {
  const yBase = block.bottom;
  const yFar = yBase + (block.height ?? 0);
  const depth = Math.max(0, block.depth ?? 0);
  const left = block.left;
  const right = block.width !== undefined ? block.left + block.width : block.left;
  return {
    bottom: Math.min(yBase, yFar) - depth,
    top: Math.max(yBase, yFar),
    left: Math.min(left, right),
    right: Math.max(left, right)
  };
}

function pointInSyncRect(x: number, y: number, rect: SyncRect): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.bottom && y <= rect.top;
}

function distToSyncRectEdge(x: number, y: number, rect: SyncRect): number {
  const dx = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0;
  const dy = y < rect.bottom ? rect.bottom - y : y > rect.top ? y - rect.top : 0;
  return Math.hypot(dx, dy);
}

function syncRectArea(rect: SyncRect): number {
  return Math.max((rect.right - rect.left) * (rect.top - rect.bottom), 1);
}

/** Skip container/kern/rule nodes (see synctex_parser.c in upstream SyncTeX). */
function skipInverseBlock(block: Block): boolean {
  return block.elements !== undefined || block.type === 'k' || block.type === 'r';
}

type InverseCand = {
  path: string;
  line: number;
  inside: boolean;
  dist: number;
  area: number;
  height: number;
  left: number;
  right: number;
};

export type SynctexInverseHit = {
  synctexPath: string;
  line: number;
  /** 0 at the left edge of this line's boxes, 1 at the right edge. */
  columnRatio: number;
  /** Click is inside one small box on a single line; do not override with text search. */
  confident: boolean;
};

/**
 * Inverse: PDF page + point in points (from bottom-left origin) → synctex source path + line.
 * Picks the smallest glyph box hit by the click (LW's outer-rect inclusion favors early lines).
 */
export function synctexInverse(
  obj: PdfSyncObject,
  page: number,
  xPt: number,
  yFromBottomPt: number
): SynctexInverseHit | null {
  const ox = obj.offset?.x ?? 0;
  const oy = obj.offset?.y ?? 0;
  const x0 = xPt - ox;
  const y0 = yFromBottomPt - oy;

  const fileNames = Object.keys(obj.blockNumberLine || {});
  if (!fileNames.length) return null;

  const candidates: InverseCand[] = [];

  for (const fileName of fileNames) {
    const linePageBlocks = obj.blockNumberLine[fileName];
    for (const lineNumKey of Object.keys(linePageBlocks)) {
      const pageBlocks = linePageBlocks[Number(lineNumKey)];
      if (!pageBlocks) continue;
      for (const pageNumKey of Object.keys(pageBlocks)) {
        if (page !== Number(pageNumKey)) continue;
        const blocks = pageBlocks[Number(pageNumKey)];
        if (!blocks?.length) continue;
        for (const block of blocks) {
          if (skipInverseBlock(block)) continue;
          const rect = blockToSyncRect(block);
          const inside = pointInSyncRect(x0, y0, rect);
          const dist = distToSyncRectEdge(x0, y0, rect);
          const line = block.line > 0 ? block.line : Number(lineNumKey);
          candidates.push({
            path: fileName,
            line,
            inside,
            dist,
            area: syncRectArea(rect),
            height: Math.max(0, rect.top - rect.bottom),
            left: rect.left,
            right: rect.right
          });
        }
      }
    }
  }

  if (!candidates.length) return null;

  const MAX_DIST = 72;
  const viable = candidates.filter((c) => c.inside || c.dist <= MAX_DIST);
  const pool = viable.length ? viable : candidates;

  pool.sort((a, b) => {
    if (a.inside !== b.inside) return a.inside ? -1 : 1;
    if (a.dist !== b.dist) return a.dist - b.dist;
    if (a.area !== b.area) return a.area - b.area;
    return b.line - a.line;
  });

  const best = pool[0];
  const insideLines = new Set(candidates.filter((c) => c.inside).map((c) => c.line));
  const width = Math.max(0, best.right - best.left);
  const small = best.inside && best.height <= 22 && best.area <= 2200 && width <= 200;
  const confident = small && insideLines.size === 1;
  return {
    synctexPath: best.path,
    line: best.line,
    columnRatio: columnRatioOnLine(obj, best.path, page, best.line, x0, y0, candidates),
    confident
  };
}

function columnRatioOnLine(
  obj: PdfSyncObject,
  file: string,
  page: number,
  line: number,
  x: number,
  y: number,
  fallback: InverseCand[]
): number {
  const hRects = (obj.hBlocks ?? [])
    .filter((b) => b.page === page && b.line === line && b.file?.path === file && (b.width ?? 0) > 0.5)
    .map(blockToSyncRect)
    .filter((r) => r.right > r.left + 0.5);
  const near = hRects.filter((r) => y >= r.bottom - 4 && y <= r.top + 4);
  const fromH = ratioAcross(near.length ? near : hRects, x);
  if (fromH != null) return fromH;

  const boxes = fallback.filter((c) => c.line === line && c.right > c.left + 0.5);
  return ratioAcross(boxes, x) ?? 0;
}

function ratioAcross(boxes: { left: number; right: number }[], x: number): number | null {
  if (!boxes.length) return null;
  const minL = Math.min(...boxes.map((b) => b.left));
  const maxR = Math.max(...boxes.map((b) => b.right));
  const span = maxR - minL;
  if (span < 1) return null;
  return Math.max(0, Math.min(1, (x - minL) / span));
}

/**
 * 0-based caret offset on a source line.
 * Prefer the PDF words under the click; otherwise the click's x among that line's h-boxes.
 */
export function columnOnSourceLine(
  line: string,
  pdfBefore: string,
  pdfAfter: string,
  columnRatio: number
): number {
  const geometric = columnFromRatio(line, columnRatio);
  return snapColumnToPdfText(line, pdfBefore, pdfAfter, geometric) ?? geometric;
}

function columnFromRatio(line: string, ratio: number): number {
  if (!line.length) return 0;
  const start = line.search(/\S/);
  if (start < 0) return 0;
  let end = line.length;
  while (end > start && /\s/.test(line[end - 1])) end--;
  const span = Math.max(1, end - start);
  const r = Math.max(0, Math.min(1, ratio));
  return Math.min(line.length, start + Math.round(r * span));
}

function snapColumnToPdfText(
  line: string,
  pdfBefore: string,
  pdfAfter: string,
  near: number
): number | null {
  const before = pdfBefore.replace(/\s+/g, ' ').trimEnd();
  const after = pdfAfter.replace(/\s+/g, ' ').trimStart();
  if (before.length < 2 && after.length < 2) return null;

  let bestAt: number | null = null;
  let bestLen = 0;
  let bestDist = Infinity;
  const maxLen = Math.min(24, Math.max(before.length, after.length));

  for (let len = maxLen; len >= 2; len--) {
    const bs = before.slice(-len);
    const as = after.slice(0, len);
    const spots: number[] = [];
    if (bs.length >= 2) {
      let from = 0;
      while (from < line.length) {
        const i = line.indexOf(bs, from);
        if (i < 0) break;
        const at = i + bs.length;
        const rest = line.slice(at).replace(/^\s+/, '');
        if (as.length < 2 || rest.startsWith(as) || line.startsWith(as, at)) spots.push(at);
        from = i + 1;
      }
    } else {
      let from = 0;
      while (from < line.length) {
        const i = line.indexOf(as, from);
        if (i < 0) break;
        spots.push(i);
        from = i + 1;
      }
    }
    if (!spots.length) continue;
    for (const at of spots) {
      const d = Math.abs(at - near);
      if (len > bestLen || (len === bestLen && d < bestDist)) {
        bestLen = len;
        bestDist = d;
        bestAt = at;
      }
    }
    if (bestLen >= 4) break;
  }
  return bestAt;
}

function normalizeSynctexMatchText(s: string): string {
  return s
    .replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])*(\{[^}]*\})?/g, (m) => {
      const inner = m.match(/\{([^}]*)\}$/);
      return inner ? inner[1] : '';
    })
    .replace(/[{}\\$%&~^_#]/g, '')
    .replace(/[\u2018\u2019\u201c\u201d]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Refine inverse line using plain text around the PDF click (LaTeX Workshop getRowAndColumn).
 */
export function refineSynctexLine(
  docText: string,
  hintLine: number,
  pdfBefore: string,
  pdfAfter: string,
  windowLines = 8
): number {
  const before = normalizeSynctexMatchText(pdfBefore).slice(-48);
  const after = normalizeSynctexMatchText(pdfAfter).slice(0, 48);
  if (before.length < 3 && after.length < 3) return hintLine;

  const lines = docText.split(/\r?\n/);
  const center = Math.max(0, Math.min(hintLine - 1, lines.length - 1));
  const start = Math.max(0, center - windowLines);
  const end = Math.min(lines.length, center + windowLines + 1);

  let bestLine = hintLine;
  let bestScore = 0;

  for (let i = start; i < end; i++) {
    const one = normalizeSynctexMatchText(lines[i] ?? '');
    const two =
      i + 1 < lines.length
        ? normalizeSynctexMatchText(`${lines[i] ?? ''} ${lines[i + 1] ?? ''}`)
        : one;
    const three =
      i + 2 < lines.length
        ? normalizeSynctexMatchText(`${lines[i] ?? ''} ${lines[i + 1] ?? ''} ${lines[i + 2] ?? ''}`)
        : two;

    let score = 0;
    for (const chunk of [one, two, three]) {
      if (!chunk) continue;
      if (before.length >= 3 && chunk.includes(before)) score += before.length + 12;
      if (after.length >= 3 && chunk.includes(after)) score += after.length + 12;
      if (before.length >= 4 && after.length >= 4) {
        const mid = before.slice(-16) + after.slice(0, 16);
        if (mid.length >= 6 && chunk.includes(mid)) score += mid.length + 24;
      }
    }

    if (score <= 0) continue;
    score -= Math.abs(i + 1 - hintLine) * 0.15;

    if (score > bestScore) {
      bestScore = score;
      bestLine = i + 1;
    }
  }

  return bestScore > 0 ? bestLine : hintLine;
}

/**
 * Map a synctex Input: path to the best project-relative .tex path.
 * Synctex paths are often compile-root-relative or absolute; project paths are tree-relative.
 */
export function matchSynctexPathToProject(
  synctexPath: string,
  projectTexPaths: string[],
  compileRootDir?: string
): string | undefined {
  const paths = [...new Set(projectTexPaths.map((p) => normPath(p)).filter(Boolean))];
  if (!paths.length) return undefined;

  const ns = normPath(synctexPath);
  const bs = basename(ns);
  const root = compileRootDir ? normPath(compileRootDir) : '';

  if (paths.length === 1) {
    const only = paths[0];
    if (scoreSynctexToProject(ns, only, root) > 0) return only;
  }

  let best: { p: string; s: number } | undefined;
  for (const p of paths) {
    const s = scoreSynctexToProject(ns, p, root);
    if (s > 0 && (!best || s > best.s)) best = { p, s };
  }

  if (!best || best.s < 50) {
    const sameBase = paths.filter((p) => basename(p) === bs && bs.length > 0);
    if (sameBase.length === 1) return sameBase[0];
  }

  const hit = best && best.s >= 50 ? best.p : undefined;
  if (!hit) return undefined;
  return preferLongestProjectPath(hit, paths, root);
}

/**
 * Map synctex source path → project .tex path, with compile-main fallback (BusyTeX often uses `./main.tex`).
 */
export function resolveSynctexProjectPath(
  synctexPath: string,
  projectTexPaths: string[],
  options?: { compileRootDir?: string; compileMainFile?: string }
): string | undefined {
  const pool = [
    ...new Set(
      projectTexPaths
        .map((p) => p.replace(/\\/g, '/').trim())
        .filter((p) => isTexLikePath(p))
    )
  ];
  const root = options?.compileRootDir;
  const compileMain = options?.compileMainFile ? normPath(options.compileMainFile) : '';

  for (const cand of synctexPathCandidates(synctexPath)) {
    const hit = matchSynctexPathToProject(cand, pool, root);
    if (hit) return hit;
  }

  if (compileMain) {
    const mainBs = basename(compileMain);
    const invBs = basename(synctexPath);
    if (!invBs || invBs === mainBs) {
      const inPool = pool.filter((p) => normPath(p) === compileMain || basename(p) === mainBs);
      if (inPool.length === 1) {
        return preferLongestProjectPath(inPool[0], pool, root);
      }
      if (inPool.length > 1) {
        const exact = inPool.find((p) => normPath(p) === compileMain);
        if (exact) return exact;
      }
      if (pool.length === 0 || !invBs) {
        return compileMain;
      }
    }
  }

  if (pool.length === 1) return pool[0];

  return undefined;
}

/** Prefer the longest pool path that denotes the same file (synctex often uses compile-root-relative paths). */
export function preferLongestProjectPath(
  matched: string,
  projectTexPaths: string[],
  compileRootDir?: string
): string {
  const m = normPath(matched);
  const paths = [...new Set(projectTexPaths.map((p) => normPath(p)).filter(Boolean))];
  const root = compileRootDir ? normPath(compileRootDir) : '';
  let best = m;
  for (const p of paths) {
    if (p === m) {
      if (p.length > best.length) best = p;
      continue;
    }
    if (p.endsWith('/' + m) || m.endsWith('/' + p)) {
      if (p.length > best.length) best = p;
      continue;
    }
    if (root && p === `${root}/${m}`) {
      if (p.length > best.length) best = p;
      continue;
    }
    if (longestPathSuffixSegments(p, m) > 0 && p.length > best.length) best = p;
  }
  return best;
}
