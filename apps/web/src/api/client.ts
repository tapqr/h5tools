export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly retryAfter?: number,
  ) {
    super(message);
  }
}

/** 401 时通知外界（路由守卫据此跳登录页），避免 api 层直接依赖 router */
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler = () => {};
export function setUnauthorizedHandler(fn: UnauthorizedHandler): void {
  onUnauthorized = fn;
}

/**
 * 所有请求走 `/api` **相对路径**。
 *
 * 代码里不存在写死的域名和端口 —— 前后端同域部署，本地开发由 vite 的 proxy
 * 转发到后端。这样换域名、换端口对前端是透明的，不需要重新构建。
 * （唯一需要重新构建的是换 base path，那是构建时写死的。）
 */
async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    // session 走 cookie，必须带上
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    onUnauthorized();
  }

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    const retryAfter = Number(res.headers.get('Retry-After')) || undefined;
    throw new ApiError(res.status, detail?.message ?? `请求失败（${res.status}）`, retryAfter);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => call<T>('GET', path),
  post: <T>(path: string, body?: unknown) => call<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => call<T>('PATCH', path, body),
  delete: <T>(path: string) => call<T>('DELETE', path),
};
