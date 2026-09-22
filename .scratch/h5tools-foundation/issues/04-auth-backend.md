# 04 认证后端

Status: resolved
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

## Comments

**已完成（2026-09-22）。** 28 个用例全绿，覆盖默认拒绝、登录、限流、登出、会话吊销、
生产启动守卫六组行为。

### 实现要点

- **argon2id** 用 `@node-rs/argon2`（预编译 napi 二进制，不需要 node-gyp 编译，
  在 npm 12 默认拦截安装脚本的环境下也能直接用）
- **服务端 session 存 Redis**，不用 JWT。换来可即时吊销、无 token 续期、注销是真注销
- Redis 里同时记一份 `user-sess:<userId>` 集合，这样改密码时能**一次清掉该用户全部
  session** —— 否则「改了密码」对已登录的攻击者毫无影响
- **全局 AuthGuard 默认拒绝**（`APP_GUARD`），放行必须显式 `@Public()`
- 登录限流 **IP + 账号双维度**：只按 IP 挡不住换 IP 的撞库，只按账号则任何人都能
  拿错误密码把你锁在门外
- **生产启动守卫**：admin 还是初始口令就拒绝启动，并打印改密命令

### 三处在写测试时才想清楚的设计

**1. 登出必须是 `@Public()` 的。** 最初它受 AuthGuard 保护，测试立刻暴露问题：
session 过期后点「登出」拿到 401，而且 `res.clearCookie` 根本不会执行 ——
浏览器里那个失效的 cookie 反而留着不动。这个接口对无效 session 是纯空操作，
幂等无副作用，跨站强制登出由 `SameSite=Lax` 挡着。

**2. 用户不存在时也要跑一次哈希校验。** 否则「用户不存在」比「密码错误」返回得快，
响应时间本身就泄露了账号是否存在。用一个固定的 dummy hash 消耗相当的时间。

**3. 本地开发刻意不下发 `Secure` cookie。** 只在 `NODE_ENV=production` 时开 ——
本地走 `http://localhost`，带 `Secure` 的 cookie 浏览器根本不回传，
登录会以一种毫无线索的方式失败。测试里有一条断言专门盯着这个。

### 测试基建的一个缺陷（已修）

新增 spec 文件后出现「单跑都过、全套跑随机失败」。原因是 vitest 默认**并行**跑各
spec 文件，而它们共用同一个测试库和同一个 Redis 库 —— 用例隔离是靠清库做的，
并行时 A 文件的清库会把 B 文件正在用的数据冲掉。

已设 `fileParallelism: false`。要恢复并行得让每个文件用独立的库，代价不值得。

另外：**vitest 不做类型检查**，spec 里 `let server: unknown` 让测试全绿但 `npm run build`
报了十几个 TS2345。测试通过不等于构建通过，两个都要跑。
