# 10 URL 管理后端

Status: resolved
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

## Comments

**已完成（2026-09-22）。** 21 个契约用例全绿，其中 **9 条是越权用例**。

### 越权是这个功能里唯一真正危险的 bug

链接不直接带 `userId`（它挂在分类下），所以凡是按 `linkId` 操作都要先经分类
回溯校验归属。**少写一次校验就是一个越权读写接口，而且不会有任何报错提醒你** ——
接口照常返回 200，只是返回了别人的数据。

所以测试里专门有一组：改不了/删不了别人的分类与链接、不能往别人分类里塞链接、
不能把自己的链接移进别人的分类、不能给别人的链接刷点击数、重置统计不影响别人。

### URL 校验放开了内网地址

默认的严格 URL 校验要求顶级域名，会把 `http://jenkins:8080`、`http://wiki/page/1`
这类地址全部拒掉 —— **而它们恰恰是这个导航页最该收录的东西**（同一个理由也让
favicon 自动抓取变得不可行，见 `docs/contexts/nav/adr/0001`）。

所以 `require_tld: false`，但保留 `require_protocol: true`：不带协议的
`jenkins:8080` 仍然拒绝，否则前端拼出来的会是个相对路径。

### 排序是一次提交整份，不是逐条 PATCH

拖拽一次会改动多条记录的 `sortOrder`，逐条发请求的话中途失败会留下顺序错乱的
中间状态 —— 用户看到的是"拖了一半"，比完全不生效更糟。所以 `PATCH /nav/order`
一次收下整份顺序，包在一个事务里。
