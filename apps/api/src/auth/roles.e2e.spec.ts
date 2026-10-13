import { Controller, Get } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, createUserAndLogin, type TestApp } from '../test/app.js';
import { Roles } from './roles.decorator.js';
import { Public } from './public.decorator.js';
import { CurrentUser } from './current-user.decorator.js';
import type { CurrentUser as CurrentUserType } from '@h5tools/shared';

/**
 * @Roles() 的契约测试。
 *
 * 真实应用里暂时没有 admin 专属接口 —— 但这个装饰器失效的方式是**静默放行**，
 * 等到接上第一个敏感接口才发现就已经晚了。所以用一个只存在于测试里的
 * controller 把行为钉住。
 */
@Controller('__roles-test')
class RolesTestController {
  @Get('admin-only')
  @Roles('admin')
  adminOnly(@CurrentUser() user: CurrentUserType): { username: string } {
    return { username: user.username };
  }

  @Get('any-logged-in')
  anyLoggedIn(): { ok: boolean } {
    return { ok: true };
  }
}

describe('@Roles()', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await createTestApp({ controllers: [RolesTestController] });
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(() => ctx.reset());

  it('admin 能访问 admin 专属接口', async () => {
    const admin = await createUserAndLogin(ctx, 'laowang', 'admin');
    await request(ctx.server)
      .get('/__roles-test/admin-only')
      .set('Cookie', admin.cookie)
      .expect(200, { username: 'laowang' });
  });

  it('普通账号访问 admin 专属接口是 403，不是 401', async () => {
    // 403 而不是 401 —— 它确实登录了，只是没权限。
    // 混成 401 会让前端把人踢去登录页，然后再登一次还是进不去。
    const user = await createUserAndLogin(ctx, 'zhangsan');
    await request(ctx.server)
      .get('/__roles-test/admin-only')
      .set('Cookie', user.cookie)
      .expect(403);
  });

  it('没登录访问 admin 专属接口仍然是 401', async () => {
    await request(ctx.server).get('/__roles-test/admin-only').expect(401);
  });

  it('不带 @Roles() 的路由对任何已登录用户开放', async () => {
    const user = await createUserAndLogin(ctx, 'zhangsan');
    await request(ctx.server)
      .get('/__roles-test/any-logged-in')
      .set('Cookie', user.cookie)
      .expect(200);
  });
});

/**
 * @Public() 会直接短路，角色检查根本不会跑。这种写法必须炸，
 * 不能悄悄变成「人人可访问的 admin 接口」。
 */
@Controller('__roles-public-test')
class PublicAndRolesController {
  @Get()
  @Public()
  @Roles('admin')
  bad(): { ok: boolean } {
    return { ok: true };
  }
}

describe('@Public() + @Roles() 同时标注', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await createTestApp({ controllers: [PublicAndRolesController] });
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('不是放行，而是 500', async () => {
    await request(ctx.server).get('/__roles-public-test').expect(500);
  });
});
