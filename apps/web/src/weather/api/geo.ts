import type { NormalizedLocation } from '@h5tools/shared';

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

/**
 * 坐标反查地名。失败一律返回 null 而不抛错 —— 地名是锦上添花,不该打断天气流程。
 * 后端在上游失败时也返回 200 + location:null,这里再兜一层网络层失败。
 */
export async function fetchReverseLocation(lat: number, lon: number): Promise<NormalizedLocation | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/geo/reverse?lat=${lat}&lon=${lon}`, WITH_SESSION);
    if (!response.ok) {
      return null;
    }
    const body: { location: NormalizedLocation | null } = await response.json();
    return body.location;
  } catch {
    return null;
  }
}

/** 关键词搜索。失败要抛错,让调用方能显示可重试的提示 —— 这是用户主动发起的操作。 */
export async function searchLocations(q: string): Promise<NormalizedLocation[]> {
  const response = await fetch(`${API_BASE_URL}/geo/search?q=${encodeURIComponent(q)}`, WITH_SESSION);
  if (!response.ok) {
    throw new Error(`城市搜索失败: HTTP ${response.status}`);
  }
  const body: { locations: NormalizedLocation[] } = await response.json();
  return body.locations;
}

/** 热门城市,只用于搜索层空状态。失败返回空数组,调用方退回提示文案。 */
export async function fetchTopLocations(): Promise<NormalizedLocation[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/geo/top`, WITH_SESSION);
    if (!response.ok) {
      return [];
    }
    const body: { locations: NormalizedLocation[] } = await response.json();
    return body.locations;
  } catch {
    return [];
  }
}
