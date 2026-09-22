# 08 首次部署上线（空站）

Status: needs-info
Blocked by: 05, 07

**这一步必须在做功能之前完成。** 理由见 spec 第 12 节：这六件事只能在真实环境验证，localhost 一件都测不出来。

## 要验穿的六件事

1. 子域名解析
2. HTTPS 证书（**硬需求**，否则天气页定位会废）
3. nginx 反代到 Node 进程
4. 后端连内网 Postgres
5. 后端连内网 Redis
6. `Secure` cookie 能否种上 + `trust proxy` 拿到的是不是真实客户端 IP

## 要做

- `deploy/nginx.conf.example`：`listen 8443 ssl`、`server_name tools.example.com`、静态产物 root、`location /api/` 反代到 `127.0.0.1:3100`，转发 `X-Forwarded-For`/`X-Forwarded-Proto`
- 进程守护（PM2 或 systemd），配置文件若用 PM2 **必须叫 `.cjs`**（后端是 ESM，PM2 用 require 读配置）
- 构建与发布脚本
- `docs/DEPLOYMENT.md`：建库命令（含 PG15 的 `GRANT ALL ON SCHEMA public`）、环境变量表、改域名/端口只需改哪两处、改密码命令、故障对照表
- 上线后立刻验证 `trust proxy`：日志里的客户端 IP 必须是真实公网 IP 而非 127.0.0.1

## 验收

- 公网打开登录页，用 admin 登进空首页
- 故意连续输错密码，锁定按**真实 IP** 生效

## Comments

**配置与文档已就绪，实际上线待你操作（2026-09-22）。**

已写好：
- `deploy/nginx.conf.example` —— 含 `X-Forwarded-For` 转发（登录限流的生命线）
- `deploy/ecosystem.config.cjs` —— 文件名必须是 `.cjs`，因为 api 是 ESM 而 PM2 用 require 读配置
- `docs/DEPLOYMENT.md` —— 建库（含 PG15+ 的 schema 授权那一步）、配置、构建、起进程、
  上线后必验的六件事、故障对照表

### 还缺的信息

1. 真实的子域名与端口（现在全是 `tools.example.com:8443` 占位）
2. 部署机上 Postgres / Redis 的内网地址
3. 证书的位置与签发方式
4. 部署机的 **PostgreSQL 版本**（本地是 17，差太多迁移行为可能不一致）

### 验第 6 条（trust proxy）的方法写进文档了

这条坏了没有任何明显症状，但会让防爆破完全失效。验法是：连续输错 5 次锁住账号后
换网络再试同一账号（应仍锁定 = 账号维度生效），再换一个账号名从新 IP 登录
（应不受影响 = IP 维度算的是真实 IP，而不是把所有人算成 nginx 那一个地址）。
