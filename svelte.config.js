import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** GitHub Pages 等项目子路径部署时设置 `BASE_PATH=/repo`（以 `/` 开头）。根域名部署留空。 */
const rawBase = process.env.BASE_PATH ?? '';
const base = rawBase === '' ? '' : rawBase.startsWith('/') ? rawBase : `/${rawBase}`;

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: '404.html',
      precompress: false,
      strict: true
    }),
    paths: {
      base
    }
  }
};

export default config;
