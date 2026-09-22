import type { NavCategory, ReorderRequest } from '@h5tools/shared';

/**
 * 把一个数组元素从 from 挪到 to，返回新数组。
 */
export function move<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= items.length) return items;
  const next = items.slice();
  const [item] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item!);
  return next;
}

/**
 * 把「拖完之后的分类数组」翻译成一次提交的顺序请求。
 *
 * sortOrder 直接用下标重排，不做稀疏留空那套 —— 每次拖拽都提交整份顺序，
 * 没有"插进两个数之间"的需求，稀疏编号只会带来"什么时候要重新整理"的额外问题。
 */
export function toReorderRequest(categories: NavCategory[]): ReorderRequest {
  return {
    categories: categories.map((c, i) => ({ id: c.id, sortOrder: i })),
    links: categories.flatMap((c) =>
      c.links.map((l, i) => ({ id: l.id, categoryId: c.id, sortOrder: i })),
    ),
  };
}

/** 把链接从一个分类挪到另一个分类的指定位置 */
export function moveLink(
  categories: NavCategory[],
  linkId: string,
  toCategoryId: string,
  toIndex: number,
): NavCategory[] {
  const source = categories.find((c) => c.links.some((l) => l.id === linkId));
  if (!source) return categories;
  const link = source.links.find((l) => l.id === linkId)!;

  return categories.map((c) => {
    if (c.id === source.id && c.id === toCategoryId) {
      // 同一分类内移动
      const from = c.links.findIndex((l) => l.id === linkId);
      return { ...c, links: move(c.links, from, toIndex) };
    }
    if (c.id === source.id) {
      return { ...c, links: c.links.filter((l) => l.id !== linkId) };
    }
    if (c.id === toCategoryId) {
      const links = c.links.slice();
      links.splice(Math.max(0, Math.min(toIndex, links.length)), 0, { ...link, categoryId: c.id });
      return { ...c, links };
    }
    return c;
  });
}
