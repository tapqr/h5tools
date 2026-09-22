import request from 'supertest';
import { createTestApp, type TestApp } from '../test/app.js';
import { PasswordService } from './password.service.js';
import { SessionService } from './session.service.js';

describe('会话吊销', () => {
  let ctx: TestApp;
  let userId: string;

  const PASSWORD = 'correct-horse-battery-staple';

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await ctx.reset();
    const user = await ctx.prisma.user.create({
      data: {
        username: 'alice',
        displayName: '爱丽丝',
        passwordHash: await ctx.app.get(PasswordService).hash(PASSWORD),
      },
    });
    userId = user.id;
  });

  const loginCookie = async () =>
    (await request(ctx.server).post('/auth/login').send({ username: 'alice', password: PASSWORD }))
      .headers['set-cookie'];

  it('destroyAllForUser 会清掉该用户的全部 session', async () => {
    // 模拟同一个人在手机和电脑上都登录了
    const phone = await loginCookie();
    const desktop = await loginCookie();
    await request(ctx.server).get('/auth/me').set('Cookie', phone).expect(200);
    await request(ctx.server).get('/auth/me').set('Cookie', desktop).expect(200);

    const cleared = await ctx.app.get(SessionService).destroyAllForUser(userId);
    expect(cleared).toBe(2);

    // 改密码后两处都必须被踢下线 —— 否则「改了密码」对已登录的攻击者毫无影响
    await request(ctx.server).get('/auth/me').set('Cookie', phone).expect(401);
    await request(ctx.server).get('/auth/me').set('Cookie', desktop).expect(401);
  });

  it('不影响其他用户的 session', async () => {
    const mine = await loginCookie();
    const other = await ctx.prisma.user.create({
      data: {
        username: 'bob',
        displayName: '鲍勃',
        passwordHash: await ctx.app.get(PasswordService).hash(PASSWORD),
      },
    });

    await ctx.app.get(SessionService).destroyAllForUser(other.id);
    await request(ctx.server).get('/auth/me').set('Cookie', mine).expect(200);
  });

  it('session 命中会续期（滑动过期）', async () => {
    const sessions = ctx.app.get(SessionService);
    const sid = await sessions.create(userId);

    // 人为把 TTL 压到很短，再 touch 一次看它是否被顶回去
    await ctx.redis.client.expire(`sess:${sid}`, 10);
    expect(await ctx.redis.client.ttl(`sess:${sid}`)).toBeLessThanOrEqual(10);

    await sessions.touch(sid);
    expect(await ctx.redis.client.ttl(`sess:${sid}`)).toBeGreaterThan(60);
  });
});
