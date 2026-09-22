import request from 'supertest';
import { createTestApp, type TestApp } from '../test/app.js';
import { PasswordService } from './password.service.js';
import { SESSION_COOKIE } from './cookie.js';

describe('认证 (契约)', () => {
  let ctx: TestApp;

  const USERNAME = 'alice';
  const PASSWORD = 'correct-horse-battery-staple';

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await ctx.reset();
    const passwords = ctx.app.get(PasswordService);
    await ctx.prisma.user.create({
      data: {
        username: USERNAME,
        displayName: '爱丽丝',
        passwordHash: await passwords.hash(PASSWORD),
      },
    });
  });

  const login = (username = USERNAME, password = PASSWORD) =>
    request(ctx.server).post('/auth/login').send({ username, password });

  describe('默认拒绝', () => {
    it('未登录访问 /auth/me 返回 401', async () => {
      await request(ctx.server).get('/auth/me').expect(401);
    });

    it('@Public() 的 /health 不需要登录', async () => {
      await request(ctx.server).get('/health').expect(200, { status: 'ok' });
    });

    it('伪造的 session id 返回 401', async () => {
      await request(ctx.server)
        .get('/auth/me')
        .set('Cookie', `${SESSION_COOKIE.name}=forged`)
        .expect(401);
    });
  });

  describe('登录', () => {
    it('凭据正确返回用户并下发 session cookie', async () => {
      const res = await login().expect(200);
      expect(res.body).toEqual({
        id: expect.any(String),
        username: USERNAME,
        displayName: '爱丽丝',
      });

      const cookie = res.headers['set-cookie'][0] as string;
      expect(cookie).toContain(`${SESSION_COOKIE.name}=`);
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Lax');
      // 本地测试不是 production，所以刻意**不**带 Secure ——
      // 带了的话 http 下浏览器根本不回传，登录会莫名其妙失败
      expect(cookie).not.toContain('Secure');
    });

    it('响应体里不含密码哈希', async () => {
      const res = await login().expect(200);
      expect(JSON.stringify(res.body)).not.toContain('argon2');
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('登录后带 cookie 能访问 /auth/me', async () => {
      const cookie = (await login().expect(200)).headers['set-cookie'];
      const res = await request(ctx.server).get('/auth/me').set('Cookie', cookie).expect(200);
      expect(res.body.username).toBe(USERNAME);
    });

    it('密码错误返回 401', async () => {
      await login(USERNAME, 'wrong').expect(401);
    });

    it('用户不存在与密码错误返回同样的信息（不泄露账号是否存在）', async () => {
      const a = await login('nosuchuser', 'wrong').expect(401);
      const b = await login(USERNAME, 'wrong').expect(401);
      expect(a.body.message).toBe(b.body.message);
    });

    it('缺字段被校验管道拦下', async () => {
      await request(ctx.server).post('/auth/login').send({ username: USERNAME }).expect(400);
    });

    it('多余字段被拒绝', async () => {
      await request(ctx.server)
        .post('/auth/login')
        .send({ username: USERNAME, password: PASSWORD, isAdmin: true })
        .expect(400);
    });
  });

  describe('登录失败限流', () => {
    it('同一账号连续失败 5 次后锁定，正确密码也进不来', async () => {
      for (let i = 0; i < 5; i++) {
        await login(USERNAME, 'wrong').expect(401);
      }
      const res = await login().expect(429);
      expect(res.headers['retry-after']).toBeDefined();
    });

    it('登录成功会清掉失败计数', async () => {
      await login(USERNAME, 'wrong').expect(401);
      await login().expect(200);
      // 计数已清零，再错 4 次仍不该锁
      for (let i = 0; i < 4; i++) {
        await login(USERNAME, 'wrong').expect(401);
      }
      await login().expect(200);
    });
  });

  describe('登出', () => {
    it('登出后原 cookie 失效', async () => {
      const cookie = (await login().expect(200)).headers['set-cookie'];
      await request(ctx.server).get('/auth/me').set('Cookie', cookie).expect(200);

      await request(ctx.server).post('/auth/logout').set('Cookie', cookie).expect(204);
      await request(ctx.server).get('/auth/me').set('Cookie', cookie).expect(401);
    });

    it('未登录也能调用登出（session 过期后点登出不该报错）', async () => {
      await request(ctx.server).post('/auth/logout').expect(204);
    });

    it('登出总是下发清除 cookie 的指令，哪怕 session 早就失效', async () => {
      const res = await request(ctx.server).post('/auth/logout').expect(204);
      const cookie = (res.headers['set-cookie'] as unknown as string[])[0];
      expect(cookie).toContain(`${SESSION_COOKIE.name}=;`);
    });
  });

  describe('会话吊销', () => {
    it('删号后原 session 立即失效', async () => {
      const cookie = (await login().expect(200)).headers['set-cookie'];
      await ctx.prisma.user.deleteMany({ where: { username: USERNAME } });
      await request(ctx.server).get('/auth/me').set('Cookie', cookie).expect(401);
    });
  });
});
