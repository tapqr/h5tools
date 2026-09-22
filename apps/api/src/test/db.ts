import type { PrismaService } from '../prisma/prisma.service.js';

/**
 * 清空所有业务表，用于用例之间的隔离。
 *
 * ## 为什么不是「每个用例包在事务里回滚」
 *
 * spec 第 10 节原本写的是事务回滚。实际做下来，那个方案对**契约测试**不成立：
 * 契约测试是真的发 HTTP 请求进去，请求由 Nest 自己的 PrismaService 处理，
 * 测试这边没有办法把那次请求塞进自己持有的事务里。硬做要把事务客户端
 * 注入整条依赖链，代价远大于收益。
 *
 * 这里保留了那条决定真正想要的东西 —— **连真实 Postgres、用例之间互不污染、
 * 不 mock Prisma** —— 只是隔离手段从回滚换成了清表。
 *
 * 表名是查出来的不是写死的，加新表不用回来改这里。
 */
export async function resetDb(prisma: PrismaService): Promise<void> {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length === 0) return;

  const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}
