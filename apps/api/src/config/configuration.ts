/**
 * 运行时配置的唯一来源。
 *
 * 后端的配置都是**运行时**读的,改了重启即可。前端不是 —— `VITE_BASE_PATH`
 * 在构建时就被静态替换进产物,改了必须重新 build。别把这两者混为一谈。
 */
export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',

  /** 只绑 127.0.0.1,外部流量一律经 nginx 反代进来 */
  port: Number(process.env.PORT ?? 3100),

  /**
   * 接口路径前缀。站点挂根路径时接口在 /api/,与前端同域,不需要 CORS。
   */
  apiPrefix: process.env.API_PREFIX ?? 'api',

  /**
   * 站点对外地址。换域名或换端口时,整个后端只有这一个值需要改
   * (另一处是 nginx 的 listen / server_name)。前端不需要重新构建 ——
   * 它调的是 /api 相对路径,代码里没有写死的域名端口。
   */
  appOrigin: process.env.APP_ORIGIN ?? 'http://localhost:5173',

  /**
   * 业务库连接串。测试时由测试基建覆盖成 DATABASE_URL_TEST ——
   * 「连哪个库」必须是显式选择,否则会出现"以为在测试库上、其实清了业务库"。
   */
  databaseUrl: process.env.DATABASE_URL ?? '',

  // --- 以下为天气模块搬迁带来的配置，原样保留语义 ---

  cache: {
    ttlSeconds: Number(process.env.WEATHER_CACHE_TTL_SECONDS ?? 1800),
    // 全部数据源都失败时用的短 TTL：够挡住瞬间的重复请求，又能让上游恢复后很快自愈
    failureTtlSeconds: Number(process.env.WEATHER_CACHE_FAILURE_TTL_SECONDS ?? 60),
  },

  qweather: {
    apiHost: process.env.QWEATHER_API_HOST ?? '',
    apiKey: process.env.QWEATHER_API_KEY ?? '',
    // 'v1'(默认)或 'v7'。v7 已被上游标记弃用，两份实现都留在 providers/qweather/ 下，
    // v1 出问题时改这一个变量即可回滚，不必回滚代码。
    // 用 || 而不是 ??：.env 里写了 `QWEATHER_API_VERSION=`（空串）时，
    // ?? 兜不住空串，会让 providers 在启动时抛「must be 'v1' or 'v7'」。
    // 空着和没写应该是一个意思。
    apiVersion: process.env.QWEATHER_API_VERSION || 'v1',
  },

  caiyun: {
    token: process.env.CAIYUN_TOKEN ?? '',
  },

  throttle: {
    ttlMs: Number(process.env.THROTTLE_TTL_MS ?? 60000),
    limit: Number(process.env.THROTTLE_LIMIT ?? 30),
  },

  geo: {
    // 地理数据几乎不变，TTL 开得比天气长得多
    cacheTtlSeconds: Number(process.env.GEO_CACHE_TTL_SECONDS ?? 86400),
    throttleTtlMs: Number(process.env.GEO_THROTTLE_TTL_MS ?? 60000),
    // @nestjs/throttler 的 key 按 ClassName-HandlerName-limiterName-ip 生成，是 per-route 的 ——
    // 这个值是 /geo/reverse、/geo/search、/geo/top 各自的额度，三个路由合计是它的 3 倍。
    throttleLimit: Number(process.env.GEO_THROTTLE_LIMIT ?? 20),
  },

  /** session、天气缓存、限流都放这里 */
  redisUrl: process.env.REDIS_URL ?? 'redis://127.0.0.1:63790',

  /**
   * 所有 Redis key 的统一前缀。
   *
   * 这不是洁癖:我们连的是一台**共享** Redis,上面有别的项目在跑
   * (切过去时 db0/2/4/7/10/12/13/15 都已有数据)。没有前缀就会撞 key;
   * 更要命的是测试 —— 靠 `flushdb` 做隔离会把整个 db 清空,
   * 连别人的数据一起清掉。有了前缀,测试只清自己那一撮。
   *
   * 每个环境用不同的值:生产 h5tools: / 本地 h5tools-dev: / 测试 h5tools-test:
   */
  redisKeyPrefix: process.env.REDIS_KEY_PREFIX ?? 'h5tools-dev:',
});
