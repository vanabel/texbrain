import { unzipSync } from 'fflate';

const utf8Decoder = new TextDecoder('utf-8', { fatal: false });

export type GithubRepoRef = { owner: string; repo: string };

/** Parse `https://github.com/owner/repo` or `.git` suffix. */
export function parseGithubRepoUrl(url: string): GithubRepoRef | null {
  const cleaned = url.trim().replace(/\.git\s*$/i, '').replace(/\/+$/, '');
  const m = cleaned.match(/github\.com\/([^/]+)\/([^/#?]+)/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

function zipUrlForBranch(owner: string, repo: string, branch: string): string {
  return `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${branch}`;
}

const DEFAULT_PUBLIC_CORS = 'https://cors.isomorphic-git.org';

/** True when the app is served from this machine (pnpm dev / pnpm preview), so Vite can proxy codeload. */
function canUseLocalViteCodeloadProxy(): boolean {
  if (typeof location === 'undefined' || !location.hostname) return false;
  const h = location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
}

function isZipMagic(buf: ArrayBuffer): boolean {
  if (buf.byteLength < 4) return false;
  const u = new Uint8Array(buf, 0, 4);
  return u[0] === 0x50 && u[1] === 0x4b; // "PK" local file header
}

/**
 * Same rule as isomorphic-git `corsProxify`: path-style proxy expects URL **without** `https://`.
 * @see https://github.com/isomorphic-git/isomorphic-git/blob/main/src/utils/corsProxify.js
 */
export function corsProxify(corsProxy: string, url: string): string {
  const p = corsProxy.replace(/\/$/, '');
  if (!p) return url;
  return p.endsWith('?') ? `${p}${url}` : `${p}/${url.replace(/^https?:\/\//i, '')}`;
}

/**
 * Fetch GitHub zip bytes: Vite dev/preview proxy (same-origin on localhost) → public CORS proxies → allorigins → direct.
 */
async function fetchArrayBuffer(url: string, corsProxy: string): Promise<ArrayBuffer> {
  const attempts: string[] = [];
  const seen = new Set<string>();
  const add = (u: string) => {
    if (u && !seen.has(u)) {
      seen.add(u);
      attempts.push(u);
    }
  };

  // `pnpm dev` / `pnpm preview`: bypass CORS via vite.config server.preview proxy (not available on static hosts).
  if (url.startsWith('https://codeload.github.com/') && canUseLocalViteCodeloadProxy()) {
    const path = url.slice('https://codeload.github.com'.length);
    if (location.origin) {
      add(`${location.origin}/__texbrain_codeload${path}`);
    }
  }

  const bases = [...new Set([corsProxy.trim() || DEFAULT_PUBLIC_CORS, DEFAULT_PUBLIC_CORS])];
  for (const base of bases) {
    if (base) add(corsProxify(base, url));
  }

  add(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
  add(url);

  let lastErr: unknown;
  for (const u of attempts) {
    try {
      const res = await fetch(u);
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status} ${res.statusText}`);
        continue;
      }
      const buf = await res.arrayBuffer();
      if (!isZipMagic(buf)) {
        lastErr = new Error('Response was not a ZIP (proxy may have returned an error page)');
        continue;
      }
      return buf;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/**
 * Keep only zip entries under `subfolder` (e.g. `examples`).
 * Supports GitHub-style paths (`repo-main/examples/...`) and archives whose keys start with `examples/...`.
 */
export function extractSubfolderFromUnzipped(
  unzipped: Record<string, Uint8Array>,
  subfolder: string
): Map<string, string> {
  const prefix = subfolder.replace(/^\/+|\/+$/g, '');
  const needle = `${prefix}/`;
  const marker = `/${prefix}/`;
  const textFiles = new Map<string, string>();

  for (const [path, data] of Object.entries(unzipped)) {
    if (path.endsWith('/')) continue;
    let rel: string | undefined;
    if (path.startsWith(needle)) {
      rel = path;
    } else {
      const i = path.indexOf(marker);
      if (i === -1) continue;
      rel = path.slice(i + 1);
    }
    if (!rel.startsWith(needle)) continue;
    textFiles.set(rel, utf8Decoder.decode(data));
  }

  return textFiles;
}

/**
 * Download GitHub repo archive zip and keep only paths under `subfolder` (e.g. `examples`).
 * Returned map keys are relative to project root: `examples/bibtex-english-chinese/...`.
 */
export async function downloadGithubSubfolderAsMaps(
  ref: GithubRepoRef,
  subfolder: string,
  corsProxy: string
): Promise<{ textFiles: Map<string, string> }> {
  const prefix = subfolder.replace(/^\/+|\/+$/g, '');

  const branches = ['main', 'master'];
  let zipBuf: ArrayBuffer | null = null;
  let lastErr: unknown;
  for (const branch of branches) {
    try {
      zipBuf = await fetchArrayBuffer(zipUrlForBranch(ref.owner, ref.repo, branch), corsProxy);
      break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (!zipBuf) {
    throw new Error(
      `Could not download GitHub archive (${String(lastErr)}). Check network or Git > Remote CORS proxy.`
    );
  }

  const unzipped = unzipSync(new Uint8Array(zipBuf));
  const textFiles = extractSubfolderFromUnzipped(unzipped, prefix);

  if (textFiles.size === 0) {
    throw new Error(
      `No files found under "${prefix}/" in the archive. Is the branch name correct (tried: ${branches.join(', ')})?`
    );
  }

  return { textFiles };
}
