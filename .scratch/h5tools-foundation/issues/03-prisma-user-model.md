# 03 接入 Prisma 与 User 模型

Status: ready-for-agent
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
