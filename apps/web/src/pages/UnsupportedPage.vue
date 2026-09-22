<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { usePlatformStore } from '../stores/platform';

const route = useRoute();
const platform = usePlatformStore();
const other = computed(() => (platform.isMobile ? '电脑' : '手机'));
</script>

<template>
  <div class="unsupported">
    <div class="unsupported__icon">🖥</div>
    <h1>这个页面在当前设备上不可用</h1>
    <p>
      <code>{{ route.query.page }}</code> 只适配{{ platform.isMobile ? 'PC' : '移动端' }}，
      请用{{ other }}打开。
    </p>
    <RouterLink class="unsupported__back" :to="{ name: 'home' }">回到首页</RouterLink>
  </div>
</template>

<style scoped>
.unsupported {
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  text-align: center;
}

.unsupported__icon {
  font-size: 48px;
}

.unsupported h1 {
  font-size: 20px;
  margin: 0;
}

.unsupported p {
  color: var(--app-ink-dim);
  margin: 0;
}

.unsupported__back {
  margin-top: 12px;
  color: var(--app-accent);
}
</style>
