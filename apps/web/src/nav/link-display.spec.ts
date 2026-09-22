import { filterTree, hostOf, hueOf, initialOf, isImageIcon, iconOf, topLinks } from './link-display';
import type { NavTree } from '@h5tools/shared';

const link = (over: Partial<NavTree['categories'][0]['links'][0]>) => ({
  id: 'x',
  categoryId: 'c',
  name: 'x',
  url: 'http://example.com',
  icon: null,
  note: null,
  sortOrder: 0,
  clickCount: 0,
  lastClickedAt: null,
  ...over,
});

const tree = (categories: NavTree['categories']): NavTree => ({ categories });

describe('hostOf', () => {
  it('解析普通地址', () => {
    expect(hostOf('https://github.com/x/y')).toBe('github.com');
  });

  it('内网地址也能解析（没有顶级域名）', () => {
    expect(hostOf('http://jenkins:8080/job/build')).toBe('jenkins');
  });

  it('解析不了就原样返回，不抛异常', () => {
    expect(hostOf('不是一个地址')).toBe('不是一个地址');
  });
});

describe('initialOf', () => {
  it('取主机名首字母并大写', () => {
    expect(initialOf('https://github.com')).toBe('G');
  });

  /** 不跳过 www. 的话，一整排网站的图标全是 W，等于没有图标 */
  it('跳过 www.', () => {
    expect(initialOf('https://www.baidu.com')).toBe('B');
  });

  it('内网主机名', () => {
    expect(initialOf('http://jenkins:8080')).toBe('J');
  });

  it('纯 IP 取第一位数字', () => {
    expect(initialOf('http://192.0.2.10:6379')).toBe('1');
  });
});

describe('hueOf', () => {
  /** 颜色是唯一的辨识线索，每次刷新都变就毫无意义 */
  it('同一域名永远同一个色相', () => {
    expect(hueOf('https://github.com/a')).toBe(hueOf('https://github.com/b'));
  });

  it('不同域名基本不会撞色', () => {
    const hues = ['a.com', 'b.com', 'c.com', 'jenkins', 'wiki'].map((h) => hueOf(`http://${h}`));
    expect(new Set(hues).size).toBeGreaterThan(3);
  });

  it('落在合法色相区间', () => {
    expect(hueOf('http://x')).toBeGreaterThanOrEqual(0);
    expect(hueOf('http://x')).toBeLessThan(360);
  });
});

describe('iconOf', () => {
  it('没有自定义图标时给出首字母与底色', () => {
    const icon = iconOf(link({ url: 'https://github.com' }));
    expect(icon.custom).toBeNull();
    expect(icon.initial).toBe('G');
    expect(icon.background).toMatch(/^hsl\(/);
  });

  it('有自定义图标时优先用它', () => {
    expect(iconOf(link({ icon: '🚀' })).custom).toBe('🚀');
  });

  it('只有空白的自定义图标视为没有', () => {
    expect(iconOf(link({ icon: '   ' })).custom).toBeNull();
  });
});

describe('isImageIcon', () => {
  it('http 地址是图片', () => {
    expect(isImageIcon('https://x.com/i.png')).toBe(true);
  });

  it('emoji 不是图片', () => {
    expect(isImageIcon('🚀')).toBe(false);
  });
});

describe('filterTree', () => {
  const t = tree([
    {
      id: 'c1',
      name: '开发',
      sortOrder: 0,
      links: [
        link({ id: 'l1', name: 'Jenkins', url: 'http://jenkins:8080' }),
        link({ id: 'l2', name: 'GitLab', url: 'http://gitlab.internal' }),
      ],
    },
    {
      id: 'c2',
      name: '文档',
      sortOrder: 1,
      links: [link({ id: 'l3', name: 'Wiki', url: 'http://wiki', note: '内部知识库' })],
    },
  ]);

  it('空查询返回全部', () => {
    expect(filterTree(t, '  ')).toHaveLength(2);
  });

  it('按链接名过滤，并丢掉空分类', () => {
    const r = filterTree(t, 'jenkins');
    expect(r).toHaveLength(1);
    expect(r[0]!.links.map((l) => l.name)).toEqual(['Jenkins']);
  });

  it('按 URL 过滤', () => {
    expect(filterTree(t, 'gitlab')[0]!.links[0]!.name).toBe('GitLab');
  });

  it('按备注过滤', () => {
    expect(filterTree(t, '知识库')[0]!.links[0]!.name).toBe('Wiki');
  });

  /** 搜分类名是想看那一类，不是想看名字里带这个词的链接 */
  it('分类名命中时保留整个分类', () => {
    const r = filterTree(t, '开发');
    expect(r[0]!.links).toHaveLength(2);
  });

  it('大小写不敏感', () => {
    expect(filterTree(t, 'JENKINS')).toHaveLength(1);
  });
});

describe('topLinks', () => {
  const t = tree([
    {
      id: 'c1',
      name: 'x',
      sortOrder: 0,
      links: [
        link({ id: 'a', name: 'A', clickCount: 5 }),
        link({ id: 'b', name: 'B', clickCount: 9 }),
        link({ id: 'c', name: 'C', clickCount: 0 }),
      ],
    },
  ]);

  it('按点击数从多到少', () => {
    expect(topLinks(t, 8).map((l) => l.name)).toEqual(['B', 'A']);
  });

  /** 否则新账号的常用区里会摆着一堆随机链接，那是误导 */
  it('从未点过的不进常用区', () => {
    expect(topLinks(t, 8).map((l) => l.name)).not.toContain('C');
  });

  it('取前 N', () => {
    expect(topLinks(t, 1)).toHaveLength(1);
  });

  it('全都没点过时常用区为空', () => {
    const empty = tree([{ id: 'c', name: 'x', sortOrder: 0, links: [link({ clickCount: 0 })] }]);
    expect(topLinks(empty, 8)).toEqual([]);
  });
});
