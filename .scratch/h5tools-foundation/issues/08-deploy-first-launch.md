# 08 首次部署上线（空站）

Status: ready-for-agent
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
