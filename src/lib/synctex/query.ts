import { gunzipSync } from 'fflate';
import { parseSyncTex, type Block, type PdfSyncObject } from './parse-synctex';

function normPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.\//, '');
}

function basename(p: string): string {
  const n = normPath(p);
  const i = n.lastIndexOf('/');
  return i >= 0 ? n.slice(i + 1) : n;
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

/** PDF user space (origin bottom-left), same convention as forward search / click mapping. */
type PdfHitBox = {
  left: number;
  bottom: number;
  width: number;
  height: number;
  line: number;
  path: string;
};

function toPdfBox(b: Block, ox: number, oy: number): PdfHitBox {
  const w = Math.max(b.width ?? 0, 4);
  const h = Math.max(b.height ?? 0, 3);
  return {
    left: b.left - ox,
    bottom: b.bottom - oy,
    width: w,
    height: h,
    line: b.line,
    path: b.file?.path || ''
  };
}

function distToPdfBox(x: number, yFromBottom: number, box: PdfHitBox): number {
  const r = box.left + box.width;
  const t = box.bottom + box.height;
  const dx = x < box.left ? box.left - x : x > r ? x - r : 0;
  const dy = yFromBottom < box.bottom ? box.bottom - yFromBottom : yFromBottom > t ? yFromBottom - t : 0;
  return Math.hypot(dx, dy);
}

/** Collect horizontal blocks + glyph/line elements for this page (hBlocks alone are often too sparse). */
function collectPdfHitBoxesForPage(obj: PdfSyncObject, page: number): PdfHitBox[] {
  const ox = obj.offset?.x ?? 0;
  const oy = obj.offset?.y ?? 0;
  const out: PdfHitBox[] = [];
  const seen = new Set<string>();

  const push = (box: PdfHitBox) => {
    if (!box.path) return;
    const key = `${box.path}\0${box.line}\0${box.left.toFixed(2)}\0${box.bottom.toFixed(2)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(box);
  };

  for (const hb of obj.hBlocks) {
    if (hb.page !== page) continue;
    push(toPdfBox(hb, ox, oy));
  }

  const bn = obj.blockNumberLine;
  for (const filePath of Object.keys(bn)) {
    const byLine = bn[filePath];
    for (const lineKey of Object.keys(byLine)) {
      const byPage = byLine[Number(lineKey)];
      if (!byPage) continue;
      const blocks =
        byPage[page as keyof typeof byPage] ??
        (byPage as Record<string, Block[]>)[String(page)];
      if (!blocks?.length) continue;
      for (const elem of blocks) {
        if (elem.page !== page) continue;
        push(toPdfBox(elem, ox, oy));
      }
    }
  }

  return out;
}

/** Inverse: PDF page + point in points (from bottom-left origin) → synctex source path + line. */
export function synctexInverse(
  obj: PdfSyncObject,
  page: number,
  xPt: number,
  yFromBottomPt: number
): { synctexPath: string; line: number } | null {
  const boxes = collectPdfHitBoxesForPage(obj, page);
  if (!boxes.length) return null;

  type Scored = { path: string; line: number; dist: number; area: number; inside: boolean };
  const scored: Scored[] = [];
  for (const b of boxes) {
    const d = distToPdfBox(xPt, yFromBottomPt, b);
    const inside = d === 0;
    const area = Math.max(b.width * b.height, 1);
    scored.push({ path: b.path, line: b.line, dist: d, area, inside });
  }

  scored.sort((a, b) => {
    if (a.inside !== b.inside) return a.inside ? -1 : 1;
    if (a.dist !== b.dist) return a.dist - b.dist;
    return a.area - b.area;
  });

  const best = scored[0];
  if (!best) return null;
  if (!best.inside && best.dist > 120) return null;
  return { synctexPath: best.path, line: best.line };
}

/** Map a synctex Input: path to the best matching project-relative path (open tab / tree). */
export function matchSynctexPathToProject(
  synctexPath: string,
  projectTexPaths: string[]
): string | undefined {
  const paths = projectTexPaths.map((p) => normPath(p)).filter(Boolean);
  if (!paths.length) return undefined;

  const ns = normPath(synctexPath);
  const bs = basename(ns);

  if (paths.length === 1 && ns.toLowerCase().endsWith('.tex')) {
    return paths[0];
  }

  let best: { p: string; s: number } | undefined;
  for (const p of paths) {
    const bp = basename(p);
    let s = 0;
    if (p === ns) s = 1000;
    else if (p.endsWith('/' + ns) || p.endsWith('/' + bs)) s = 650;
    else if (p.endsWith(ns) || ns.endsWith(p) || ns.endsWith('/' + p)) s = 500;
    else if (bp === bs) s = 100;
    else if (ns.endsWith('/' + bp) || ns.endsWith(bp)) s = 80;
    if (s > 0 && (!best || s > best.s)) best = { p, s };
  }
  return best?.p;
}
