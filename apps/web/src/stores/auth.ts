import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { CurrentUser, LoginRequest } from '@h5tools/shared';
import { api, ApiError } from '../api/client';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<CurrentUser | null>(null);
  /** 首次恢复会话前为 true —— 守卫要等它结束再判断，否则会误跳登录页 */
  const restoring = ref(true);

  async function restore(): Promise<void> {
    try {
      user.value = await api.get<CurrentUser>('/auth/me');
    } catch {
      // 未登录是正常状态，不是错误
      user.value = null;
    } finally {
      restoring.value = false;
    }
  }

  async function login(credentials: LoginRequest): Promise<void> {
    user.value = await api.post<CurrentUser>('/auth/login', credentials);
  }

  async function logout(): Promise<void> {
    try {
      await api.post<void>('/auth/logout');
    } catch (err) {
      // 登出接口是幂等的；网络失败也要把本地状态清掉
      if (!(err instanceof ApiError)) throw err;
    } finally {
      user.value = null;
    }
  }

  return {
    user,
    restoring,
    isAuthenticated: computed(() => user.value !== null),
    restore,
    login,
    logout,
  };
});
