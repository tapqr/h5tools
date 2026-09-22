<script setup lang="ts">
import { ref } from 'vue';
import type { CurrentUser } from '@h5tools/shared';

// 占位首页。issue 11 之后这里会变成 URL 导航页。
const user = ref<CurrentUser | null>(null);
</script>

<template>
  <main class="home">
    <h1>h5tools</h1>
    <p>{{ user ? user.displayName : '骨架已就绪。' }}</p>
  </main>
</template>

<style scoped>
.home {
  padding: 24px;
}
</style>
