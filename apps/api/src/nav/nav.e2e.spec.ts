import request from 'supertest';
import type { NavCategory, NavLink, NavTree } from '@h5tools/shared';
import { createTestApp, createUserAndLogin, type LoggedInUser, type TestApp } from '../test/app.js';

describe('URL 导航 (契约)', () => {
  let ctx: TestApp;
  let me: LoggedInUser;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await ctx.reset();
    me = await createUserAndLogin(ctx, 'alice');
  });

  const asMe = () => me.cookie;

  const createCategory = async (name: string): Promise<NavCategory> =>
    (
      await request(ctx.server)
        .post('/nav/categories')
        .set('Cookie', asMe())
        .send({ name })
        .expect(201)
    ).body;

  const createLink = async (categoryId: string, name: string, url: string): Promise<NavLink> =>
    (
      await request(ctx.server)
        .post('/nav/links')
        .set('Cookie', asMe())
        .send({ categoryId, name, url })
        .expect(201)
    ).body;

  const getTree = async (): Promise<NavTree> =>
    (await request(ctx.server).get('/nav/tree').set('Cookie', asMe()).expect(200)).body;

  describe('鉴权', () => {
    it('未登录一律 401', async () => {
      await request(ctx.server).get('/nav/tree').expect(401);
      await request(ctx.server).post('/nav/categories').send({ name: 'x' }).expect(401);
    });
  });

  describe('分类与链接', () => {
    it('空账号返回空树', async () => {
      expect(await getTree()).toEqual({ categories: [] });
    });

    it('新建的分类排在最后，不抢第一位', async () => {
      await createCategory('常用');
      await createCategory('文档');
      const tree = await getTree();
      expect(tree.categories.map((c) => c.name)).toEqual(['常用', '文档']);
      expect(tree.categories[0]!.sortOrder).toBeLessThan(tree.categories[1]!.sortOrder);
    });

    it('链接挂在分类下，字段完整', async () => {
      const cat = await createCategory('常用');
      await createLink(cat.id, 'Jenkins', 'http://jenkins:8080');

      const [c] = (await getTree()).categories;
      expect(c!.links).toHaveLength(1);
      expect(c!.links[0]).toMatchObject({
        name: 'Jenkins',
        url: 'http://jenkins:8080',
        icon: null,
        clickCount: 0,
        lastClickedAt: null,
      });
    });

    /**
     * 这条很重要：个人效率工具里相当一部分链接是**内网地址**，
     * 而默认的严格 URL 校验会把没有顶级域名的主机名全部拒掉 ——
     * 那恰恰是这个导航页最该收录的东西。
     */
    it('接受内网地址（无顶级域名、纯 IP、带端口）', async () => {
      const cat = await createCategory('内网');
      await createLink(cat.id, 'Jenkins', 'http://jenkins:8080');
      await createLink(cat.id, 'Redis 面板', 'http://192.0.2.10:6379');
      await createLink(cat.id, '内网 Wiki', 'http://wiki/page/1');
      expect((await getTree()).categories[0]!.links).toHaveLength(3);
    });

    it('拒绝不带协议的地址', async () => {
      const cat = await createCategory('常用');
      await request(ctx.server)
        .post('/nav/links')
        .set('Cookie', asMe())
        .send({ categoryId: cat.id, name: 'x', url: 'jenkins:8080' })
        .expect(400);
    });

    it('改名', async () => {
      const cat = await createCategory('常用');
      await request(ctx.server)
        .patch(`/nav/categories/${cat.id}`)
        .set('Cookie', asMe())
        .send({ name: '改过了' })
        .expect(200);
      expect((await getTree()).categories[0]!.name).toBe('改过了');
    });

    it('删分类时连带删掉它下面的链接', async () => {
      const cat = await createCategory('常用');
      await createLink(cat.id, 'Jenkins', 'http://jenkins:8080');

      await request(ctx.server)
        .delete(`/nav/categories/${cat.id}`)
        .set('Cookie', asMe())
        .expect(204);

      expect((await getTree()).categories).toHaveLength(0);
      // 链接也要真的没了，不能变成挂在不存在分类下的孤儿
      expect(await ctx.prisma.link.count()).toBe(0);
    });
  });

  describe('排序', () => {
    it('批量提交顺序后持久生效', async () => {
      const a = await createCategory('A');
      const b = await createCategory('B');

      await request(ctx.server)
        .patch('/nav/order')
        .set('Cookie', asMe())
        .send({
          categories: [
            { id: a.id, sortOrder: 10 },
            { id: b.id, sortOrder: 0 },
          ],
        })
        .expect(204);

      expect((await getTree()).categories.map((c) => c.name)).toEqual(['B', 'A']);
    });

    it('链接可以跨分类移动', async () => {
      const a = await createCategory('A');
      const b = await createCategory('B');
      const link = await createLink(a.id, 'Jenkins', 'http://jenkins:8080');

      await request(ctx.server)
        .patch('/nav/order')
        .set('Cookie', asMe())
        .send({ links: [{ id: link.id, categoryId: b.id, sortOrder: 0 }] })
        .expect(204);

      const tree = await getTree();
      expect(tree.categories.find((c) => c.name === 'A')!.links).toHaveLength(0);
      expect(tree.categories.find((c) => c.name === 'B')!.links).toHaveLength(1);
    });
  });

  describe('点击统计', () => {
    it('上报后计数加一并记录时间', async () => {
      const cat = await createCategory('常用');
      const link = await createLink(cat.id, 'Jenkins', 'http://jenkins:8080');

      await request(ctx.server)
        .post(`/nav/links/${link.id}/click`)
        .set('Cookie', asMe())
        .expect(204);
      await request(ctx.server)
        .post(`/nav/links/${link.id}/click`)
        .set('Cookie', asMe())
        .expect(204);

      const updated = (await getTree()).categories[0]!.links[0]!;
      expect(updated.clickCount).toBe(2);
      expect(updated.lastClickedAt).not.toBeNull();
    });

    /**
     * 「累加计数不衰减」是一个已知取舍，重置按钮是它唯一的出口。
     * 这条测试是那个取舍能否被接受的前提。
     */
    it('重置把计数清零、时间清空', async () => {
      const cat = await createCategory('常用');
      const link = await createLink(cat.id, 'Jenkins', 'http://jenkins:8080');
      await request(ctx.server).post(`/nav/links/${link.id}/click`).set('Cookie', asMe());

      await request(ctx.server).post('/nav/stats/reset').set('Cookie', asMe()).expect(204);

      const updated = (await getTree()).categories[0]!.links[0]!;
      expect(updated.clickCount).toBe(0);
      expect(updated.lastClickedAt).toBeNull();
    });
  });

  /**
   * 链接不直接带 userId（它挂在分类下），所以凡是按 linkId 操作都要经分类回溯校验。
   * 少一次校验就是一个越权接口，**而且不会有任何报错提醒你** —— 只能靠测试盯着。
   */
  describe('越权', () => {
    let other: LoggedInUser;
    let otherCategoryId: string;
    let otherLinkId: string;

    beforeEach(async () => {
      other = await createUserAndLogin(ctx, 'bob');
      const cat = await ctx.prisma.category.create({
        data: { userId: other.id, name: '鲍勃的分类' },
      });
      const link = await ctx.prisma.link.create({
        data: { categoryId: cat.id, name: '鲍勃的链接', url: 'http://bob.internal' },
      });
      otherCategoryId = cat.id;
      otherLinkId = link.id;
    });

    it('看不到别人的树', async () => {
      expect((await getTree()).categories).toHaveLength(0);
      const theirs = await request(ctx.server)
        .get('/nav/tree')
        .set('Cookie', other.cookie)
        .expect(200);
      expect(theirs.body.categories).toHaveLength(1);
    });

    it('改不了别人的分类', async () => {
      await request(ctx.server)
        .patch(`/nav/categories/${otherCategoryId}`)
        .set('Cookie', asMe())
        .send({ name: '被我改了' })
        .expect(403);
    });

    it('删不了别人的分类', async () => {
      await request(ctx.server)
        .delete(`/nav/categories/${otherCategoryId}`)
        .set('Cookie', asMe())
        .expect(403);
      expect(await ctx.prisma.category.count()).toBe(1);
    });

    it('改不了别人的链接', async () => {
      await request(ctx.server)
        .patch(`/nav/links/${otherLinkId}`)
        .set('Cookie', asMe())
        .send({ name: '被我改了' })
        .expect(403);
    });

    it('删不了别人的链接', async () => {
      await request(ctx.server)
        .delete(`/nav/links/${otherLinkId}`)
        .set('Cookie', asMe())
        .expect(403);
    });

    it('不能往别人的分类里塞链接', async () => {
      await request(ctx.server)
        .post('/nav/links')
        .set('Cookie', asMe())
        .send({ categoryId: otherCategoryId, name: 'x', url: 'http://x.internal' })
        .expect(403);
    });

    it('不能把自己的链接移进别人的分类', async () => {
      const mine = await createCategory('我的');
      const link = await createLink(mine.id, 'x', 'http://x.internal');
      await request(ctx.server)
        .patch('/nav/order')
        .set('Cookie', asMe())
        .send({ links: [{ id: link.id, categoryId: otherCategoryId, sortOrder: 0 }] })
        .expect(403);
    });

    it('不能给别人的链接刷点击数', async () => {
      await request(ctx.server)
        .post(`/nav/links/${otherLinkId}/click`)
        .set('Cookie', asMe())
        .expect(403);
    });

    it('重置统计不影响别人', async () => {
      await ctx.prisma.link.update({ where: { id: otherLinkId }, data: { clickCount: 42 } });
      await request(ctx.server).post('/nav/stats/reset').set('Cookie', asMe()).expect(204);

      const theirs = await ctx.prisma.link.findUnique({ where: { id: otherLinkId } });
      expect(theirs?.clickCount).toBe(42);
    });
  });
});
