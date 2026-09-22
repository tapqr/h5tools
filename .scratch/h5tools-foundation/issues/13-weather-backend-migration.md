# 13 weather 后端搬迁

Status: ready-for-agent
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
