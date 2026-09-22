# 02 本机开发用 Postgres 与 Redis 容器

Status: resolved
Blocked by: 01

开发机上没有 Postgres，只有他人的容器（`liubo-awas-redis` 占 127.0.0.1:20381、`liubo-awas-mysql` 占 20380）。需要起自用的一套。

## 要做

- `docker-compose.dev.yml`：postgres + redis，**只绑 `127.0.0.1`**，端口避开 20380/20381（建议 PG `127.0.0.1:54320`、Redis `127.0.0.1:63790`）
- 数据用具名 volume，别用 bind mount（rootless docker 下属主会错乱）
- 初始化脚本建 `h5tools` 与 `h5tools_test` 两个库 + `h5tools` 账号
- **PG 15+ 必须额外 `GRANT ALL ON SCHEMA public` 并 `ALTER SCHEMA public OWNER`**，否则 Prisma 建第一张表就 permission denied
- 写进 README：一条命令起停

## 验收

- `docker compose -f docker-compose.dev.yml up -d` 后能连上两个库
- 不干扰他人容器

## Comments

**已完成（2026-09-22）。** Postgres 17.11 + Redis 7，均绑 `127.0.0.1`（54320 / 63790），
未与他人容器（20380 / 20381）冲突。

### 踩到的坑：rootless docker 下不能用 bind mount 挂初始化脚本

最初把建库 SQL 挂进 `/docker-entrypoint-initdb.d`，容器起不来并无限重启：

```
ls: can't open '/docker-entrypoint-initdb.d/': Permission denied
```

原因是 rootless docker 走用户命名空间，容器内的 postgres 用户映射到宿主上是一个高位 uid，
读不了这台机器 ACL 受限的家目录（`drwxrwx---+`）。**数据卷用具名卷没事，
问题出在从仓库目录挂进去的那个 bind mount。**

改法：测试库由 `scripts/dev-db-init.sh` 在容器启动后创建，幂等，`npm run db:up` 一条龙。

### 待确认

本地用的是 **PostgreSQL 17**。部署机上那个 Postgres 的版本未知 —— issue 08 上线时要核对，
差太多的话迁移行为可能不一致（尤其 PG 15 那道 `GRANT ALL ON SCHEMA public`）。
