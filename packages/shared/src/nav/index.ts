/** 导航链接。icon 为空时前端回落到「域名首字母色块」,见 spec 第 7 节。 */
export interface NavLink {
  id: string;
  categoryId: string;
  name: string;
  url: string;
  /** 图标 URL 或单个 emoji;留空则用首字母色块 */
  icon: string | null;
  note: string | null;
  sortOrder: number;
  clickCount: number;
  lastClickedAt: string | null;
}

export interface NavCategory {
  id: string;
  name: string;
  sortOrder: number;
  links: NavLink[];
}

/** GET /api/nav/tree 的响应。数据量是几十条的量级,不分页。 */
export interface NavTree {
  categories: NavCategory[];
}
