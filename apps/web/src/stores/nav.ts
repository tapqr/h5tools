import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type {
  CreateCategoryRequest,
  CreateLinkRequest,
  NavCategory,
  NavLink,
  NavTree,
  ReorderRequest,
  UpdateCategoryRequest,
  UpdateLinkRequest,
} from '@h5tools/shared';
import { api } from '../api/client';

export const useNavStore = defineStore('nav', () => {
  const tree = ref<NavTree>({ categories: [] });
  const loading = ref(false);
  const loaded = ref(false);

  async function load(): Promise<void> {
    loading.value = true;
    try {
      tree.value = await api.get<NavTree>('/nav/tree');
      loaded.value = true;
    } finally {
      loading.value = false;
    }
  }

  async function createCategory(dto: CreateCategoryRequest): Promise<void> {
    await api.post<NavCategory>('/nav/categories', dto);
    await load();
  }

  async function updateCategory(id: string, dto: UpdateCategoryRequest): Promise<void> {
    await api.patch<NavCategory>(`/nav/categories/${id}`, dto);
    await load();
  }

  async function deleteCategory(id: string): Promise<void> {
    await api.delete<void>(`/nav/categories/${id}`);
    await load();
  }

  async function createLink(dto: CreateLinkRequest): Promise<void> {
    await api.post<NavLink>('/nav/links', dto);
    await load();
  }

  async function updateLink(id: string, dto: UpdateLinkRequest): Promise<void> {
    await api.patch<NavLink>(`/nav/links/${id}`, dto);
    await load();
  }

  async function deleteLink(id: string): Promise<void> {
    await api.delete<void>(`/nav/links/${id}`);
    await load();
  }

  async function reorder(dto: ReorderRequest): Promise<void> {
    await api.patch<void>('/nav/order', dto);
    await load();
  }

  async function resetStats(): Promise<void> {
    await api.post<void>('/nav/stats/reset');
    await load();
  }

  /**
   * 点击上报。
   *
   * 用 sendBeacon 而不是 fetch：点击会立刻跳走（新标签页打开时当前页也可能被
   * 切到后台），普通 fetch 在页面卸载或切后台时可能被浏览器取消。
   * sendBeacon 是为这个场景设计的 —— 交给浏览器后台发，不阻塞跳转。
   *
   * **上报失败绝不能影响跳转。** 统计只是锦上添花，链接打不开才是事故。
   */
  function reportClick(link: NavLink): void {
    const url = `/api/nav/links/${link.id}/click`;
    try {
      if (navigator.sendBeacon) {
        // 必须给一个 body，否则部分浏览器发的是 GET
        navigator.sendBeacon(url, new Blob([], { type: 'application/json' }));
      } else {
        void fetch(url, { method: 'POST', credentials: 'same-origin', keepalive: true });
      }
    } catch {
      // 统计丢了就丢了
    }
    // 本地先加上，不等下一次 load —— 否则常用区要刷新才动，看着像没生效
    link.clickCount += 1;
  }

  return {
    tree,
    loading,
    loaded,
    isEmpty: computed(() => tree.value.categories.length === 0),
    load,
    createCategory,
    updateCategory,
    deleteCategory,
    createLink,
    updateLink,
    deleteLink,
    reorder,
    resetStats,
    reportClick,
  };
});
