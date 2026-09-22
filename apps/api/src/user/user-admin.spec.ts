import request from 'supertest';
import { createTestApp, type TestApp } from '../test/app.js';
import { UserAdminError, UserAdminService, MIN_PASSWORD_LENGTH } from './user-admin.service.js';
import { assertNoInitialPassword } from '../auth/startup-password-check.js';

describe('账号管理', () => {
  let ctx: TestApp;
  let users: UserAdminService;
  const originalEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    ctx = await createTestApp();
    users = ctx.app.get(UserAdminService);
  });

  afterAll(async () => {
    process.env.NODE_ENV = originalEnv;
    await ctx.close();
  });

  beforeEach(async () => {
    await ctx.reset();
    process.env.NODE_ENV = originalEnv;
  });

  describe('create', () => {
    it('生成的随机密码足够长，且能用它登录', async () => {
      const { password } = await users.create('zhangsan', '张三');
      expect(password.length).toBeGreaterThanOrEqual(MIN_PASSWORD_LENGTH);

      await request(ctx.server)
        .post('/auth/login')
        .send({ username: 'zhangsan', password })
        .expect(200);
    });

    it('两次生成的密码不同', async () => {
      const a = await users.create('a');
      const b = await users.create('b');
      expect(a.password).not.toBe(b.password);
    });

    it('账号重复会报错', async () => {
      await users.create('zhangsan');
      await expect(users.create('zhangsan')).rejects.toThrow(UserAdminError);
    });

    it('建出来的账号记为已改密（随机强密码不是初始弱口令）', async () => {
      await users.create('zhangsan');
      const [u] = await users.list();
      expect(u?.passwordChanged).toBe(true);
    });
  });

  describe('changePassword', () => {
    it('改完能用新密码登录、旧密码失效', async () => {
      const { password: old } = await users.create('zhangsan');
      await users.changePassword('zhangsan', 'a-properly-long-password');

      await request(ctx.server)
        .post('/auth/login')
        .send({ username: 'zhangsan', password: 'a-properly-long-password' })
        .expect(200);
      await request(ctx.server)
        .post('/auth/login')
        .send({ username: 'zhangsan', password: old })
        .expect(401);
    });

    it('改密码会踢掉该账号已有的会话', async () => {
      const { password } = await users.create('zhangsan');
      const cookie = (
        await request(ctx.server).post('/auth/login').send({ username: 'zhangsan', password })
      ).headers['set-cookie'];
      await request(ctx.server).get('/auth/me').set('Cookie', cookie).expect(200);

      const killed = await users.changePassword('zhangsan', 'a-properly-long-password');
      expect(killed).toBe(1);
      // 改了密码却不踢会话，等于对已登录的攻击者毫无影响
      await request(ctx.server).get('/auth/me').set('Cookie', cookie).expect(401);
    });

    it('拒绝过短的密码', async () => {
      await users.create('zhangsan');
      await expect(users.changePassword('zhangsan', 'short')).rejects.toThrow(UserAdminError);
    });

    it('账号不存在会报错', async () => {
      await expect(users.changePassword('nobody', 'a-properly-long-password')).rejects.toThrow(
        UserAdminError,
      );
    });
  });

  describe('seedAdmin', () => {
    it('幂等：已存在则不重复创建', async () => {
      expect(await users.seedAdmin()).toBe(true);
      expect(await users.seedAdmin()).toBe(false);
      expect(await users.list()).toHaveLength(1);
    });

    /**
     * 这条是 seed 与生产启动守卫之间的契约。
     * 如果 seed 误把 passwordChangedAt 填上时间戳，带着弱口令的实例就能
     * 正常上线，守卫形同虚设 —— 而那种失效是完全静默的。
     */
    it('seed 出来的 admin 会触发生产启动守卫', async () => {
      await users.seedAdmin();
      const [admin] = await users.list();
      expect(admin?.passwordChanged).toBe(false);

      process.env.NODE_ENV = 'production';
      await expect(assertNoInitialPassword(ctx.app)).rejects.toThrow(/初始密码/);
    });

    it('改完密码后生产守卫放行', async () => {
      await users.seedAdmin();
      await users.changePassword('admin', 'a-properly-long-password');

      process.env.NODE_ENV = 'production';
      await expect(assertNoInitialPassword(ctx.app)).resolves.toBeUndefined();
    });
  });
});
