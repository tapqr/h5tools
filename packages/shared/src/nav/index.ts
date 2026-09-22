/** 导航链接。icon 为空时前端回落到「域名首字母色块」。 */
export interface NavLink {
  id: string;
  categoryId: string;
  name: string;
  url: string;
  /** 图标 URL 或单个 emoji；留空则用首字母色块 */
  icon: string | null;
  note: string | null;
  sortOrder: number;
  clickCount: number;
  /** ISO 字符串。从未点过为 null。 */
  lastClickedAt: string | null;
}

export interface NavCategory {
  id: string;
  name: string;
  sortOrder: number;
  links: NavLink[];
}

/** GET /api/nav/tree 的响应。数据量是几十条的量级，不分页。 */
export interface NavTree {
  categories: NavCategory[];
}

// --- 写入契约 ---

export interface CreateCategoryRequest {
  name: string;
}

export interface UpdateCategoryRequest {
  name?: string;
}

export interface CreateLinkRequest {
  categoryId: string;
  name: string;
  url: string;
  icon?: string | null;
  note?: string | null;
}

export type UpdateLinkRequest = Partial<Omit<CreateLinkRequest, 'categoryId'>> & {
  /** 给出时表示把链接移到另一个分类下 */
  categoryId?: string;
};

/**
 * 批量提交新顺序。
 *
 * 一次提交整份顺序而不是逐条 PATCH：拖拽一次会改动多条记录的 sortOrder，
 * 逐条发请求的话中途失败会留下一个顺序错乱的中间状态。
 */
export interface ReorderRequest {
  categories?: Array<{ id: string; sortOrder: number }>;
  /** categoryId 允许与原来不同 —— 拖拽可以跨分类移动链接 */
  links?: Array<{ id: string; categoryId: string; sortOrder: number }>;
}
