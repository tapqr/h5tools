import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'h5tools:isPublic';

/**
 * 标记一个路由不需要登录。
 *
 * 全站的 AuthGuard 是**默认拒绝**的：没有这个装饰器的路由一律要求已登录。
 * 这条设计比任何单独的鉴权检查都重要 —— 以后加新功能时忘了加鉴权，
 * 结果是接口 401（有人来报），而不是数据裸奔（没人发现）。
 *
 * 加这个装饰器时请想清楚：这个接口暴露在公网上，任何人都能打。
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
