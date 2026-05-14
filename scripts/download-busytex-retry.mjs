/**
 * Re-download BusyTeX WASM assets with retries.
 *
 * - Node's https (used inside texlyre-busytex download-assets) does **not** use
 *   HTTP_PROXY / HTTPS_PROXY / ALL_PROXY by default.
 * - When those env vars are set (e.g. after `enable_proxy` in zsh) and `curl` is
 *   available, this script downloads with **curl** (respects SOCKS5/HTTP proxies),
 *   then extracts with **tar**.
 * - Set `BUSYTEX_USE_CURL=1` to force curl even without proxy.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const staticDir = path.join(root, 'static');
const busytexDir = path.join(staticDir, 'busytex');
const archive = path.join(staticDir, 'busytex-assets.tar.gz');

const busytexPkgPath = path.join(root, 'node_modules', '@vanabel', 'texlyre-busytex', 'package.json');

function readBusytexMeta() {
  const raw = fs.readFileSync(busytexPkgPath, 'utf8');
  const pkg = JSON.parse(raw);
  const version = `v${pkg.version}`;
  let repo = 'vanabel/texlyre-busytex';
  const u = pkg.repository?.url;
  if (typeof u === 'string') {
    const m = u.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/i);
    if (m) repo = m[1];
  }
  const releaseTag = process.env.BUSYTEX_RELEASE_TAG || `assets-${version}`;
  const url = `https://github.com/${repo}/releases/download/${releaseTag}/busytex-assets.tar.gz`;
  return { version, releaseTag, url, repo };
}

function rm(p) {
  try {
    fs.rmSync(p, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

function hasProxyEnv() {
  return !!(process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ALL_PROXY);
}

function curlAvailable() {
  const r = spawnSync('curl', ['--version'], { encoding: 'utf8' });
  return r.status === 0;
}

function shouldUseCurl() {
  if (process.env.BUSYTEX_USE_CURL === '1' || process.env.BUSYTEX_USE_CURL === 'true') return true;
  return hasProxyEnv() && curlAvailable();
}

function extractTarball() {
  const r = spawnSync('tar', ['-xzf', archive, '-C', staticDir], {
    cwd: root,
    stdio: 'inherit'
  });
  return r.status === 0;
}

const maxAttempts = Number(process.env.BUSYTEX_DOWNLOAD_ATTEMPTS || 6);

async function downloadViaCurl(url) {
  console.log('[download-busytex] using curl (honors HTTP(S)_PROXY / ALL_PROXY, e.g. socks5 from enable_proxy)');
  rm(busytexDir);
  rm(archive);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[download-busytex] curl attempt ${attempt}/${maxAttempts} → ${url}`);
    const r = spawnSync(
      'curl',
      [
        '-fL',
        '--connect-timeout',
        '30',
        '--retry',
        '5',
        '--retry-delay',
        '10',
        '--retry-all-errors',
        '-o',
        archive,
        url
      ],
      {
        cwd: root,
        stdio: 'inherit',
        env: { ...process.env }
      }
    );
    if (r.status === 0 && fs.existsSync(archive) && fs.statSync(archive).size > 1_000_000) {
      console.log('[download-busytex] extracting tarball...');
      if (extractTarball()) {
        try {
          fs.unlinkSync(archive);
        } catch {
          /* ignore */
        }
        return true;
      }
    }
    rm(archive);
    rm(busytexDir);
    if (attempt < maxAttempts) {
      const sec = Math.min(45, 5 * attempt);
      console.log(`[download-busytex] curl failed, retry in ${sec}s...`);
      await delay(sec * 1000);
    }
  }
  return false;
}

async function downloadViaTexlyreCli() {
  rm(busytexDir);
  rm(archive);
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[download-busytex] texlyre-busytex CLI attempt ${attempt}/${maxAttempts}...`);
    const r = spawnSync('pnpm', ['exec', 'texlyre-busytex', 'download-assets', './static'], {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env }
    });
    if (r.status === 0) {
      return true;
    }
    rm(archive);
    rm(busytexDir);
    if (attempt < maxAttempts) {
      const sec = Math.min(45, 5 * attempt);
      console.log(`[download-busytex] failed (exit ${r.status ?? r.signal}), retry in ${sec}s...`);
      await delay(sec * 1000);
    }
  }
  return false;
}

if (!fs.existsSync(busytexPkgPath)) {
  console.error('[download-busytex] missing', busytexPkgPath, '— run pnpm install first.');
  process.exit(1);
}

const meta = readBusytexMeta();
console.log('[download-busytex] release:', meta.releaseTag, 'repo:', meta.repo);

let ok = false;
if (shouldUseCurl()) {
  ok = await downloadViaCurl(meta.url);
  if (!ok) {
    console.log('[download-busytex] curl path failed, falling back to texlyre-busytex CLI...');
    ok = await downloadViaTexlyreCli();
  }
} else {
  if (hasProxyEnv() && !curlAvailable()) {
    console.warn(
      '[download-busytex] proxy env is set but curl was not found; Node downloader may ignore proxies. Install curl or set BUSYTEX_USE_CURL=1 after installing curl.'
    );
  }
  ok = await downloadViaTexlyreCli();
}

if (ok) {
  console.log('[download-busytex] done');
  process.exit(0);
}

console.error(
  '[download-busytex] all attempts failed. Tip: run `enable_proxy` (or export HTTPS_PROXY) in this shell, then retry; or set BUSYTEX_RELEASE_TAG to a mirror.'
);
process.exit(1);
