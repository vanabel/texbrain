import { execSync } from 'node:child_process';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { texlivePlugin } from './vite-texlive-plugin';

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

export default defineConfig({
  plugins: [
    // Must run before SvelteKit: provides global process / Buffer for crypto-browserify → readable-stream
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true
      },
      protocolImports: true
    }),
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
    proxy: { ...texbrainCodeloadProxy },
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
    proxy: { ...texbrainCodeloadProxy }
  },
  optimizeDeps: {
    include: ['isomorphic-git', 'buffer', 'process'],
    esbuildOptions: {
      loader: {
        '.keep': 'text'
      }
    }
  }
});
