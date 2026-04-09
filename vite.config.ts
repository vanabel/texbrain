import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { texlivePlugin } from './vite-texlive-plugin';

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
    global: 'globalThis'
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
