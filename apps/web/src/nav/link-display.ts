import type { NavCategory, NavLink, NavTree } from '@h5tools/shared';

/**
 * 从 URL 取出用于展示的主机名。
 *
 * 内网地址（`http://jenkins:8080`）没有顶级域名，`URL` 仍能正常解析，
 * hostname 就是 `jenkins` —— 这正是我们要的。
 */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * 首字母。取主机名里第一个字母或数字。
 *
 * `www.` 要跳过 —— 否则一整排网站的图标全是 W，等于没有图标。
 */
export function initialOf(url: string): string {
  const host = hostOf(url).replace(/^www\./i, '');
  const ch = host.match(/[a-z0-9一-龥]/i);
  return (ch?.[0] ?? '?').toUpperCase();
}

/**
 * 按主机名哈希出一个固定色相。
 *
 * 关键是**同一个域名永远同一个颜色** —— 颜色是这里唯一的辨识线索，
 * 每次刷新都变的话就完全失去意义了。所以不能用随机数。
 */
export function hueOf(url: string): number {
  const host = hostOf(url);
  let hash = 0;
  for (let i = 0; i < host.length; i++) {
    hash = (hash * 31 + host.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
}

export interface IconStyle {
  /** 有值时直接用它（URL 或 emoji），忽略下面两项 */
  custom: string | null;
  initial: string;
  background: string;
}

export function iconOf(link: Pick<NavLink, 'url' | 'icon'>): IconStyle {
  const hue = hueOf(link.url);
  return {
    custom: link.icon?.trim() ? link.icon.trim() : null,
    initial: initialOf(link.url),
    // 饱和度和亮度固定，只变色相 —— 保证整页色块的明度一致，不会有几个特别刺眼
    background: `hsl(${hue} 52% 46%)`,
  };
}

/** 自定义图标是图片地址还是 emoji/文字 */
export function isImageIcon(custom: string): boolean {
  return /^(https?:\/\/|data:image\/|\/)/i.test(custom);
}

/**
 * 前端过滤。几十条数据不值得走后端。
 *
 * 分类名命中时保留整个分类（连同它全部链接）—— 用户搜"文档"是想看那一类，
 * 不是想看名字里带"文档"的链接。
 */
export function filterTree(tree: NavTree, query: string): NavCategory[] {
  const q = query.trim().toLowerCase();
  if (!q) return tree.categories;

  return tree.categories
    .map((category) => {
      if (category.name.toLowerCase().includes(q)) return category;
      const links = category.links.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.url.toLowerCase().includes(q) ||
          (l.note ?? '').toLowerCase().includes(q),
      );
      return { ...category, links };
    })
    .filter((c) => c.links.length > 0);
}

/**
 * 「常用」区：按点击数取前 N。
 *
 * 从未点过的链接（clickCount 为 0）**不进常用区** —— 否则新账号的常用区里
 * 会摆着一堆随机链接，那是误导。
 */
export function topLinks(tree: NavTree, n: number): NavLink[] {
  return tree.categories
    .flatMap((c) => c.links)
    .filter((l) => l.clickCount > 0)
    .sort((a, b) => b.clickCount - a.clickCount || a.name.localeCompare(b.name))
    .slice(0, n);
}
