# 02 本机开发用 Postgres 与 Redis 容器

Status: ready-for-agent
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
