import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  NavCategory,
  NavLink,
  NavTree,
  CreateCategoryRequest,
  CreateLinkRequest,
  ReorderRequest,
  UpdateCategoryRequest,
  UpdateLinkRequest,
} from '@h5tools/shared';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * 导航数据。
 *
 * ## 越权是这里唯一真正危险的 bug
 *
 * 每一个方法都必须把操作限定在调用者自己的数据上。链接不直接带 userId
 * （它挂在分类下），所以**凡是按 linkId 操作，都要先经分类回溯校验归属** ——
 * 少一次校验就是一个越权读写接口，而且不会有任何报错提醒你。
 *
 * 契约测试里有一组专门的越权用例盯着这件事。
 */
@Injectable()
export class NavService {
  constructor(private readonly prisma: PrismaService) {}

  async tree(userId: string): Promise<NavTree> {
    const categories = await this.prisma.category.findMany({
      where: { userId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        links: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      },
    });
    return { categories: categories.map(toCategory) };
  }

  async createCategory(userId: string, dto: CreateCategoryRequest): Promise<NavCategory> {
    // 新分类排在最后，而不是抢到第一位
    const max = await this.prisma.category.aggregate({
      where: { userId },
      _max: { sortOrder: true },
    });
    const created = await this.prisma.category.create({
      data: { userId, name: dto.name, sortOrder: (max._max.sortOrder ?? -1) + 1 },
      include: { links: true },
    });
    return toCategory(created);
  }

  async updateCategory(
    userId: string,
    id: string,
    dto: UpdateCategoryRequest,
  ): Promise<NavCategory> {
    await this.assertCategoryOwned(userId, id);
    const updated = await this.prisma.category.update({
      where: { id },
      data: { name: dto.name },
      include: { links: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } },
    });
    return toCategory(updated);
  }

  async deleteCategory(userId: string, id: string): Promise<void> {
    await this.assertCategoryOwned(userId, id);
    // 分类下的链接跟着删（schema 里是 onDelete: Cascade）
    await this.prisma.category.delete({ where: { id } });
  }

  async createLink(userId: string, dto: CreateLinkRequest): Promise<NavLink> {
    await this.assertCategoryOwned(userId, dto.categoryId);
    const max = await this.prisma.link.aggregate({
      where: { categoryId: dto.categoryId },
      _max: { sortOrder: true },
    });
    const created = await this.prisma.link.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        url: dto.url,
        icon: dto.icon ?? null,
        note: dto.note ?? null,
        sortOrder: (max._max.sortOrder ?? -1) + 1,
      },
    });
    return toLink(created);
  }

  async updateLink(userId: string, id: string, dto: UpdateLinkRequest): Promise<NavLink> {
    await this.assertLinkOwned(userId, id);
    // 移动到另一个分类时，目标分类也必须是自己的
    if (dto.categoryId) await this.assertCategoryOwned(userId, dto.categoryId);

    const updated = await this.prisma.link.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        url: dto.url,
        icon: dto.icon,
        note: dto.note,
      },
    });
    return toLink(updated);
  }

  async deleteLink(userId: string, id: string): Promise<void> {
    await this.assertLinkOwned(userId, id);
    await this.prisma.link.delete({ where: { id } });
  }

  /**
   * 一次提交整份顺序。
   *
   * 包在一个事务里：拖拽一次会改动多条记录，中途失败留下顺序错乱的中间状态
   * 比不生效更糟 —— 用户看到的是"拖了一半"。
   */
  async reorder(userId: string, dto: ReorderRequest): Promise<void> {
    const categoryIds = (dto.categories ?? []).map((c) => c.id);
    const linkIds = (dto.links ?? []).map((l) => l.id);
    const targetCategoryIds = (dto.links ?? []).map((l) => l.categoryId);

    await Promise.all([
      ...[...new Set([...categoryIds, ...targetCategoryIds])].map((id) =>
        this.assertCategoryOwned(userId, id),
      ),
      ...linkIds.map((id) => this.assertLinkOwned(userId, id)),
    ]);

    await this.prisma.$transaction([
      ...(dto.categories ?? []).map((c) =>
        this.prisma.category.update({ where: { id: c.id }, data: { sortOrder: c.sortOrder } }),
      ),
      ...(dto.links ?? []).map((l) =>
        this.prisma.link.update({
          where: { id: l.id },
          data: { sortOrder: l.sortOrder, categoryId: l.categoryId },
        }),
      ),
    ]);
  }

  /** 点击上报。前端用 sendBeacon 打，不阻塞跳转。 */
  async recordClick(userId: string, id: string): Promise<void> {
    await this.assertLinkOwned(userId, id);
    await this.prisma.link.update({
      where: { id },
      data: { clickCount: { increment: 1 }, lastClickedAt: new Date() },
    });
  }

  /**
   * 重置全部点击计数。
   *
   * 这个按钮是「累加计数不衰减」这个已知取舍的配套出口：工作重心换了之后，
   * 旧数据会一直霸占「常用」区，手动清一次就行。
   */
  async resetStats(userId: string): Promise<void> {
    await this.prisma.link.updateMany({
      where: { category: { userId } },
      data: { clickCount: 0, lastClickedAt: null },
    });
  }

  private async assertCategoryOwned(userId: string, id: string): Promise<void> {
    const found = await this.prisma.category.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!found) throw new NotFoundException('分类不存在');
    // 不存在与不属于你返回不同的状态码是可以接受的：能猜到一个 uuid 已经很难了，
    // 而把两者混为 404 会让自己调试时分不清是打错 id 还是真越权。
    if (found.userId !== userId) throw new ForbiddenException('无权操作该分类');
  }

  private async assertLinkOwned(userId: string, id: string): Promise<void> {
    const found = await this.prisma.link.findUnique({
      where: { id },
      select: { category: { select: { userId: true } } },
    });
    if (!found) throw new NotFoundException('链接不存在');
    if (found.category.userId !== userId) throw new ForbiddenException('无权操作该链接');
  }
}

type CategoryRow = {
  id: string;
  name: string;
  sortOrder: number;
  links: LinkRow[];
};

type LinkRow = {
  id: string;
  categoryId: string;
  name: string;
  url: string;
  icon: string | null;
  note: string | null;
  sortOrder: number;
  clickCount: number;
  lastClickedAt: Date | null;
};

function toCategory(row: CategoryRow): NavCategory {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sortOrder,
    links: row.links.map(toLink),
  };
}

function toLink(row: LinkRow): NavLink {
  return {
    id: row.id,
    categoryId: row.categoryId,
    name: row.name,
    url: row.url,
    icon: row.icon,
    note: row.note,
    sortOrder: row.sortOrder,
    clickCount: row.clickCount,
    // 契约里是 ISO 字符串，不是 Date —— 前后端共享类型，前端拿到的本来就是字符串
    lastClickedAt: row.lastClickedAt?.toISOString() ?? null,
  };
}
