import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { CurrentUser as CurrentUserType } from '@h5tools/shared';

/**
 * 取当前登录用户。AuthGuard 已经保证非 @Public() 路由上它一定存在。
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserType =>
    ctx.switchToHttp().getRequest().user,
);
