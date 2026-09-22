<template>
  <div class="notfound">
    <h1>404</h1>
    <p>没有这个页面。</p>
    <RouterLink :to="{ name: 'nav' }">回到导航</RouterLink>
  </div>
</template>

<style scoped>
.notfound {
  padding: 48px 24px;
  text-align: center;
  color: var(--app-ink-dim);
}

.notfound h1 {
  font-size: 40px;
  margin: 0 0 8px;
  color: var(--app-ink);
}
</style>
