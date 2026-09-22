import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PasswordService } from '../auth/password.service.js';
import { SessionService } from '../auth/session.service.js';
import { INITIAL_ADMIN_PASSWORD } from '../auth/startup-password-check.js';
import { generatePassword } from '../cli/prompt.js';

/**
 * 整站的安全押在一个密码上，所以下限不能是「8 位」那种行业惯性数字。
 */
export const MIN_PASSWORD_LENGTH = 12;

export class UserAdminError extends Error {}

export interface UserSummary {
  username: string;
  displayName: string;
  /** false 表示仍是 seed 建出来的初始口令 */
  passwordChanged: boolean;
}

/**
 * 账号管理。**不做注册页**，账号由命令行脚本调用这里建出来。
 *
 * 逻辑放在服务里而不是 CLI 脚本里，是为了能测 —— 尤其是
 * 「seed 出来的 admin 必须 passwordChangedAt = null」这条：
 * 它是生产启动守卫能否生效的前提，断了没人会发现。
 */
@Injectable()
export class UserAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
  ) {}

  /** 建账号并返回随机生成的强密码（只此一次能拿到明文） */
  async create(username: string, displayName?: string): Promise<{ password: string }> {
    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing) throw new UserAdminError(`账号已存在：${username}`);

    const password = generatePassword();
    await this.prisma.user.create({
      data: {
        username,
        displayName: displayName ?? username,
        passwordHash: await this.passwords.hash(password),
        // 随机强密码不是「初始弱口令」，直接记为已设置
        passwordChangedAt: new Date(),
      },
    });
    return { password };
  }

  /** 改密码，并踢掉该账号的全部会话。返回被踢掉的会话数。 */
  async changePassword(username: string, plain: string): Promise<number> {
    if (plain.length < MIN_PASSWORD_LENGTH) {
      throw new UserAdminError(
        `密码太短。整个站的安全都押在这一个密码上，至少 ${MIN_PASSWORD_LENGTH} 位。`,
      );
    }
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new UserAdminError(`账号不存在：${username}`);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await this.passwords.hash(plain), passwordChangedAt: new Date() },
    });
    // 改了密码就必须清掉已有会话，否则对已登录的攻击者毫无影响
    return this.sessions.destroyAllForUser(user.id);
  }

  async list(): Promise<UserSummary[]> {
    const users = await this.prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    return users.map((u) => ({
      username: u.username,
      displayName: u.displayName,
      passwordChanged: u.passwordChangedAt !== null,
    }));
  }

  /** 首次部署用。已存在则什么都不做，返回 false。 */
  async seedAdmin(): Promise<boolean> {
    const existing = await this.prisma.user.findUnique({ where: { username: 'admin' } });
    if (existing) return false;

    await this.prisma.user.create({
      data: {
        username: 'admin',
        displayName: '管理员',
        passwordHash: await this.passwords.hash(INITIAL_ADMIN_PASSWORD),
        // 必须留 null —— 生产启动守卫据此判断「还没改过密码」。
        // 这里若误填时间戳，带着弱口令的实例就能正常上线，守卫形同虚设。
        passwordChangedAt: null,
      },
    });
    return true;
  }
}
