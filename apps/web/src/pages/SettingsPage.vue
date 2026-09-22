<script setup lang="ts">
// 只适配 PC 的页面（meta.platforms: ['pc']）。
// 注意这里不做任何窄屏适配是**刻意的** —— PC 上把窗口拖窄时它会横向滚动，
// 而不是被判成「不支持」。判定依据是设备类型，不是窗口宽度。
</script>

<template>
  <div class="settings">
    <h1>配置</h1>
    <p class="settings__hint">这是一个只适配 PC 的页面。手机上导航里不会出现它的入口。</p>
    <table class="settings__table">
      <thead>
        <tr><th>项</th><th>值</th><th>说明</th></tr>
      </thead>
      <tbody>
        <tr><td>站点</td><td>h5tools</td><td>个人效率工具站</td></tr>
        <tr><td>接口前缀</td><td>/api</td><td>与前端同域，不需要 CORS</td></tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.settings {
  padding: 24px;
  /* 只适配 PC 的页面给一个最小宽度，窄窗口下横向滚动即可 */
  min-width: 640px;
}

.settings__hint {
  color: var(--app-ink-dim);
}

.settings__table {
  border-collapse: collapse;
  margin-top: 16px;
}

.settings__table th,
.settings__table td {
  border: 1px solid var(--app-border);
  padding: 8px 14px;
  text-align: left;
}
</style>
