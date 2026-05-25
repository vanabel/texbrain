import { unzipSync } from 'fflate';
import { corsProxify } from '../git/github-zip';
import { parseMissingTexFilesFromLog } from './parse-missing-tex';

const CTAN_JSON_ORIGIN = 'https://www.ctan.org';
/**
 * CTAN mirror bases (path = `{base}/macros/...` or `{base}/CTAN/macros/...`).
 * USTC / Tsinghua first (200, no 307); avoid mirrors.ctan.org (307 breaks many CORS proxies).
 */
const CTAN_MIRROR_BASES = [
  'https://mirrors.ustc.edu.cn/CTAN',
  'https://mirrors.tuna.tsinghua.edu.cn/CTAN',
  'https://ctan.math.illinois.edu',
  'https://mirrors.rit.edu/CTAN',
  'https://mirror.ctan.org'
] as const;

/**
 * Same-origin proxy path per mirror host (Vite dev/preview; NAS/nginx — see docs/zh-CN/deployment.md).
 * Request: `{origin}{prefix}/CTAN/macros/...` → upstream mirror.
 */
const SAME_ORIGIN_CTAN_PROXY_BY_HOST: Record<string, string> = {
  'https://mirrors.ustc.edu.cn': '/__texbrain_ctan_ustc',
  'https://mirrors.tuna.tsinghua.edu.cn': '/__texbrain_ctan_tsinghua'
};
const SAME_ORIGIN_CTAN_JSON_PREFIX = '/__texbrain_ctan_json';
const DEFAULT_PUBLIC_CORS = 'https://cors.isomorphic-git.org';

/** Per fetch attempt; avoids hanging on slow CORS proxies for multi-MB zips. */
const CTAN_FETCH_ATTEMPT_MS = 18_000;

const utf8Decoder = new TextDecoder('utf-8', { fatal: false });

const TEX_ARCHIVE_EXTS = /\.(sty|cls|clo|cfg|def|fd|ltx|tex|bst)$/i;

export interface CtanFetchResult {
  /** Basename → file content (merged into compile-root map). */
  added: Map<string, string>;
  log: string;
}

interface CtanPkgMeta {
  id: string;
  ctan?: { path?: string; file?: boolean };
  /** e.g. `/macros/latex/contrib/amsrefs.tds.zip` */
  install?: string;
  repository?: string;
}

let ctanProgressReporter: ((message: string) => void) | null = null;

export function setCtanFetchProgressReporter(
  reporter: ((message: string) => void) | null
): void {
  ctanProgressReporter = reporter;
}

export function reportCtanFetchProgress(message: string): void {
  try {
    ctanProgressReporter?.(message);
  } catch {
    /* ignore */
  }
}

/** Git-only CORS proxies cannot forward CTAN JSON/zip (returns 403). */
function isGitOnlyCorsProxyBase(base: string): boolean {
  const b = base.trim().toLowerCase();
  if (!b) return true;
  return (
    b.includes('isomorphic-git.org') ||
    b.includes('git-cors') ||
    b.endsWith('/cors-proxy') ||
    b.includes('/cors-proxy/')
  );
}

/** Prefer `{origin}/__texbrain_ctan_*` when reverse proxy is configured (Vite dev or NAS nginx). */
function addSameOriginCtanAttempts(url: string, add: (u: string) => void): boolean {
  if (typeof location === 'undefined' || !location.origin) return false;
  let added = false;
  for (const [host, prefix] of Object.entries(SAME_ORIGIN_CTAN_PROXY_BY_HOST)) {
    if (url.startsWith(host)) {
      add(`${location.origin}${prefix}${url.slice(host.length)}`);
      added = true;
      break;
    }
  }
  if (url.startsWith(CTAN_JSON_ORIGIN)) {
    add(`${location.origin}${SAME_ORIGIN_CTAN_JSON_PREFIX}${url.slice(CTAN_JSON_ORIGIN.length)}`);
    added = true;
  }
  return added;
}

function buildFetchAttempts(url: string, corsProxy: string): string[] {
  const attempts: string[] = [];
  const seen = new Set<string>();
  const add = (u: string) => {
    if (u && !seen.has(u)) {
      seen.add(u);
      attempts.push(u);
    }
  };

  const sameOrigin = addSameOriginCtanAttempts(url, add);
  if (sameOrigin) {
    add(url);
  }

  const proxyBases = [...new Set([corsProxy.trim() || DEFAULT_PUBLIC_CORS, DEFAULT_PUBLIC_CORS])];
  for (const base of proxyBases) {
    if (base && !isGitOnlyCorsProxyBase(base)) add(corsProxify(base, url));
  }
  if (!sameOrigin) add(url);

  return attempts;
}

function looksLikeHtmlText(text: string): boolean {
  const t = text.trimStart().toLowerCase();
  return t.startsWith('<!doctype') || t.startsWith('<html') || t.includes('<title>redirecting');
}

function looksLikeHtmlBuffer(buf: ArrayBuffer): boolean {
  const head = utf8Decoder.decode(new Uint8Array(buf, 0, Math.min(256, buf.byteLength)));
  return looksLikeHtmlText(head);
}

async function fetchBytes(
  url: string,
  corsProxy: string
): Promise<{ buf: ArrayBuffer; via: string } | null> {
  let lastErr: unknown;
  for (const u of buildFetchAttempts(url, corsProxy)) {
    try {
      const res = await fetch(u, {
        redirect: 'follow',
        signal: AbortSignal.timeout(CTAN_FETCH_ATTEMPT_MS)
      });
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`);
        continue;
      }
      const buf = await res.arrayBuffer();
      if (!buf.byteLength || looksLikeHtmlBuffer(buf)) {
        lastErr = new Error('response was HTML, not archive');
        continue;
      }
      return { buf, via: u === url ? url : u };
    } catch (e) {
      lastErr = e;
    }
  }
  void lastErr;
  return null;
}

async function fetchFirstBytesFromUrls(
  urls: string[],
  corsProxy: string,
  logLines: string[],
  label: string
): Promise<{ buf: ArrayBuffer; via: string; url: string } | null> {
  if (urls.length === 0) return null;
  if (urls.length === 1) {
    const url = urls[0];
    reportCtanFetchProgress(`[CTAN] trying ${url}`);
    const got = await fetchBytes(url, corsProxy);
    if (!got) {
      logLines.push(`[CTAN]   miss ${url}`);
      return null;
    }
    return { ...got, url };
  }

  reportCtanFetchProgress(`[CTAN] trying ${label} (${urls.length} mirrors in parallel)`);
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      const got = await fetchBytes(url, corsProxy);
      if (!got) throw new Error(`miss ${url}`);
      return { ...got, url };
    })
  );
  for (const r of results) {
    if (r.status === 'fulfilled') return r.value;
  }
  for (const url of urls) logLines.push(`[CTAN]   miss ${url}`);
  return null;
}

async function fetchJson<T>(url: string, corsProxy: string): Promise<T | null> {
  for (const u of buildFetchAttempts(url, corsProxy)) {
    try {
      const res = await fetch(u, { signal: AbortSignal.timeout(CTAN_FETCH_ATTEMPT_MS) });
      if (!res.ok) continue;
      const text = await res.text();
      if (!text.trim() || looksLikeHtmlText(text)) continue;
      return JSON.parse(text) as T;
    } catch {
      /* try next URL */
    }
  }
  return null;
}

function packageKeyFromFilename(filename: string): string {
  const base = filename.includes('/') ? filename.slice(filename.lastIndexOf('/') + 1) : filename;
  const dot = base.lastIndexOf('.');
  return (dot > 0 ? base.slice(0, dot) : base).toLowerCase();
}

async function resolveCtanPackageKey(
  filename: string,
  corsProxy: string
): Promise<{ key: string; meta: CtanPkgMeta } | null> {
  const guess = packageKeyFromFilename(filename);
  const direct = await fetchJson<CtanPkgMeta>(
    `${CTAN_JSON_ORIGIN}/json/2.0/pkg/${encodeURIComponent(guess)}`,
    corsProxy
  );
  if (direct?.id) return { key: direct.id, meta: direct };

  type PkgListItem = { key?: string; name?: string };
  const list = await fetchJson<PkgListItem[]>(
    `${CTAN_JSON_ORIGIN}/json/2.0/packages?key=${encodeURIComponent(guess)}`,
    corsProxy
  );
  if (!Array.isArray(list) || list.length === 0) return null;

  const exact = list.find(p => (p.key || '').toLowerCase() === guess);
  const pick = exact ?? list[0];
  if (!pick?.key) return null;

  const meta = await fetchJson<CtanPkgMeta>(
    `${CTAN_JSON_ORIGIN}/json/2.0/pkg/${encodeURIComponent(pick.key)}`,
    corsProxy
  );
  if (!meta?.id) return null;
  return { key: meta.id, meta };
}

/**
 * CTAN "install" archives (TDS layout with built .sty) live under `/install/...` on mirrors,
 * while `meta.install` is often `/macros/latex/contrib/foo.tds.zip` without the prefix.
 */
function installArchiveUrls(rel: string, meta: CtanPkgMeta): string[] {
  const candidates = new Set<string>();
  const installRel = meta.install?.replace(/^\/+/, '').trim();
  if (installRel) {
    if (installRel.startsWith('install/')) candidates.add(installRel);
    else {
      candidates.add(`install/${installRel}`);
      candidates.add(installRel);
    }
  } else {
    candidates.add(`install/${rel}.tds.zip`);
  }
  const urls: string[] = [];
  for (const base of CTAN_MIRROR_BASES) {
    for (const c of candidates) urls.push(`${base}/${c}`);
  }
  return [...new Set(urls)];
}

function singleFileMirrorUrls(rel: string, wantedBasenames: Iterable<string>): string[] {
  const urls: string[] = [];
  for (const base of CTAN_MIRROR_BASES.slice(0, 2)) {
    for (const want of wantedBasenames) urls.push(`${base}/${rel}/${want}`);
  }
  return urls;
}

function githubRawUrls(repoUrl: string, wantedBasenames: Iterable<string>): string[] {
  const m = repoUrl.match(/github\.com\/([^/]+)\/([^/.#?]+)/i);
  if (!m) return [];
  const [, owner, repo] = m;
  const urls: string[] = [];
  for (const branch of ['main', 'master'] as const) {
    for (const want of wantedBasenames) {
      urls.push(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${want}`);
      urls.push(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${repo}/${want}`);
    }
  }
  return urls;
}

function isZip(buf: ArrayBuffer): boolean {
  if (buf.byteLength < 4) return false;
  const u = new Uint8Array(buf, 0, 4);
  return u[0] === 0x50 && u[1] === 0x4b;
}

function extractTexFilesFromZip(
  buf: ArrayBuffer,
  wantedBasenames: Set<string>
): Map<string, string> {
  const unzipped = unzipSync(new Uint8Array(buf));
  const byBasename = new Map<string, { path: string; content: string }>();
  const allTex: { path: string; content: string; base: string }[] = [];

  for (const [path, data] of Object.entries(unzipped)) {
    if (path.endsWith('/') || !TEX_ARCHIVE_EXTS.test(path)) continue;
    const base = path.slice(path.lastIndexOf('/') + 1);
    const content = utf8Decoder.decode(data);
    allTex.push({ path, content, base });
    const existing = byBasename.get(base);
    if (!existing || wantedBasenames.has(base.toLowerCase())) {
      byBasename.set(base, { path, content });
    }
  }

  const out = new Map<string, string>();
  for (const want of wantedBasenames) {
    const hit =
      byBasename.get(want) ??
      [...byBasename.entries()].find(([b]) => b.toLowerCase() === want.toLowerCase())?.[1];
    if (hit) {
      const base = hit.path.includes('/') ? hit.path.slice(hit.path.lastIndexOf('/') + 1) : hit.path;
      out.set(base, hit.content);
    }
  }

  // Include sibling .sty/.cls in the same directory as a matched file (common package layout).
  const matchedDirs = new Set<string>();
  for (const { path, base } of allTex) {
    if (!out.has(base) && !wantedBasenames.has(base.toLowerCase())) continue;
    const slash = path.lastIndexOf('/');
    matchedDirs.add(slash >= 0 ? path.slice(0, slash) : '');
  }
  for (const { path, content, base } of allTex) {
    if (!/\.(sty|cls|clo|cfg|def)$/i.test(base) || out.has(base)) continue;
    const slash = path.lastIndexOf('/');
    const dir = slash >= 0 ? path.slice(0, slash) : '';
    if (matchedDirs.has(dir)) out.set(base, content);
  }

  return out;
}

function texFilesFromDownloadedBuffer(
  buf: ArrayBuffer,
  url: string,
  wantedBasenames: Set<string>,
  logLines: string[]
): Map<string, string> | null {
  if (isZip(buf)) {
    const extracted = extractTexFilesFromZip(buf, wantedBasenames);
    if (extracted.size > 0) {
      logLines.push(`[CTAN]   ok zip ${url} (${extracted.size} file(s))`);
      return extracted;
    }
    logLines.push(`[CTAN]   zip had no matching .sty: ${url}`);
    return null;
  }
  const base = url.slice(url.lastIndexOf('/') + 1);
  if (!TEX_ARCHIVE_EXTS.test(base)) return null;
  const text = utf8Decoder.decode(new Uint8Array(buf));
  if (text.includes('\\ProvidesPackage') || text.includes('\\documentclass') || base.endsWith('.sty')) {
    const m = new Map<string, string>();
    m.set(base, text);
    logLines.push(`[CTAN]   ok file ${url}`);
    return m;
  }
  logLines.push(`[CTAN]   not a TeX file: ${url}`);
  return null;
}

async function downloadPackageTexFiles(
  meta: CtanPkgMeta,
  wantedBasenames: Set<string>,
  corsProxy: string,
  logLines: string[]
): Promise<Map<string, string>> {
  const path = meta.ctan?.path?.trim();
  if (!path) return new Map();

  const rel = path.replace(/^\/+/, '');
  const zipUrls = CTAN_MIRROR_BASES.map((base) => `${base}/${rel}.zip`);
  const installUrls = installArchiveUrls(rel, meta);

  const zipHit = await fetchFirstBytesFromUrls(zipUrls, corsProxy, logLines, `${rel}.zip`);
  if (zipHit) {
    const fromZip = texFilesFromDownloadedBuffer(zipHit.buf, zipHit.url, wantedBasenames, logLines);
    if (fromZip && fromZip.size > 0) return fromZip;
  }

  const installHit = await fetchFirstBytesFromUrls(
    installUrls,
    corsProxy,
    logLines,
    'install archive'
  );
  if (installHit) {
    const fromInstall = texFilesFromDownloadedBuffer(
      installHit.buf,
      installHit.url,
      wantedBasenames,
      logLines
    );
    if (fromInstall && fromInstall.size > 0) return fromInstall;
  }

  for (const url of singleFileMirrorUrls(rel, wantedBasenames)) {
    reportCtanFetchProgress(`[CTAN] trying ${url}`);
    const got = await fetchBytes(url, corsProxy);
    if (!got) {
      logLines.push(`[CTAN]   miss ${url}`);
      continue;
    }
    const files = texFilesFromDownloadedBuffer(got.buf, url, wantedBasenames, logLines);
    if (files && files.size > 0) return files;
  }

  const repo = meta.repository?.trim();
  if (repo) {
    for (const url of githubRawUrls(repo, wantedBasenames)) {
      reportCtanFetchProgress(`[CTAN] trying GitHub ${url}`);
      const got = await fetchBytes(url, corsProxy);
      if (!got) continue;
      const base = url.slice(url.lastIndexOf('/') + 1);
      if (!TEX_ARCHIVE_EXTS.test(base)) continue;
      const text = utf8Decoder.decode(new Uint8Array(got.buf));
      if (text.includes('\\ProvidesPackage') || base.endsWith('.sty')) {
        const m = new Map<string, string>();
        m.set(base, text);
        logLines.push(`[CTAN]   ok GitHub ${url}`);
        return m;
      }
    }
  }

  return new Map();
}

/**
 * Download missing TeX inputs from [CTAN](https://ctan.org/tex-archive/macros/latex) (zip or single file).
 */
export async function fetchMissingTexFromCtan(
  missingBasenames: string[],
  corsProxy = ''
): Promise<CtanFetchResult> {
  const added = new Map<string, string>();
  const logLines: string[] = [];
  if (missingBasenames.length === 0) return { added, log: '' };

  const wanted = new Set(missingBasenames.map(f => f.toLowerCase()));
  const byPackage = new Map<string, Set<string>>();
  for (const name of missingBasenames) {
    const key = packageKeyFromFilename(name);
    if (!byPackage.has(key)) byPackage.set(key, new Set());
    byPackage.get(key)!.add(name.toLowerCase());
  }

  for (const [pkgGuess, names] of byPackage) {
    const first = [...names][0];
    const resolved = await resolveCtanPackageKey(first, corsProxy);
    if (!resolved) {
      logLines.push(
        `[CTAN] no package found for ${pkgGuess} (${[...names].join(', ')}); ` +
          'same-origin /__texbrain_ctan_json must return JSON (not TeXbrain index.html) — see docs deployment'
      );
      continue;
    }
    logLines.push(`[CTAN] resolved ${[...names].join(', ')} → pkg/${resolved.key}`);
    const files = await downloadPackageTexFiles(resolved.meta, names, corsProxy, logLines);
    if (files.size === 0) {
      const p = resolved.meta.ctan?.path ?? '?';
      logLines.push(
        `[CTAN] download failed for pkg/${resolved.key} (${p}); ensure /__texbrain_ctan_json returns JSON (not index.html): use pnpm serve:prod or nginx ^~ locations — see docs deployment`
      );
      continue;
    }
    for (const [base, content] of files) {
      if (!added.has(base)) {
        added.set(base, content);
        logLines.push(`[CTAN] added ${base} (${content.length} bytes)`);
      }
    }
  }

  const note =
    logLines.length > 0
      ? '\n\n[TeXbrain] CTAN auto-fetch:\n' + logLines.join('\n') + '\n'
      : '';
  return { added, log: note };
}

/** Parse log for missing inputs and fetch from CTAN. */
export async function fetchMissingTexFromLog(
  log: string,
  corsProxy = ''
): Promise<CtanFetchResult> {
  return fetchMissingTexFromCtan(parseMissingTexFilesFromLog(log), corsProxy);
}

/** Footer appended to compile log when CTAN auto-fetch did not run or had nothing to do. */
export function formatCtanAutoFetchSuccessNote(opts: {
  enabled: boolean;
  sawMissingInLog: boolean;
  filesAddedFromCtan: number;
}): string {
  if (!opts.enabled) return '';
  if (opts.filesAddedFromCtan > 0) {
    return (
      '\n\n[TeXbrain] CTAN auto-fetch: downloaded ' +
      `${opts.filesAddedFromCtan} file(s) from CTAN and recompiled.\n`
    );
  }
  if (!opts.sawMissingInLog) {
    return (
      '\n\n[TeXbrain] CTAN auto-fetch: no missing .sty/.cls in the log ' +
      '(dependencies were likely satisfied by the built-in BusyTeX TeX Live tree; CTAN download was skipped).\n'
    );
  }
  return (
    '\n\n[TeXbrain] CTAN auto-fetch: missing inputs were seen in the log, ' +
    'but the compile still failed after any fetch attempts.\n'
  );
}
