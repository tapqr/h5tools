import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator.js';

/**
 * 健康检查。issue 04 接入全局 AuthGuard 后，它会是少数 @Public() 路由之一 ——
 * 探活不该需要登录。
 *
 * 这里刻意不返回当前用户：那是 GET /auth/me 的职责，混进来会让探活接口
 * 变成一个需要鉴权的接口。
 */
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
