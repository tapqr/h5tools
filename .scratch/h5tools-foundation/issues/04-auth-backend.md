# 04 认证后端

Status: ready-for-agent
Blocked by: 03

安全姿态见 spec 第 5 节。这是整个站点唯一的门。

## 要做

- **argon2id** 哈希（不是 bcrypt，更不是 sha256）
- **Redis session**：cookie `httpOnly + Secure + SameSite=Lax`，30 天滑动过期，cookie 名带前缀（cookie 不区分端口，同子域名下别的服务会串）
- `POST /api/auth/login`、`POST /api/auth/logout`、`GET /api/auth/me`
- **全局 AuthGuard 默认拒绝**，`@Public()` 装饰器显式放行。登录接口是唯一的 Public
- 登录限流：**IP + 账号双维度**（Redis），连续失败递增延迟 + 临时锁定
- **`main.ts` 设 `trust proxy`** —— 在 nginx 后面不设，按 IP 限流会退化成全站共享一个额度
- **生产弱口令守卫**：`NODE_ENV=production` 且 admin 密码仍为初始 `123123` 时**拒绝启动**，打印改密命令

## 验收

- 未登录访问任意非 Public 接口返回 401
- 登录成功后 cookie 带 Secure/httpOnly/SameSite
- 连续错误密码触发锁定，换 IP 不绕过账号维度的锁
- 生产模式下弱口令启动失败
- 契约测试覆盖以上每一条
