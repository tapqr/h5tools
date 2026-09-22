<script setup lang="ts">
import { useAuthStore } from '../stores/auth';
import { usePlatformStore } from '../stores/platform';

const auth = useAuthStore();
const platform = usePlatformStore();
</script>

<template>
  <div class="home">
    <h1>你好，{{ auth.user?.displayName }}</h1>
    <p class="home__hint">
      当前端：{{ platform.isPc ? 'PC' : '移动端' }}。功能正在陆续接入。
    </p>
  </div>
</template>

<style scoped>
.home {
  padding: 24px;
  max-width: 720px;
}

.home__hint {
  color: var(--app-ink-dim);
}
</style>
