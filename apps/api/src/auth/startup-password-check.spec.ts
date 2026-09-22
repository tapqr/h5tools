import { createTestApp, type TestApp } from '../test/app.js';
import { PasswordService } from './password.service.js';
import { assertNoInitialPassword, INITIAL_ADMIN_PASSWORD } from './startup-password-check.js';

/**
 * 这道守卫是「上线前忘了改密码」的唯一物理屏障，必须有测试盯着 ——
 * 一个永远不会触发的守卫和没有守卫是一回事。
 */
describe('生产启动守卫：初始弱口令', () => {
  let ctx: TestApp;
  const originalEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    process.env.NODE_ENV = originalEnv;
    await ctx.close();
  });

  beforeEach(async () => {
    await ctx.reset();
    process.env.NODE_ENV = originalEnv;
  });

  const createAdmin = async (password: string) =>
    ctx.prisma.user.create({
      data: {
        username: 'admin',
        displayName: '管理员',
        passwordHash: await ctx.app.get(PasswordService).hash(password),
      },
    });

  it('生产环境下 admin 仍用初始口令 -> 拒绝启动', async () => {
    await createAdmin(INITIAL_ADMIN_PASSWORD);
    process.env.NODE_ENV = 'production';
    await expect(assertNoInitialPassword(ctx.app)).rejects.toThrow(/初始密码/);
  });

  it('生产环境下密码已改 -> 放行', async () => {
    await createAdmin('a-real-and-long-password');
    process.env.NODE_ENV = 'production';
    await expect(assertNoInitialPassword(ctx.app)).resolves.toBeUndefined();
  });

  it('开发环境下不检查 —— 本地照常用弱口令', async () => {
    await createAdmin(INITIAL_ADMIN_PASSWORD);
    process.env.NODE_ENV = 'development';
    await expect(assertNoInitialPassword(ctx.app)).resolves.toBeUndefined();
  });

  it('还没有 admin 账号时不拦（首次部署跑 seed 之前）', async () => {
    process.env.NODE_ENV = 'production';
    await expect(assertNoInitialPassword(ctx.app)).resolves.toBeUndefined();
  });
});
