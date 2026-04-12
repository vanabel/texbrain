import { base } from '$app/paths';

/**
 * 公网站点 origin（不含路径）。GitHub Pages 项目页示例：`PUBLIC_SITE_ORIGIN=https://yourname.github.io`，并另设 `BASE_PATH=/repo`。
 * 自定义根域名：`PUBLIC_SITE_ORIGIN=https://tex.example.com`，`BASE_PATH` 留空。
 */
const raw = import.meta.env.PUBLIC_SITE_ORIGIN as string | undefined;
export const publicSiteOrigin = (raw?.trim() || 'https://tex.vanabel.cn').replace(/\/$/, '');

/** 绝对 URL（含 `base`），用于 canonical、og:url、og:image。 */
export function siteUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${publicSiteOrigin}${base}${p}`;
}
