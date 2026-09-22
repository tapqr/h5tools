import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module.js';
import { UserAdminError, UserAdminService } from '../user/user-admin.service.js';
import { INITIAL_ADMIN_PASSWORD } from '../auth/startup-password-check.js';
import { promptHidden } from './prompt.js';

/**
 * 账号管理。**不做注册页** —— 账号靠这个脚本建。
 *
 * 数据模型是多用户的（业务表都带 userId），交互是单用户的。
 * 以后要给同事开号，再跑一次 create 即可，不用动数据库结构。
 *
 *   npm run user:create -- --username zhangsan --name 张三
 *   npm run user:passwd -- admin
 *   npm run user:list
 *   npm run user:seed
 */
async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  // 这些命令不该被启动守卫拦住 —— 改密码正是解除那个守卫的手段
  process.env.NODE_ENV = process.env.NODE_ENV === 'production' ? 'production' : 'development';

  Logger.overrideLogger(['error']);
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const users = app.get(UserAdminService);

  try {
    switch (command) {
      case 'create': {
        const username = args.flags.username ?? args.positional[0];
        if (!username) throw new UsageError('用法: user:create -- --username <账号> [--name <显示名>]');

        const { password } = await users.create(username, args.flags.name);
        console.log(`\n已创建账号 ${username}（${args.flags.name ?? username}）`);
        console.log(`密码：${password}`);
        console.log('\n这个密码只显示这一次，请立刻存进密码管理器。\n');
        break;
      }

      case 'passwd': {
        const username = args.positional[0] ?? args.flags.username;
        if (!username) throw new UsageError('用法: user:passwd -- <账号>');

        const first = await promptHidden(`为 ${username} 设置新密码: `);
        if (process.stdin.isTTY) {
          const again = await promptHidden('再输入一次: ');
          if (again !== first) throw new UsageError('两次输入不一致');
        }

        const killed = await users.changePassword(username, first);
        console.log(`已更新 ${username} 的密码，并登出该账号的 ${killed} 个会话。`);
        break;
      }

      case 'list': {
        const all = await users.list();
        if (all.length === 0) {
          console.log('还没有任何账号。跑 npm run user:seed 建一个。');
          break;
        }
        for (const u of all) {
          const changed = u.passwordChanged ? '已改密' : '⚠ 仍是初始密码';
          console.log(`${u.username.padEnd(16)} ${u.displayName.padEnd(16)} ${changed}`);
        }
        break;
      }

      case 'seed': {
        const created = await users.seedAdmin();
        if (!created) {
          console.log('admin 已存在，跳过。');
          break;
        }
        console.log(`已创建 admin / ${INITIAL_ADMIN_PASSWORD}`);
        console.log('⚠ 这是初始口令，生产环境带着它会拒绝启动。上线前跑：');
        console.log('   npm run user:passwd -- admin\n');
        break;
      }

      default:
        throw new UsageError('用法: user <create|passwd|list|seed> [...]');
    }
  } finally {
    await app.close();
  }
}

class UsageError extends Error {}

interface Args {
  /** 位置参数 */
  positional: string[];
  /** --key value 形式的具名参数 */
  flags: Record<string, string | undefined>;
}

function parseArgs(argv: string[]): Args {
  const out: Args = { positional: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a.startsWith('--')) {
      out.flags[a.slice(2)] = argv[i + 1];
      i++;
    } else {
      out.positional.push(a);
    }
  }
  return out;
}

try {
  await main();
} catch (err) {
  if (err instanceof UsageError || err instanceof UserAdminError) {
    console.error(err.message);
  } else {
    console.error(err);
  }
  process.exit(1);
}
