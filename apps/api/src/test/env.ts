import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * 读出测试库连接串并校验它确实不是业务库。**不改 process.env。**
 *
 * 这道校验不是形式主义：测试会清表，指错库就是把你正在看的数据清了。
 * 宁可让测试起不来，也不要让它跑在业务库上。
 *
 * 之所以拆成「只读」和「生效」两个函数：globalSetup 与每个测试进程都要走这段，
 * 若前者改了 process.env、后者再拿改过的值去比对，就会把「已经切到测试库」
 * 误判成「测试库和业务库是同一个」—— 这正是第一版踩的坑。
 */
export function readTestDatabaseUrl(): string {
  const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  try {
    process.loadEnvFile(resolve(apiRoot, '.env'));
  } catch {
    // CI 里直接注入环境变量，没有 .env 是正常的
  }

  const testUrl = process.env.DATABASE_URL_TEST;
  if (!testUrl) {
    throw new Error('缺少 DATABASE_URL_TEST —— 测试必须连独立的测试库，不能跑在业务库上');
  }
  if (!/_test(\?|$)/.test(testUrl)) {
    throw new Error(`DATABASE_URL_TEST 指向的库名不以 _test 结尾：${testUrl}`);
  }
  return testUrl;
}

/**
 * 读出测试用的 Redis 地址并校验它**不是 0 号库**。
 *
 * 测试会 flushdb。0 号库是开发时 session 和缓存所在的地方，
 * 指错了就是把自己登出、把缓存清光 —— 和测试库那道守卫是同一个道理。
 */
export function readTestRedisUrl(): string {
  const url = process.env.REDIS_URL_TEST;
  if (!url) {
    throw new Error('缺少 REDIS_URL_TEST —— 测试会 flushdb，必须用独立的 Redis 库');
  }
  const db = new URL(url).pathname.replace('/', '');
  if (!db || db === '0') {
    throw new Error(`REDIS_URL_TEST 必须显式指定非 0 号库（如 .../15），当前：${url}`);
  }
  return url;
}

/** 把当前进程切到测试库与测试用 Redis */
export function useTestDatabase(): string {
  const testUrl = readTestDatabaseUrl();
  process.env.DATABASE_URL = testUrl;
  process.env.REDIS_URL = readTestRedisUrl();
  return testUrl;
}
