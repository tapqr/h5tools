/**
 * 这个模块的类型出入口。
 *
 * 对外契约（前端也要用的那些）住在 `@h5tools/shared`，这里只做**转出** ——
 * 单一来源在 shared，改一个字段名前后端会同时编译失败。
 * 保留这个转出是为了让模块内十几个文件的 import 路径不必全部改写，
 * 也让「这个模块的类型面」在一个地方看得全。
 *
 * 下面两个是**服务端内部接口**，刻意不进 shared：
 * 它们进去会让前端看见本不该看见的边界。
 */
export type {
  ProviderName,
  NormalizedAirQuality,
  NormalizedCurrentWeather,
  NormalizedHourlyEntry,
  NormalizedDailyEntry,
  NormalizedWeather,
  ProviderResult,
  AggregatedWeatherResponse,
} from '@h5tools/shared';

import type { NormalizedWeather, ProviderName } from '@h5tools/shared';

/** 服务端内部：一次查询的入参 */
export interface WeatherQuery {
  lat: number;
  lon: number;
}

/**
 * 服务端内部：数据源的统一抽象。
 *
 * 加一家数据源只要实现它、注册进 providers.module.ts，聚合逻辑本身不用改。
 */
export interface WeatherProvider {
  readonly name: ProviderName;
  getForecast(query: WeatherQuery): Promise<NormalizedWeather>;
}
