# 17 旧站切换与下线

Status: needs-info
Blocked by: 15

旧 weather-app 部署在 `https://<域名>/weather-app/`（nginx + PM2）。

## 要做

- 新站天气页稳定运行一段时间后，把 `/weather-app/` 配成 **301** 跳到新地址
- 停掉旧的 PM2 进程，`pm2 save`
- 归档旧仓库，README 指向新仓库

## 为什么先并行

新站真出问题时还有个能用的天气页兜底。**不急着下线。**

## 待确认

切换时机由使用情况决定，开工时未定。
