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
