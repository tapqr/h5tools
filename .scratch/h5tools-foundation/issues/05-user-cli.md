# 05 账号管理命令行脚本

Status: ready-for-agent
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
