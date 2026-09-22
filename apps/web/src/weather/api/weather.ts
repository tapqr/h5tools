import type { AggregatedWeatherResponse } from '@h5tools/shared';

/**
 * 同域相对路径。搬迁前这里读 VITE_API_BASE_URL（前后端是两个独立部署单元），
 * 现在前后端同域，代码里不该再出现任何写死的域名端口 —— 换域名换端口对前端透明。
 */
const API_BASE_URL = '/api';

/**
 * 天气与 geo 接口现在**需要登录**（全局 AuthGuard 默认拒绝），
 * 所以每个请求都要带上 session cookie。漏了这个参数的症状是全部 401。
 */
const WITH_SESSION: RequestInit = { credentials: 'same-origin' };

export async function fetchWeather(lat: number, lon: number): Promise<AggregatedWeatherResponse> {
  const response = await fetch(`${API_BASE_URL}/weather?lat=${lat}&lon=${lon}`, WITH_SESSION);
  if (!response.ok) {
    throw new Error(`天气接口请求失败: HTTP ${response.status}`);
  }
  return response.json();
}
