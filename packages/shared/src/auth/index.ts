export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * 账号角色。只有两档，刻意不做通用权限系统。
 *
 * 字面量跟 Prisma 的 `enum UserRole` 取值**完全一致**（都是小写），
 * 所以两边不需要映射层 —— 映射层是这种字段最容易出错的地方。
 */
export type UserRole = 'admin' | 'user';

export interface CurrentUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
}
