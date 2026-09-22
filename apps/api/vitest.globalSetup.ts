import { execFileSync } from 'node:child_process';
import { readTestDatabaseUrl } from './src/test/env.js';

/**
 * 整轮测试开始前，把迁移应用到测试库一次。
 *
 * 用 migrate deploy 而不是 migrate dev：deploy 只应用已有迁移，不会因为
 * schema 与迁移不一致就自作主张生成新迁移或重置数据库。
 *
 * 刻意不改本进程的 process.env —— 子进程会继承，改了会让各测试进程里的
 * 「测试库 ≠ 业务库」校验失去意义。连接串只通过 execFileSync 的 env 传下去。
 */
export default function setup(): void {
  const url = readTestDatabaseUrl();
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
}
