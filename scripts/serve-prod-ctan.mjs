#!/usr/bin/env node
/**
 * Production static server with same-origin CTAN proxies (matches vite.config.ts)
 * and y-webrtc collab signaling at `/__texbrain_signaling`.
 * Unlike `serve -s`, does not SPA-fallback `/__texbrain_ctan_*` to index.html.
 */
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { attachCollabSignaling } from './collab-signaling-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../build');
const PORT = Number(process.env.PORT || 19903);

/** @type {{ prefix: string; origin: string; strip: string }[]} */
const CTAN_PROXIES = [
  { prefix: '/__texbrain_ctan_json', origin: 'https://www.ctan.org', strip: '/__texbrain_ctan_json' },
  { prefix: '/__texbrain_ctan_ustc', origin: 'https://mirrors.ustc.edu.cn', strip: '/__texbrain_ctan_ustc' },
  {
    prefix: '/__texbrain_ctan_tsinghua',
    origin: 'https://mirrors.tuna.tsinghua.edu.cn',
    strip: '/__texbrain_ctan_tsinghua'
  }
];

/** Extension → Content-Type (pdf.js worker and Svelte chunks need `.mjs` as JavaScript). */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.gz': 'application/gzip',
  '.bcmap': 'application/octet-stream',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml'
};

function proxyToUpstream(req, res, rule) {
  const incoming = new URL(req.url || '/', 'http://localhost');
  const upstreamPath = incoming.pathname.replace(rule.strip, '') || '/';
  const target = new URL(upstreamPath + incoming.search, rule.origin);
  const lib = target.protocol === 'https:' ? https : http;

  const headers = { ...req.headers, host: target.host };
  delete headers.connection;
  delete headers['proxy-connection'];

  const upstream = lib.request(
    target,
    { method: req.method || 'GET', headers },
    (up) => {
      res.writeHead(up.statusCode || 502, up.headers);
      up.pipe(res);
    }
  );
  upstream.on('error', (e) => {
    console.error('[ctan-proxy]', target.href, e.message);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('CTAN proxy error');
  });
  req.pipe(upstream);
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  fs.createReadStream(filePath).pipe(res);
}

/**
 * Resolve adapter-static pages: `/editor` → `editor.html`, `/` → `index.html`.
 * Do NOT fall back unknown paths to the landing `index.html` (that made join
 * links open the homepage instead of the editor).
 */
function candidateStaticPaths(pathname) {
  let rel = decodeURIComponent(pathname || '/');
  if (!rel.startsWith('/')) rel = `/${rel}`;
  /** @type {string[]} */
  const out = [];
  const push = (p) => {
    const n = path.normalize(path.join(ROOT, p));
    if (n.startsWith(ROOT) && !out.includes(n)) out.push(n);
  };

  if (rel === '/') {
    push('index.html');
    return out;
  }

  const trimmed = rel.replace(/\/+$/, '') || '/';
  if (trimmed !== '/') {
    push(trimmed);
    push(`${trimmed}.html`);
    push(`${trimmed}/index.html`);
  }
  // SPA fallback shell from adapter-static (client-side routes)
  push('404.html');
  return out;
}

function serveStatic(req, res) {
  const incoming = new URL(req.url || '/', 'http://localhost');
  const candidates = candidateStaticPaths(incoming.pathname);

  const tryNext = (i) => {
    if (i >= candidates.length) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const filePath = candidates[i];
    fs.stat(filePath, (err, stat) => {
      if (!err && stat.isFile()) {
        sendFile(res, filePath);
        return;
      }
      tryNext(i + 1);
    });
  };
  tryNext(0);
}

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url || '/', 'http://localhost').pathname;
  if (pathname === '/__texbrain_signaling' || pathname.startsWith('/__texbrain_signaling/')) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('texbrain collab signaling (use WebSocket)\n');
    return;
  }
  for (const rule of CTAN_PROXIES) {
    if (pathname.startsWith(rule.prefix)) {
      proxyToUpstream(req, res, rule);
      return;
    }
  }
  serveStatic(req, res);
});

attachCollabSignaling(server, '/__texbrain_signaling');

server.listen(PORT, () => {
  console.log(`TeXbrain static + CTAN proxy listening on http://127.0.0.1:${PORT}`);
  console.log(`  collab signaling: ws://127.0.0.1:${PORT}/__texbrain_signaling`);
  console.log(`  build root: ${ROOT}`);
});
