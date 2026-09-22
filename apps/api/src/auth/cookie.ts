import type { CookieOptions } from 'express';
import { SESSION_TTL_SECONDS } from './session.service.js';

export const SESSION_COOKIE = {
  /**
   * 名字带前缀是有原因的：**cookie 不区分端口**。
   * 这个子域名上以后跑别的服务（不同端口）时，会共享同一份 cookie 空间，
   * 不加前缀就会互相覆盖。
   */
  name: 'h5tools_sid',
} as const;

export function sessionCookieOptions(isProduction: boolean): CookieOptions {
  return {
    httpOnly: true,
    // 只在生产开 Secure：本地开发走 http://localhost，带 Secure 的 cookie
    // 浏览器根本不会回传，登录会莫名其妙失败。
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS * 1000,
  };
}
