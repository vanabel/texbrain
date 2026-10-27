import { execSync } from 'node:child_process';
import http from 'node:http';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { texlivePlugin } from './vite-texlive-plugin';
import { attachCollabSignaling } from './scripts/collab-signaling.mjs';

/** Injected into the client bundle at `vite build` / `vite dev` (see `src/lib/build-meta.ts`). */
function texbrainBuildMeta(): { revision: string; repoBase: string } {
  const ghSha = process.env.GITHUB_SHA?.trim();
  let revision = '';
  if (ghSha && ghSha.length >= 7) revision = ghSha.slice(0, 7);
  else {
    const explicit = process.env.TEXBRAIN_GIT_REVISION?.trim();
    if (explicit) revision = explicit.length > 7 ? explicit.slice(0, 7) : explicit;
  }
  if (!revision) {
    try {
      revision = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    } catch {
      /* not a git checkout */
    }
  }

  let repoBase = 'https://github.com/vanabel/texbrain';
  const gr = process.env.GITHUB_REPOSITORY?.trim();
  if (gr && /^[\w.-]+\/[\w.-]+$/.test(gr)) repoBase = `https://github.com/${gr}`;

  return { revision, repoBase };
}

const injectedBuild = texbrainBuildMeta();

/** Same-origin proxy for GitHub zip (examples clone); used in dev and `pnpm preview`. */
const texbrainCodeloadProxy = {
  '/__texbrain_codeload': {
    target: 'https://codeload.github.com',
    changeOrigin: true,
    secure: true,
    rewrite: (p: string) => p.replace(/^\/__texbrain_codeload/, '')
  }
} as const;

/** CTAN mirror + JSON API (auto-fetch missing .sty); dev/preview + same paths on NAS nginx. */
const texbrainCtanProxy = {
  '/__texbrain_ctan_ustc': {
    target: 'https://mirrors.ustc.edu.cn',
    changeOrigin: true,
    secure: true,
    rewrite: (p: string) => p.replace(/^\/__texbrain_ctan_ustc/, '')
  },
  '/__texbrain_ctan_tsinghua': {
    target: 'https://mirrors.tuna.tsinghua.edu.cn',
    changeOrigin: true,
    secure: true,
    rewrite: (p: string) => p.replace(/^\/__texbrain_ctan_tsinghua/, '')
  },
  '/__texbrain_ctan_json': {
    target: 'https://www.ctan.org',
    changeOrigin: true,
    secure: true,
    rewrite: (p: string) => p.replace(/^\/__texbrain_ctan_json/, '')
  }
} as const;

/** Same-origin collab signaling for `vite dev` / `vite preview` (matches production). */
const texbrainSignalingProxy = {
  '/__texbrain_signaling': {
    target: 'ws://127.0.0.1:4444',
    ws: true,
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/__texbrain_signaling/, '') || '/'
  }
} as const;

function collabSignalingDevPlugin(): Plugin {
  let started = false;
  return {
    name: 'texbrain-collab-signaling',
    configureServer() {
      if (started) return;
      started = true;
      const server = http.createServer((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('texbrain collab signaling\n');
      });
      attachCollabSignaling(server, '/');
      server.listen(4444, '127.0.0.1', () => {
        console.log('TeXbrain collab signaling (dev) ws://127.0.0.1:4444');
      });
      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          console.log('TeXbrain collab signaling already on :4444');
        } else {
          console.warn('collab signaling:', err.message);
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [
    // Must run before SvelteKit: provides process / Buffer for crypto-browserify → readable-stream
    nodePolyfills({
      globals: {
        Buffer: true,
        // `define.global` below already rewrites the identifier to `globalThis`.
        // Injecting the shim as well leaves an unused default import in Svelte's
        // SSR renderer, whose class field is also named `global`.
        global: false,
        process: true
      },
      protocolImports: true
    }),
    collabSignalingDevPlugin(),
    tailwindcss(),
    texlivePlugin(),
    sveltekit()
  ],
  define: {
    global: 'globalThis',
    // Separate string literals so SSR/client prerender both get valid replacements (not `[object Object]`).
    __TEXBRAIN_GIT_REVISION__: JSON.stringify(injectedBuild.revision),
    __TEXBRAIN_REPO_BASE__: JSON.stringify(injectedBuild.repoBase)
  },
  resolve: {
    alias: {
      buffer: 'buffer/'
    }
  },
  worker: {
    format: 'es'
  },
  server: {
    proxy: { ...texbrainCodeloadProxy, ...texbrainCtanProxy, ...texbrainSignalingProxy },
    watch: {
      // ignore latex artifacts and texlive cache to prevent hot reload on file save
      ignored: [
        '**/*.tex', '**/*.bib', '**/*.bbl', '**/*.aux', '**/*.log',
        '**/*.blg', '**/*.out', '**/*.toc', '**/*.lof', '**/*.lot',
        '**/*.fls', '**/*.fdb_latexmk', '**/*.bcf', '**/*.run.xml',
        '**/static/texlive/cache/**'
      ]
    }
  },
  preview: {
    proxy: { ...texbrainCodeloadProxy, ...texbrainCtanProxy, ...texbrainSignalingProxy }
  },
  build: {
    // Gzip size reporting walks every emitted asset (pdf.worker ~2MB, BusyTeX chunks).
    // On a NAS CPU this alone can add minutes; sizes still show in the file listing.
    reportCompressedSize: false,
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('pdfjs-dist')) return 'vendor-pdfjs';
          if (id.includes('isomorphic-git') || id.includes('@isomorphic-git')) return 'vendor-git';
          if (id.includes('@codemirror') || id.includes('@lezer') || id.includes('codemirror')) {
            return 'vendor-codemirror';
          }
          if (
            id.includes('/yjs/') ||
            id.includes('y-codemirror') ||
            id.includes('y-webrtc') ||
            id.includes('/lib0/')
          ) {
            return 'vendor-collab';
          }
          if (id.includes('@vanabel/texlyre-busytex') || id.includes('texlyre-busytex')) {
            return 'vendor-busytex';
          }
          if (
            id.includes('browserify') ||
            id.includes('crypto-browserify') ||
            id.includes('create-ecdh') ||
            id.includes('diffie-hellman') ||
            id.includes('public-encrypt') ||
            id.includes('vm-browserify')
          ) {
            return 'vendor-crypto';
          }
        }
      }
    }
  },
  optimizeDeps: {
    include: ['isomorphic-git', 'buffer', 'process', '@replit/codemirror-vim'],
    esbuildOptions: {
      loader: {
        '.keep': 'text'
      }
    }
  }
});
