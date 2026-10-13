# 18 账号角色分级

Status: resolved
Blocked by: 05

全站统一 12 位密码下限太严，普通账号记不住。原因是把「整站安全」
的标准套在了「一份个人书签」上 —— 这是两种爆炸半径。

## 要做

- `User.role`：`admin` / `user` 两档，默认 `user`
- 密码下限按角色分：admin 12 位，user 8 位。**只管长度，不加组合要求**
- `@Roles()` 装饰器，给以后的 admin 专属接口用
- `user:create --role admin`；`user:list` 显示角色
- 迁移要**回填**已部署实例里那行 admin

## 不做

- 通用权限系统（权限表、资源级 ACL）。业务数据本来按 `userId` 隔离，
  角色只回答一个问题：能不能碰全站配置
- 「敏感信息加密存库 + 密钥分片」。它解决的是拖库，不是弱密码；
  且现在库里没有值得加密的东西（API key 在 `.env`）。理由见 ADR

## 结果

**已完成（2026-10-12）。** 见 `docs/contexts/auth/adr/0002-password-minimum-by-role.md`。

- 迁移 `20261012071911_add_user_role`，带 `UPDATE users SET role='admin'
  WHERE username='admin'` 的回填 —— 不回填的话线上那个 admin 会被默认值
  悄悄降成 user，密码下限跟着从 12 掉到 8
- Prisma enum 取值用小写（`admin`/`user`），跟 shared 里的字面量联合类型
  **完全一致**，两边不需要映射层
- 角色检查做在 `AuthGuard` 里，不拆独立的 `RolesGuard`：拆开的话能不能
  拿到 `req.user` 取决于 `APP_GUARD` 的注册顺序，顺序错了的症状是
  「所有人都能过」，静默
- `@Public()` + `@Roles()` 并存直接抛错，而不是悄悄放行
- `changePassword` 必须先查用户再取下限，顺序反了 admin 会被按 8 位放行

## 留下的尾巴

`@Roles()` 目前**没有真实消费方** —— 应用里还没有 admin 专属接口。
契约测试用的是只存在于测试里的 controller（`roles.e2e.spec.ts`），
这是刻意的：这个装饰器失效的方式是静默放行，等接上第一个敏感接口
才发现就已经晚了。
