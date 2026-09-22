# 03 接入 Prisma 与 User 模型

Status: resolved
Blocked by: 02

## 要做

- `apps/api` 接 Prisma，`schema.prisma` 定义 `User`：`id` / `username`(unique) / `displayName` / `passwordHash` / `passwordChangedAt` / `createdAt`
- 首个迁移
- `PrismaModule`（全局），连接串从 `DATABASE_URL` 读
- 测试基建：连 `h5tools_test`，**每个用例包在事务里回滚**，不 mock Prisma
- 迁移在测试库上自动应用

## 验收

- `npx prisma migrate dev` 建表成功
- 一个样例契约测试能连真实测试库、跑完自动回滚、重复运行结果一致

## Comments

**已完成（2026-09-22）。** Prisma 7.10.0 + PostgreSQL 17，`users` 表与首个迁移已就位，
5 个用例连真实测试库跑通（含「用例之间互不污染」与「连的是测试库」两条自检）。

### 对 spec 第 10 节的一处偏离：隔离手段从事务回滚改为清表

spec 原文写的是「每个用例包在事务里回滚」。实际做下来那个方案对**契约测试**不成立：
契约测试真的发 HTTP 请求进去，请求由 Nest 自己的 `PrismaService` 处理，
测试这边没办法把那次请求塞进自己持有的事务里。硬做要把事务客户端注入整条依赖链。

保留了那条决定真正想要的东西 —— **连真实 Postgres、用例间互不污染、不 mock Prisma**，
只是隔离手段换成 `TRUNCATE ... RESTART IDENTITY CASCADE`。表名是查出来的不是写死的，
以后加表不用回来改。

### 配套的两道安全守卫（已验证会真的拦下来）

测试会清表，指错库就是清掉业务数据。`src/test/env.ts` 里：
- `DATABASE_URL_TEST` 缺失 -> 直接报错不跑
- 库名不以 `_test` 结尾 -> 直接报错不跑

第一版还有一条「测试库 != 业务库」的比对，但它误报了：`globalSetup` 先把
`process.env.DATABASE_URL` 改成了测试库，子进程继承后再比对，两者自然相同。
教训是**校验要拿原始值比，不能拿可能已被改过的进程环境比** —— 现在拆成了
`readTestDatabaseUrl()`（只读、只校验）和 `useTestDatabase()`（生效）两个函数。

### Prisma 7 与 npm 12 的四个意外

1. **`prisma` 的 `latest` dist-tag 指向 RC**（`8.0.0-rc.15`），稳定版在 `prev`（`7.10.0`）。
   直接 `npm i prisma` 会装到 RC，而 `@prisma/client` 装的是 7.10.0 —— **版本错配**。
   两个都钉死在 7.10.0。
2. **npm 12 默认拦截依赖的安装脚本**（新的安全特性）。Prisma 需要引擎 postinstall，
   显式放行了 `prisma` 与 `@prisma/engines`，记录在根 `package.json` 的 `allowScripts`。
   其余被拦的（workerd、msgpackr-extract）用不到，继续拦着。
3. **Prisma 7 不再用查询引擎二进制，改走驱动适配器** —— 必须装 `@prisma/adapter-pg`
   并在 `new PrismaClient({ adapter })` 里传进去。
4. **datasource 的 url 从 schema 挪到 `prisma.config.ts`，且不再自动读 `.env`。**
   用 Node 22 内置的 `process.loadEnvFile()` 加载，没为这一件事装 dotenv。

### npm audit 的 5 条 high，结论是不处理

`mysql2` 与 `lodash` 的告警只来自 **`prisma` CLI 这个 devDependency**
（lodash 还是 Prisma Studio 的 UI 依赖）。生产运行时的 `@prisma/client`
只依赖 `@prisma/client-runtime-utils`，链路干净。

`npm audit fix --force` 会把 Prisma 降到 6.19.3（跨两个大版本）——
为一个我们根本不用的 MySQL 驱动付这个代价不划算。**上线前复核一次这个判断。**
