import { move, moveLink, toReorderRequest } from './reorder';
import type { NavCategory } from '@h5tools/shared';

const link = (id: string) => ({
  id,
  categoryId: '',
  name: id,
  url: 'http://x',
  icon: null,
  note: null,
  sortOrder: 0,
  clickCount: 0,
  lastClickedAt: null,
});

const cats = (): NavCategory[] => [
  { id: 'c1', name: 'A', sortOrder: 0, links: [link('l1'), link('l2')] },
  { id: 'c2', name: 'B', sortOrder: 1, links: [link('l3')] },
];

describe('move', () => {
  it('向后挪', () => {
    expect(move(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });

  it('向前挪', () => {
    expect(move(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });

  it('原地不动时返回原数组', () => {
    const items = ['a', 'b'];
    expect(move(items, 1, 1)).toBe(items);
  });

  it('越界的目标位置会被夹到边界', () => {
    expect(move(['a', 'b'], 0, 99)).toEqual(['b', 'a']);
  });
});

describe('moveLink', () => {
  it('同一分类内换位置', () => {
    const r = moveLink(cats(), 'l2', 'c1', 0);
    expect(r[0]!.links.map((l) => l.id)).toEqual(['l2', 'l1']);
  });

  it('跨分类移动：源分类少一个，目标分类多一个', () => {
    const r = moveLink(cats(), 'l1', 'c2', 0);
    expect(r[0]!.links.map((l) => l.id)).toEqual(['l2']);
    expect(r[1]!.links.map((l) => l.id)).toEqual(['l1', 'l3']);
  });

  it('跨分类移动后 categoryId 跟着更新', () => {
    const r = moveLink(cats(), 'l1', 'c2', 0);
    expect(r[1]!.links[0]!.categoryId).toBe('c2');
  });

  it('链接不存在时原样返回', () => {
    const input = cats();
    expect(moveLink(input, '不存在', 'c1', 0)).toBe(input);
  });
});

describe('toReorderRequest', () => {
  it('sortOrder 按下标重排', () => {
    const req = toReorderRequest(cats());
    expect(req.categories).toEqual([
      { id: 'c1', sortOrder: 0 },
      { id: 'c2', sortOrder: 1 },
    ]);
  });

  it('链接带上所属分类与下标', () => {
    const req = toReorderRequest(cats());
    expect(req.links).toEqual([
      { id: 'l1', categoryId: 'c1', sortOrder: 0 },
      { id: 'l2', categoryId: 'c1', sortOrder: 1 },
      { id: 'l3', categoryId: 'c2', sortOrder: 0 },
    ]);
  });

  /** 一次提交整份顺序，所以不需要稀疏编号 */
  it('提交的是整份顺序，不是差量', () => {
    const req = toReorderRequest(cats());
    expect(req.categories).toHaveLength(2);
    expect(req.links).toHaveLength(3);
  });
});
