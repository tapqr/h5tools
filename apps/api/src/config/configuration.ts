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
});
