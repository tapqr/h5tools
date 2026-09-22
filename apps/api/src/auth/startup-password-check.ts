import { Logger } from '@nestjs/common';
import type { INestApplicationContext } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PasswordService } from './password.service.js';

/** seed 建出来的初始口令。生产环境不允许带着它上线。 */
export const INITIAL_ADMIN_PASSWORD = '123123';

/**
 * 生产环境启动守卫：admin 还在用初始弱口令就**拒绝启动**。
 *
 * 这个站公网可达，挂上去几小时内就会有扫描器对着登录接口跑弱口令字典。
 * 整套安全方案押在这一个密码上，所以「上线前忘了改密码」这件事
 * 不能只靠自觉 —— 让它在物理上无法发生。
 *
 * 开发环境不检查，本地照常用弱口令。
 */
export async function assertNoInitialPassword(app: INestApplicationContext): Promise<void> {
  if (process.env.NODE_ENV !== 'production') return;

  const logger = new Logger('StartupCheck');
  const prisma = app.get(PrismaService);
  const passwords = app.get(PasswordService);

  const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!admin) return;

  const stillInitial = await passwords.verify(admin.passwordHash, INITIAL_ADMIN_PASSWORD);
  if (!stillInitial) return;

  logger.error(
    [
      '',
      '拒绝启动：admin 仍在使用初始密码。',
      '这个站点公网可达，带着初始口令上线等于没有登录。',
      '',
      '改密码后再启动：',
      '  cd apps/api && npm run user:passwd -- admin',
      '',
    ].join('\n'),
  );
  throw new Error('admin 仍在使用初始密码，拒绝以生产模式启动');
}
