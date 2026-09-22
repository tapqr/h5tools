# 部署说明

站点挂**子域名 + 端口的根路径**，HTTPS。外部依赖（Postgres / Redis / nginx）
复用部署机上已有的，都不重复部署。

占位值，按实际改：

| 项 | 值 |
|---|---|
| 站点 | `https://tools.example.com:8443/` |
| 后端进程 | `127.0.0.1:3100`（只绑本地，由 nginx 反代） |
| 接口 | `/api/`（同域，不需要 CORS） |

## 零、先决条件

- Node >= 22.14，npm >= 12（系统 npm 10.x 装不上这个仓库，原因见 `.npmrc`）
- 部署机上已有 Postgres、Redis、nginx
- **HTTPS 证书**。这不是可选项：浏览器的 Geolocation API 只在安全上下文下可用，
  `http://` + 非 localhost 一律**静默**拒绝，天气页的自动定位会直接废掉；
  `Secure` cookie 同样需要它。

## 一、建库

```bash
# 找到 Postgres 容器名
docker ps --format '{{.Names}}\t{{.Image}}' | grep -i postgres

docker exec -i <PG容器> psql -U postgres <<'SQL'
CREATE DATABASE h5tools;
CREATE USER h5tools WITH PASSWORD '换成一个强密码';
GRANT ALL PRIVILEGES ON DATABASE h5tools TO h5tools;
SQL
```

⚠ **PostgreSQL 15 起必须再做这一步**，否则 Prisma 建第一张表就会
`permission denied for schema public` —— 光给 database 权限是不够的：

```bash
docker exec -i <PG容器> psql -U postgres -d h5tools -c \
  "GRANT ALL ON SCHEMA public TO h5tools; ALTER SCHEMA public OWNER TO h5tools;"
```

> 本地开发用的是 PostgreSQL 17。**部署机的版本要核对一下** —— 差太多的话迁移行为
> 可能不一致。

## 二、配置

`apps/api/.env`（参照 `.env.example`）：

```
NODE_ENV=production
PORT=3100
API_PREFIX=api
APP_ORIGIN=https://tools.example.com:8443
DATABASE_URL="postgresql://h5tools:密码@内网PG地址:5432/h5tools?schema=public"
REDIS_URL="redis://:密码@内网Redis地址:6379"
REDIS_KEY_PREFIX="h5tools:"
```

`apps/web/.env.production`：

```
VITE_BASE_PATH=/
```

## 三、构建与放置

```bash
npx -y npm@latest install     # ⚠ 不要用系统 npm
npm run build                 # shared -> api -> web

npm run db:deploy -w @h5tools/api    # 建表（只应用已有迁移）
npm run user:seed -w @h5tools/api    # 建初始账号 admin / 123123
npm run user:passwd -- admin         # ⚠ 上线前必须改，见下
```

**原地部署，不复制文件**：仓库直接放在服务器上（当前是 `/apt/servers/h5tools`），
nginx 的 `root` 和 PM2 的 `cwd` 都指向仓库内的目录。

| 用途 | 路径 |
|---|---|
| nginx `root` | `<仓库>/apps/web/dist` |
| PM2 `cwd` | `<仓库>/apps/api` |
| 配置 | `<仓库>/apps/api/.env`（已被 gitignore，`git pull` 不会覆盖） |

这样少一步复制，也少一类"改了代码忘了同步"的问题。代价是**更新流程必须是
先 `git pull` 再 `npm run build`** —— `dist/` 被 gitignore，pull 下来的是源码，
不重新构建的话页面还是旧的。

⚠ nginx 的运行用户（通常 `www-data`）必须能**穿过整条路径**到 `dist`。
`/apt`、`/apt/servers`、仓库目录任何一级少了 `x` 权限都会 403，
而 nginx 只会说 `Permission denied`、不告诉你卡在哪一级。查法：

```bash
sudo -u www-data ls /apt/servers/h5tools/apps/web/dist
```

> ⚠ **生产上只用 `db:deploy`，不要用 `db:migrate`。**
> 后者是 `prisma migrate dev` —— 开发命令，检测到 schema 漂移时会**提示重置整个数据库**，
> 还会自作主张生成新的迁移文件。生产库上这两件事都不能发生。

### 连接串里的特殊字符要转义

主机部分只写 `host:port`，**不带 `http://`**；密码里的这些字符必须百分号编码：

| 字符 | 写成 |
|---|---|
| `#` | `%23` |
| `@` | `%40` |
| `/` | `%2F` |
| `:` | `%3A` |
| `?` | `%3F` |
| `%` | `%25` |

不转义的典型症状：带 `http://` 报 `P1013 invalid port number`；
密码里有 `#` 则 `#` 之后的内容被当作 URL 片段**静默截掉**，表现为认证失败或库名不对。

## 四、起进程

```bash
# 原地部署：直接用仓库里的配置，改一下里面的 cwd 即可
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup    # 按它输出的命令执行一次（需要 root），实现开机自启

# PM2 默认不轮转日志，时间长了会撑爆磁盘
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 14
```

**如果 admin 还是初始口令，进程会拒绝启动**并打印改密命令。这是刻意的：
这个站公网可达，挂上去几小时内就会有扫描器对着登录接口跑弱口令字典，
而整套安全方案押在这一个密码上。

## 五、nginx

抄 `deploy/nginx.conf.example`，改 `listen` / `server_name` / 证书路径 / `root`。

里面有两行是**登录限流的生命线**：

```nginx
proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

后端设了 `trust proxy`，按 `X-Forwarded-For` 取客户端 IP。不转发的话后端看到的
永远是 `127.0.0.1`，「按 IP 限流」会退化成全站共享一个额度 —— 等于没有防爆破。

## 六、上线后必须验的六件事

这六件事**只能在真实环境验证**，localhost 一件都测不出来
（localhost 本身就是安全上下文，`Secure` cookie 照样种得上，`trust proxy` 根本不生效）。
这也是为什么要在没有任何功能的时候就先上线一次。

| # | 验什么 | 怎么验 |
|---|---|---|
| 1 | 子域名解析 | `dig tools.example.com` |
| 2 | 证书 | 浏览器打开不报警；`curl -sI https://tools.example.com:8443/` |
| 3 | nginx 反代 | `curl -s https://tools.example.com:8443/api/health` 返回 `{"status":"ok"}` |
| 4 | 连内网 Postgres | `pm2 logs h5tools-api` 里有「数据库已连接」 |
| 5 | 连内网 Redis | 能登录成功即说明 session 写进去了 |
| 6 | **trust proxy 取到真实 IP** | 见下 |

第 6 条最容易被忽略，而它坏了没有任何明显症状。验法：故意连续输错 5 次密码，
账号被锁后**换一台设备/换个网络**再试同一个账号 —— 应该仍然是锁定的（账号维度生效）；
然后换一个账号名从新 IP 登录，应该**不**受影响（说明 IP 维度算的是真实 IP，
而不是把所有人都算成 nginx 那一个地址）。

## ⚠ Redis 是共享实例

内网那台 Redis 上有别的项目在跑。我们靠 **key 前缀**隔离，不靠库号 ——
库号今天空不空是会变的。

- 生产用 `REDIS_KEY_PREFIX=h5tools:`，与本地开发（`h5tools-dev:`）分开，
  否则本地调试会踢掉线上用户的 session
- **绝不要对这台 Redis 执行 `flushdb` / `flushall`**
- 清理本项目数据用按前缀扫描删除，不要清库

## 常见故障

| 症状 | 多半是 |
|---|---|
| 页面空白、资源 404 | `VITE_BASE_PATH` 与实际挂载路径不一致，且**改了没重新 build** |
| 接口 502 | 后端没起来。`pm2 logs h5tools-api` —— 多半是 .env 缺配置，或 admin 还是初始口令被守卫拦下 |
| 能登录但刷新就掉线 | cookie 没种上。检查是不是 https（生产会下发 `Secure`，http 下浏览器不回传） |
| 谁都登录不上、提示尝试过于频繁 | `X-Forwarded-For` 没转发，所有人共享同一个 IP 额度 |
| 建表报 `permission denied for schema public` | PG 15+ 的 schema 授权那一步漏了，见第一节 |
| `P1013 invalid port number` | 连接串里多写了 `http://`，主机部分只要 `host:port` |
| 认证失败但密码明明是对的 | 密码里有 `#` 等特殊字符没做百分号编码 |
| 线上用户莫名被登出 | `REDIS_KEY_PREFIX` 与本地开发或测试用了同一个值 |
| 页面 403 | nginx 用户穿不过仓库路径，逐级 `sudo -u www-data ls` 查是哪一级 |
| 改了代码但页面没变 | 原地部署下 `git pull` 只更新源码，**必须再 `npm run build`** |
