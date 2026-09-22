# 13 weather 后端搬迁

Status: resolved
Blocked by: 08

源：`/home/huangyingming/test-code/weather-app/backend`。1432 行代码 + 2196 行测试，**测试一并搬，跟着跑绿**。

## 要做

- 复制 `src/weather/`、`src/geo/`、`src/config/`，注册进 `app.module.ts`
- 配置并入全局 config，保留启动期凭据校验（缺凭据就启动失败，不带空凭据跑起来）
- **缓存从 `@cacheable/memory` 换成 Redis store**，限流从进程内换成 Redis storage。**provider 代码一行不动，只换 store**
- 保留：双档 TTL（任意一家成功 1800s / 全部失败 60s）、坐标四舍五入到 2 位小数的缓存 key（抵消 GPS 抖动）
- 移除原本的 LRU 条目上限（Redis 有 maxmemory policy）
- 天气接口纳入全局 AuthGuard（**不是 Public**）
- API 凭据复用现有值，无需重新申请

## 验收

- 搬来的 2196 行测试全绿
- 换 Redis 后缓存命中、双档 TTL、限流行为与原实现一致（契约测试覆盖）
- 起两个实例，缓存与限流额度共享（验证多实例约束已解除）

## Comments

**已完成（2026-09-22）。** 1258 行生产代码 + 2073 行测试整体搬入，后端测试从 60 涨到 189，全绿。
**用真实凭据打了上游**：彩云 28.46°C 晴 / 和风 28.57°C 少云，逐时各 24 条，
逐日 3 天与 7 天 —— 正是文档里说的"两家天数不同，前端不假设各列行数相等"。

### 缓存与限流换成 Redis 后，多实例约束解除

搬迁源把两者放在进程内，部署文档里写明"不要开 cluster 或多实例"。换成 Redis 后：
- 缓存用 `@keyv/redis`，保留双档 TTL 与"坐标四舍五入到 2 位小数"的 key
  （实测 `39.9042` 与 `39.9041` 命中同一份：`weather:39.90:116.41`）
- 限流**自己写了一个 `RedisThrottlerStorage`**，没引第三方包 —— 接口只有一个方法，
  而搬迁源在 `@nestjs/throttler` 的依赖兼容上已经踩过一次；多一个跟着 throttler
  版本走的包就多一处升级时会卡住的地方
- 原来的 LRU 条目上限不再需要（Redis 有 maxmemory policy，且每个 key 都带 TTL）

### 一处**刻意偏离**搬迁源：ThrottlerGuard 不注册为全局

源项目把它注册成 `APP_GUARD`，因为那个仓库里全站只有天气和 geo 两组接口。
这里全局挂上去，30 次/分钟的额度会连带盖住导航页的加载和点击上报 ——
**那些接口打的是我们自己的数据库，没有配额问题，限它毫无收益却会弄坏界面。**
改为用 `@UseGuards(ThrottlerGuard)` 挂在 WeatherController 与 GeoController 上。

### 搬迁中踩到的四个适配点

1. **`@nestjs/throttler` 6.7.0 原生支持 Nest 12**，源项目 `package.json` 里那段为
   peer 声明滞后而加的 overrides **不用搬** —— 它注释里等的那个版本已经发布了
2. **`QWEATHER_API_VERSION=`（空串）会让应用启动失败**。源 `.env` 里那行是注释掉的，
   搬过来变成了空串，而 `?? 'v1'` 兜不住空串。改成 `||`：空着和没写应该是一个意思
3. **`ThrottlerStorageRecord` 没从包根导出**（在 `dist/` 里）。深入 dist 取类型太脆 ——
   那是构建产物路径，升级时说没就没。四个字段就地声明
4. **`ThrottlerAsyncOptions` 把 `imports` 声明为必填**。源项目代码里正好有一行注释
   解释过这件事，一起搬了过来

### 缓存键前缀一度重复了两遍

手工 `new Keyv({ store: new KeyvRedis(url), namespace })` 会让 Keyv 和 KeyvRedis
各加一次前缀，键名变成 `h5tools-dev:cache::h5tools-dev:cache:weather:...`。
能用，但配错了。改用 `@keyv/redis` 自带的 `createKeyv` 工厂（它会把 `useKeyPrefix`
关掉，前缀只由适配器加一次）。

### 搬来的两个契约测试做了必要改造

天气与 geo 接口现在**需要登录**（全局 AuthGuard 默认拒绝），测试改用已登录的
supertest agent（自动带 cookie，不必逐个请求 set）。geo 那份原本每个用例重建一次
应用以拿到干净的进程内缓存，现在缓存在 Redis 里、`ctx.reset()` 会清掉，
应用建一次即可 —— 但**桩的行为仍要逐用例复位**，因为有用例把它改成 reject。
