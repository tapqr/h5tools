import { Injectable } from '@nestjs/common';
import type { CurrentUser } from '@h5tools/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { PasswordService } from './password.service.js';
import { SessionService } from './session.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
  ) {}

  /**
   * 校验账号密码。失败一律返回 null，**不区分「用户不存在」与「密码错误」** ——
   * 区分了等于送给攻击者一个枚举账号的接口。
   */
  async validate(username: string, password: string): Promise<CurrentUser | null> {
    const user = await this.prisma.user.findUnique({ where: { username } });

    if (!user) {
      // 用户不存在时也跑一次哈希校验，让响应时间与「密码错误」一致。
      // 否则响应快慢本身就泄露了账号是否存在。
      await this.passwords.verify(DUMMY_HASH, password);
      return null;
    }

    const ok = await this.passwords.verify(user.passwordHash, password);
    if (!ok) return null;

    return { id: user.id, username: user.username, displayName: user.displayName };
  }

  async findById(id: string): Promise<CurrentUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? { id: user.id, username: user.username, displayName: user.displayName } : null;
  }

  createSession(userId: string): Promise<string> {
    return this.sessions.create(userId);
  }

  async destroySession(sid: string): Promise<void> {
    await this.sessions.destroy(sid);
  }
}

/**
 * 一个真实形状的 argon2id 串，只用于「用户不存在」时消耗与真实校验相当的时间。
 * 它对应的明文不重要 —— 永远不会有人能用它登录，因为这条分支总是返回 null。
 */
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHRzb21lc2FsdA$Vo3rXQO0mHDJqLNpBHhZFhTjHQqKMHkNRJRxhEQkJRo';
