import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@h5tools/shared';

export const ROLES_KEY = 'h5tools:roles';

/**
 * 限定只有某些角色能访问。不写就是「任何已登录用户都能访问」。
 *
 * 检查做在 AuthGuard 里，紧接着 req.user 赋值那一步 —— 不单独做
 * RolesGuard，是因为那样要依赖 APP_GUARD 的注册顺序才能拿到 req.user，
 * 而顺序错了的症状是「所有人都能过」，静默且危险。
 *
 * 不能和 @Public() 同时用：@Public() 直接短路，角色检查根本不会跑。
 * AuthGuard 会在发现两者并存时直接抛错，而不是悄悄放行。
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
