import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { UserRole } from '@h5tools/shared';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { ROLES_KEY } from './roles.decorator.js';
import { SessionService } from './session.service.js';
import { AuthService } from './auth.service.js';
import { SESSION_COOKIE } from './cookie.js';

/**
 * 全站鉴权，**默认拒绝**。
 *
 * 注册为 APP_GUARD，对所有路由生效。想放行必须显式加 @Public()。
 * 这样以后加新功能忘了加鉴权，结果是 401（有人来报），不是数据裸奔（没人发现）。
 *
 * 角色检查（@Roles()）也在这里做，不拆成独立的 RolesGuard —— 拆开的话
 * 它拿不拿得到 req.user 取决于 APP_GUARD 的注册顺序，顺序错了的症状是
 * 「所有人都能过」，静默且危险。
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // @Public() 会短路掉角色检查。两者并存一定是写错了，
      // 而「悄悄放行」正是这种错误最坏的表现形式 —— 直接炸掉。
      if (requiredRoles?.length) {
        throw new Error('路由同时标了 @Public() 和 @Roles()：@Public() 会让角色检查失效');
      }
      return true;
    }

    const req = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const sid = req.cookies?.[SESSION_COOKIE.name];
    if (!sid) throw new UnauthorizedException('未登录');

    // 命中即续期 —— 30 天是滑动的，天天在用就不会被踢出去
    const userId = await this.sessions.touch(sid);
    if (!userId) throw new UnauthorizedException('会话已失效');

    const user = await this.auth.findById(userId);
    if (!user) {
      // session 还在但用户没了（被删号）—— 顺手清掉这条 session
      await this.sessions.destroy(sid);
      throw new UnauthorizedException('会话已失效');
    }

    req.user = user;

    if (requiredRoles?.length && !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('没有权限');
    }
    return true;
  }
}
