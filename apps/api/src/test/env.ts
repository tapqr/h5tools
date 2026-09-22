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
 * 读出测试用的 Redis 地址与 key 前缀。
 *
 * 隔离**靠前缀而不是库号**：我们连的是一台共享 Redis，上面有别的项目在跑。
 * 早先那版用 `flushdb` + "必须是非 0 号库"的守卫，在共享环境下是不成立的 ——
 * 切换到共享实例时发现 db15 上已有别人的 103 个 key，而测试配置恰好指着它。
 * 库号空不空是会变的，前缀是我们自己的。
 */
export function readTestRedis(): { url: string; keyPrefix: string } {
  const url = process.env.REDIS_URL_TEST ?? process.env.REDIS_URL;
  if (!url) {
    throw new Error('缺少 REDIS_URL_TEST（或 REDIS_URL）');
  }

  const keyPrefix = process.env.REDIS_KEY_PREFIX_TEST;
  if (!keyPrefix) {
    throw new Error('缺少 REDIS_KEY_PREFIX_TEST —— 测试会按前缀批量删 key，前缀必须显式给出');
  }
  if (keyPrefix === process.env.REDIS_KEY_PREFIX) {
    throw new Error(
      `REDIS_KEY_PREFIX_TEST 与开发用的前缀相同（${keyPrefix}）。` +
        '测试会清掉这个前缀下的全部 key，那会把你正在用的 session 和缓存一起清掉。',
    );
  }
  return { url, keyPrefix };
}

/** 把当前进程切到测试库与测试用的 Redis 前缀 */
export function useTestDatabase(): string {
  const testUrl = readTestDatabaseUrl();
  const redis = readTestRedis();
  process.env.DATABASE_URL = testUrl;
  process.env.REDIS_URL = redis.url;
  process.env.REDIS_KEY_PREFIX = redis.keyPrefix;
  return testUrl;
}
