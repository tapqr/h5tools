# 共享类型包必须用 TypeScript 项目引用接入

`packages/shared` 在 `apps/web/tsconfig.app.json` 里声明为 `references`，
而不只是 `package.json` 里的一条依赖。

## 为什么

选 TypeScript 做后端的核心论据是「接口契约变成编译期保证，字段改名两边一起飘红」。
**光靠包依赖兑现不了这个论据。**

实测：只做包依赖时，改 `packages/shared` 里的字段名，`vue-tsc -b` 会因为增量缓存
判定「无需重建」而**放过这次变更，前端构建照样通过**。只有 `--force` 才能抓到。

加上 `references` 后，`tsc -b` 知道 shared 是上游工程，会自动跟着重建。
现在改一个字段名，前后端在增量构建下同时飘红。

## 怎么验证它还活着

这条保障断掉是静默的。验法：把 `CurrentUser.displayName` 改个名，
`npm run build` 必须在 api 和 web 两边都报错。
