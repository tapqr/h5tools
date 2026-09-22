# 14 天气类型合并进 shared

Status: resolved
Blocked by: 13

weather-app 的 CLAUDE.md 自己承认的痛点：

> `frontend/src/types/weather.ts` 是 `backend/src/weather/interfaces/weather.interfaces.ts` 的**手抄副本**（两个独立项目，不共享包）。**改后端契约必须同步改前端类型**，没有任何自动检查会提醒你。

## 要做

- 把对外契约类型移进 `packages/shared`：`ProviderResult`、`NormalizedLocation` 等
- **删除两份手抄副本** `types/weather.ts`、`types/location.ts`
- 服务端内部接口（`WeatherQuery`、`WeatherProvider`）留在后端，**不进 shared** —— shared 只放对外契约

## 验收

- 改 shared 里的字段名，前后端同时编译失败（这就是整件事的目的）
- 仓库里不再存在手抄的类型副本

## Comments

**已完成（2026-09-22）。** 天气与地理的对外契约（含全部注释 —— 那些注释解释了
两家数据源为什么要这样归一化，是这个项目最值钱的部分之一）迁入 `packages/shared`。

服务端内部接口 `WeatherQuery` 与 `WeatherProvider` **留在后端**：它们进 shared
会让前端看见本不该看见的边界，时间一长这个包就退化成公共垃圾桶。

模块里的 `interfaces/*.ts` 改成从 shared **转出**，这样模块内十几个文件的
import 路径不必全部改写，"这个模块的类型面"也还在一个地方看得全。单一来源仍在 shared。

顺带把 geo 的两个响应形状（`ReverseGeoResponse`、`GeoListResponse`）也补进了契约 ——
它们原先只以内联字面量的形式存在于 controller 的返回类型里，前端没法引用。

### 验收时发现「编译期契约保障」只接了一半

第一次验收**失败**：改了 shared 的字段名，后端构建照样通过。

原因是 `apps/api/tsconfig.json` 当初**没加 `references`**，只有 `apps/web` 加了。
之前 api 能抓到 `CurrentUser` 改名，是因为那次验证先构建了 web，
web 通过项目引用顺带把 shared 重建了 —— **造成"两边都接好了"的假象**。

`nest build` 走 `tsc -p`，不会构建被引用的工程。所以 api 除了声明 `references`，
构建脚本里还要显式 `tsc -b ../../packages/shared`。

这条教训已写回 `docs/adr/0003`，连同一条明确的验法：**必须分开单独构建两个包**，
连着跑 `npm run build` 会让先跑的那个重建 shared，验不出问题。
