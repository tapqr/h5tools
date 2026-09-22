# h5tools

个人效率工具站。登录后可用，PC 与移动端**按页面**各自适配。

当前功能：（建设中）URL 导航管理、天气对比。后续持续增加。

设计决策与理由见 [`.scratch/h5tools-foundation/spec.md`](.scratch/h5tools-foundation/spec.md)。

## 环境要求

- **Node >= 22.14**。22.13.x 上 `nest start` 会抛 `ERR_REQUIRE_CYCLE_MODULE`，与依赖树无关。
- **npm >= 12**。系统自带的 npm 10.x 装不上这个仓库，原因写在 `.npmrc` 里。
  用 `npx -y npm@latest install`。
- Docker（本机开发用的 Postgres 与 Redis 容器）

## 快速开始

```bash
npx -y npm@latest install     # ⚠ 不要用系统 npm，见 .npmrc
npm run db:up                 # 起本机开发用的 Postgres + Redis
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
npm run db:migrate -w @h5tools/api   # 建表
npm run user:seed -w @h5tools/api    # 建初始账号 admin / 123123
npm run dev                   # shared(watch) + api(3100) + web(5173) 一起起
```

前端开发服务器把 `/api` 代理到后端，和生产的同域形态一致 ——
所以前端代码里永远只写 `/api` 相对路径，不存在写死的域名端口。

## 目录

| 路径 | 说明 |
|---|---|
| `apps/api/` | NestJS 12（ESM）+ Prisma。**相对导入必须带 `.js` 扩展名** |
| `apps/web/` | Vite + Vue3 + TS + Pinia + vue-router |
| `packages/shared/` | 前后端共享的对外契约类型 |
| `docs/contexts/` | 各上下文的术语表与 ADR |
| `.scratch/` | spec 与实现 issue |

## 常用命令

| 命令 | 说明 |
|---|---|
| `npm run dev` | 三包一起起 |
| `npm run build` | 按 shared → api → web 顺序构建 |
| `npm test` | 前后端测试 |
| `npm run lint` | oxlint |
| `npm run db:up` / `db:down` | 本机开发数据库容器 |
| `npm run db:migrate -w @h5tools/api` | 改完 schema 后生成并应用迁移 |
| `npm run db:studio -w @h5tools/api` | Prisma Studio |
| `npm run user:list -w @h5tools/api` | 列出账号与改密状态 |
| `npm run user:create -w @h5tools/api -- --username x --name 名字` | 建账号，随机强密码只打印一次 |
| `npm run user:passwd -w @h5tools/api -- admin` | 改密码，不回显、不进 shell history |

## 两件容易踩的事

**`packages/shared` 是用 TypeScript 项目引用接进来的**，不是普通 npm 包。
这样改 shared 里的字段名，前后端会在**增量构建**下同时飘红 —— 这正是建这个包的目的。
如果只在 `package.json` 里依赖而不声明 `references`，`tsc -b` 会因为缓存判断为"无需重建"
而放过类型变更，那个保障就是假的。

**Prisma 的生成产物不进版本库。** `apps/api/src/generated/` 由 `prisma generate`
产出，`build` 和 `dev` 脚本都会先跑一次它，所以克隆下来直接 `npm run dev` 就行，
不需要记得手动生成。

**测试连真实的独立测试库，不 mock Prisma。** `apps/api/vitest.globalSetup.ts`
会自动把迁移应用到 `h5tools_test`，用例之间靠清表隔离。`src/test/env.ts` 里有两道
守卫：`DATABASE_URL_TEST` 必须存在、且库名必须以 `_test` 结尾 —— 测试会清表，
指错库就是清掉正在看的数据。

**生产环境不允许带着初始口令启动。** admin 还是 `123123` 时后端会拒绝启动并打印改密命令。
这个站公网可达，挂上去几小时内就会有扫描器跑弱口令字典，而整套安全方案押在这一个密码上 ——
「上线前忘了改密码」不能只靠自觉。

**不要用 bun 装依赖。** 仓库里曾经 npm/bun 混用过；bun 重装会改 `node_modules`
的属主与 ACL，共享环境下 claude-svc 会失去写权限。
