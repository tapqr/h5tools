<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { routes } from '../router/routes';
import { usePlatformStore } from '../stores/platform';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const platform = usePlatformStore();
const auth = useAuthStore();

/** 导航入口按当前端过滤 —— 手机上不显示只适配 PC 的页面 */
const navItems = computed(() =>
  routes
    .filter((r) => r.meta?.nav)
    .filter((r) => !r.meta?.platforms || r.meta.platforms.includes(platform.platform))
    .map((r) => ({
      name: String(r.name),
      title: r.meta!.nav!.title,
      icon: r.meta!.nav!.icon,
      order: r.meta!.nav!.order,
    }))
    .sort((a, b) => a.order - b.order),
);

// 外壳让位：天气页那类自带整套沉浸式皮肤的页面用
const bare = computed(() => route.meta.fullBleed === true || !auth.isAuthenticated);

async function onLogout() {
  await auth.logout();
  await router.replace({ name: 'login' });
}
</script>

<template>
  <div v-if="bare" class="shell shell--bare">
    <RouterView />
  </div>

  <div v-else class="shell" :class="platform.isPc ? 'shell--pc' : 'shell--mobile'">
    <header v-if="platform.isPc" class="topbar">
      <span class="topbar__brand">h5tools</span>
      <nav class="topbar__nav">
        <RouterLink v-for="item in navItems" :key="item.name" :to="{ name: item.name }">
          {{ item.title }}
        </RouterLink>
      </nav>
      <button class="topbar__logout" type="button" @click="onLogout">
        {{ auth.user?.displayName }} · 登出
      </button>
    </header>

    <main class="content">
      <RouterView />
    </main>

    <nav v-if="platform.isMobile" class="tabbar">
      <RouterLink v-for="item in navItems" :key="item.name" :to="{ name: item.name }">
        <span class="tabbar__icon">{{ item.icon }}</span>
        <span class="tabbar__label">{{ item.title }}</span>
      </RouterLink>
    </nav>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100svh;
  display: flex;
  flex-direction: column;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 0 20px;
  height: 56px;
  background: var(--app-surface);
  border-bottom: 1px solid var(--app-border);
}

.topbar__brand {
  font-weight: 600;
  letter-spacing: 0.5px;
}

.topbar__nav {
  display: flex;
  gap: 18px;
  flex: 1;
}

.topbar__nav a {
  color: var(--app-ink-dim);
  padding: 4px 0;
  border-bottom: 2px solid transparent;
}

.topbar__nav a.router-link-active {
  color: var(--app-ink);
  border-bottom-color: var(--app-accent);
}

.topbar__logout {
  background: none;
  border: none;
  color: var(--app-ink-dim);
  padding: 6px 10px;
  border-radius: var(--app-radius);
}

.topbar__logout:hover {
  background: var(--app-bg);
}

.content {
  flex: 1;
  min-width: 0;
}

.shell--mobile .content {
  /* 给底部 tab 让出位置，顺带避开 iPhone 的 home indicator */
  padding-bottom: calc(60px + env(safe-area-inset-bottom, 0px));
}

.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  background: var(--app-surface);
  border-top: 1px solid var(--app-border);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.tabbar a {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 0;
  color: var(--app-ink-dim);
  font-size: 12px;
}

.tabbar a.router-link-active {
  color: var(--app-accent);
}

.tabbar__icon {
  font-size: 18px;
  line-height: 1;
}
</style>
