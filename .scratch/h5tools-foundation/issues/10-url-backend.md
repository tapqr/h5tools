# 10 URL 管理后端

Status: ready-for-agent
Blocked by: 08

数据模型见 spec 第 7 节。

## 要做

- Prisma：`Category`（带 `userId`）、`Link`（带 `categoryId`、`clickCount`、`lastClickedAt`）
- DTO 定义在 `packages/shared`，前后端共用
- `GET /api/nav/tree` 一次返回整树（不分页）
- 分类 / 链接各自 POST / PATCH / DELETE
- `PATCH /api/nav/order` 批量提交顺序
- `POST /api/nav/links/:id/click` 计数 +1、更新 `lastClickedAt`
- `POST /api/nav/stats/reset` 重置全部 `clickCount`
- **所有查询必须按 `userId` 隔离** —— 越权读写要有契约测试覆盖

## 验收

- 每个接口一条契约测试
- 用户 A 拿不到也改不了用户 B 的数据（显式测试）
