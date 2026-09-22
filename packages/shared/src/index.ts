/**
 * 前后端共享的对外契约。
 *
 * 这里只放「接口的输入输出形状」。服务端内部接口(Service 的依赖抽象、
 * Repository 签名之类)不要进来 —— 它们进来会让前端看见本不该看见的边界,
 * 时间一长这个包就退化成一个什么都有的公共垃圾桶。
 *
 * 建这个包本身是有来由的:搬迁源 weather-app 的前后端是两个独立项目,
 * 它的 CLAUDE.md 里承认 `frontend/src/types/weather.ts` 是后端 interfaces 的
 * 手抄副本,「改后端契约必须同步改前端类型,没有任何自动检查会提醒你」。
 * 这个包就是那个自动检查。
 */

export * from './auth/index.js';
export * from './nav/index.js';
