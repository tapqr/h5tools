# 14 天气类型合并进 shared

Status: ready-for-agent
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
