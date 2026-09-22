# 05 账号管理命令行脚本

Status: resolved
Blocked by: 04

不做注册页，账号靠脚本。

## 要做

- `npm run user:create -- --name 张三 --username zhangsan`：生成随机强密码，**只打印这一次**
- `npm run user:passwd -- admin`：交互式输入新密码，**不回显、不进 shell 历史**
- `npm run user:list`
- 首次部署的 seed：建 `admin` / `123123`，并标记 `passwordChangedAt = null`
- 都直接写库，不需要重启服务

## 验收

- 改完密码旧 session 立即失效（Redis 里按 userId 清）
- 密码不出现在 `ps`、shell history、日志里

## Comments

**已完成（2026-09-22）。** `user:create` / `user:passwd` / `user:list` / `user:seed` 四个命令，
39 个用例全绿。

### 逻辑没有放在 CLI 脚本里

第一版把全部逻辑写在 `src/cli/user.ts` 里，能跑，但**没法测** —— 而这里面有一条
必须被测试盯住的契约：

> `seedAdmin()` 建出来的 admin 必须是 `passwordChangedAt = null`。

这是生产启动守卫能否生效的前提。若哪天有人顺手把它填上时间戳，带着弱口令的实例
就能正常上线，守卫形同虚设，**而且这种失效是完全静默的**。

所以抽出了 `UserAdminService`，CLI 退化成薄壳。测试里有一条专门断言
「seed 出来的 admin 会触发生产启动守卫」，把这两个模块的契约钉住。

### 密码处理

- `user:create` 生成 24 字节 base64url（约 192 bit 熵），**只打印一次**
- `user:passwd` 读一行不回显，也不接受命令行参数传密码 —— 那会把明文留在
  shell history、`ps` 输出和进程监控里
- 最短 12 位。不是行业惯性的 8 位：整站安全押在这一个密码上
- 改密后**必须**踢掉该账号全部会话，否则对已登录的攻击者毫无影响（有测试盯着）

### 踩到的小坑

`UserModule` 忘了 import `AuthModule`（`PasswordService`/`SessionService` 由它导出），
症状是六个 spec 文件里四个一起炸，真正的错误埋在一堆
`Cannot read properties of undefined (reading 'close')` 里面 —— 那些都是
`beforeAll` 失败后 `afterAll` 的连锁反应。**看这类批量失败要先找最上面那条原始错误。**
