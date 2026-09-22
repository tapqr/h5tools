#!/usr/bin/env bash
# 本机开发数据库的初始化。幂等，可以重复跑。
#
# 为什么不挂 /docker-entrypoint-initdb.d:rootless docker 下容器内的 postgres
# 用户读不了本机 ACL 受限的家目录,挂了容器直接起不来。详见 docker-compose.dev.yml。
set -euo pipefail

PG=h5tools-dev-pg

echo "等待 Postgres 就绪..."
for i in $(seq 1 30); do
  if [ "$(docker inspect -f '{{.State.Health.Status}}' "$PG" 2>/dev/null)" = healthy ]; then
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "Postgres 30 秒内没就绪，日志如下:" >&2
    docker logs --tail 30 "$PG" >&2
    exit 1
  fi
  sleep 1
done

# 测试库必须与业务库分开 —— 测试按用例回滚，跑在业务库上会清掉你正在看的数据
if [ -z "$(docker exec "$PG" psql -U h5tools -d h5tools -tAc \
     "SELECT 1 FROM pg_database WHERE datname='h5tools_test'")" ]; then
  docker exec "$PG" psql -U h5tools -d h5tools -c \
    "CREATE DATABASE h5tools_test OWNER h5tools" >/dev/null
  echo "已创建测试库 h5tools_test"
else
  echo "测试库 h5tools_test 已存在"
fi

echo "开发数据库就绪：postgres 127.0.0.1:54320（Redis 用内网共享实例，见 apps/api/.env）"
