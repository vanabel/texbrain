import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { texlivePlugin } from './vite-texlive-plugin';

export default defineConfig({
  plugins: [tailwindcss(), texlivePlugin(), sveltekit()],
  define: {
    'global': 'globalThis'
  },
  resolve: {
    alias: {
      buffer: 'buffer/',
      // isomorphic-git / sha.js expect Node's crypto.createHash in the browser bundle
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      util: 'util'
    }
  },
  worker: {
    format: 'es'
  },
  server: {
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
  optimizeDeps: {
    include: ['isomorphic-git', 'crypto-browserify', 'buffer', 'stream-browserify', 'util'],
    esbuildOptions: {
      loader: {
        '.keep': 'text'
      }
    }
  }
});
