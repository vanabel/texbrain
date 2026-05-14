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

function pointInHBlock(
  b: Block,
  x: number,
  yFromBottom: number,
  ox: number,
  oy: number
): boolean {
  const left = b.left - ox;
  const bottom = b.bottom - oy;
  const w = b.width ?? 0;
  const right = left + w;
  const top = bottom + b.height;
  return x >= left && x <= right && yFromBottom >= bottom && yFromBottom <= top;
}

/** Inverse: PDF page + point in points (from bottom-left origin) → synctex source path + line. */
export function synctexInverse(
  obj: PdfSyncObject,
  page: number,
  xPt: number,
  yFromBottomPt: number
): { synctexPath: string; line: number } | null {
  const ox = obj.offset?.x ?? 0;
  const oy = obj.offset?.y ?? 0;
  const candidates: { path: string; line: number; area: number }[] = [];

  for (const hb of obj.hBlocks) {
    if (hb.page !== page) continue;
    if (!pointInHBlock(hb, xPt, yFromBottomPt, ox, oy)) continue;
    const w = Math.max(1e-6, hb.width ?? 1);
    const area = w * Math.max(1e-6, hb.height);
    const path = hb.file?.path || '';
    if (path) candidates.push({ path, line: hb.line, area });
  }

  if (!candidates.length) {
    for (const hb of obj.hBlocks) {
      if (hb.page !== page) continue;
      const left = hb.left - ox;
      const bottom = hb.bottom - oy;
      const w = hb.width ?? 0;
      const cx = left + w / 2;
      const cy = bottom + hb.height / 2;
      const d = Math.hypot(xPt - cx, yFromBottomPt - cy);
      if (d < 48) {
        const path = hb.file?.path || '';
        if (path) candidates.push({ path, line: hb.line, area: d * d });
      }
    }
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => a.area - b.area);
  return { synctexPath: candidates[0].path, line: candidates[0].line };
}

/** Map a synctex Input: path to the best matching project-relative path (open tab / tree). */
export function matchSynctexPathToProject(
  synctexPath: string,
  projectTexPaths: string[]
): string | undefined {
  const ns = normPath(synctexPath);
  const bs = basename(ns);
  let best: { p: string; s: number } | undefined;
  for (const p of projectTexPaths) {
    const np = normPath(p);
    const bp = basename(np);
    let s = 0;
    if (np === ns) s = 1000;
    else if (np.endsWith(ns) || ns.endsWith(np)) s = 500;
    else if (bp === bs) s = 100;
    if (s > 0 && (!best || s > best.s)) best = { p: np, s };
  }
  return best?.p;
}
