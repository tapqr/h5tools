import { Injectable } from '@nestjs/common';
import type { UserRole } from '@h5tools/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { PasswordService } from '../auth/password.service.js';
import { SessionService } from '../auth/session.service.js';
import { INITIAL_ADMIN_PASSWORD } from '../auth/startup-password-check.js';
import { generatePassword } from '../cli/prompt.js';

/**
 * 密码下限，按角色分级。**只管长度，不管组合** —— 强制大小写/数字/符号
 * 只会逼出 `Password1!` 这种熵更低的东西，NIST SP 800-63B 明确反对。
 *
 * admin 12 位：它能改全站配置，爆炸半径是整个站。
 * user  8 位：数据只有自己的书签和天气城市，且在线爆破已经被
 *             LoginThrottleService 挡住（账号维度 5 次/15 分钟就锁）。
 *             离线爆破的前提是先拖库，那是另一个威胁模型。
 */
export const MIN_PASSWORD_LENGTH: Record<UserRole, number> = {
  admin: 12,
  user: 8,
};

export class UserAdminError extends Error {}

export interface UserSummary {
  username: string;
  displayName: string;
  role: UserRole;
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
  async create(
    username: string,
    displayName?: string,
    role: UserRole = 'user',
  ): Promise<{ password: string }> {
    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing) throw new UserAdminError(`账号已存在：${username}`);

    const password = generatePassword();
    await this.prisma.user.create({
      data: {
        username,
        displayName: displayName ?? username,
        role,
        passwordHash: await this.passwords.hash(password),
        // 随机强密码不是「初始弱口令」，直接记为已设置
        passwordChangedAt: new Date(),
      },
    });
    return { password };
  }

  /** 改密码，并踢掉该账号的全部会话。返回被踢掉的会话数。 */
  async changePassword(username: string, plain: string): Promise<number> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new UserAdminError(`账号不存在：${username}`);

    // 下限查的是**这个账号自己的角色**，不是调用方的。
    // 先查用户再校验长度，顺序不能反 —— 否则 admin 也会被按 8 位放行。
    const min = MIN_PASSWORD_LENGTH[user.role];
    if (plain.length < min) {
      throw new UserAdminError(
        user.role === 'admin'
          ? `密码太短。admin 能改全站配置，至少 ${min} 位。`
          : `密码太短，至少 ${min} 位。`,
      );
    }

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
      role: u.role,
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
        role: 'admin',
        passwordHash: await this.passwords.hash(INITIAL_ADMIN_PASSWORD),
        // 必须留 null —— 生产启动守卫据此判断「还没改过密码」。
        // 这里若误填时间戳，带着弱口令的实例就能正常上线，守卫形同虚设。
        passwordChangedAt: null,
      },
    });
    return true;
  }
}
