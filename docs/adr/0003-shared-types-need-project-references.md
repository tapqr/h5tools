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

## 每一个消费方都要单独接，漏一个就漏一半

**这条自己就被漏过一次。** 最初只给 `apps/web` 加了 `references`，`apps/api` 没加 ——
而当时验证用的命令先构建了 web（它通过项目引用顺带重建了 shared），
所以 api 也跟着看到了新类型，**造成"两边都接好了"的假象**。

后来单独构建 api 时才发现：改了 shared 的字段名，api 构建照样通过，
因为它读的是 `packages/shared/dist` 的陈旧产物。

`nest build` 走的是 `tsc -p`，**不会**构建被引用的工程。所以 api 除了声明
`references`，构建脚本里还要显式 `tsc -b ../../packages/shared` 把上游先建出来。

## 怎么验证它还活着

这条保障断掉是静默的，而且如上所述**很容易只断一半**。验法：

```bash
# 改 packages/shared 里任意一个被两边都用到的字段名，然后分别单独构建
npm run build -w @h5tools/api    # 必须报错
npm run build -w @h5tools/web    # 必须报错
```

**必须分开单独跑。** 连着跑 `npm run build` 会让先跑的那个把 shared 重建掉，
后跑的那个就算没接好也会报错，验不出问题。
