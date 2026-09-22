// PM2 配置。
//
// ⚠ 文件名必须是 .cjs —— apps/api 是 ESM（"type": "module"），
// 而 PM2 用 require() 读配置，叫 .js 会直接报错。
// 这个坑搬迁源 weather-app 的部署文档里专门写过。
module.exports = {
  apps: [
    {
      name: 'h5tools-api',
      cwd: '/srv/h5tools/api',
      script: 'dist/main.js',
      // 单实例。不是因为有进程内状态（session/缓存/限流都在 Redis 里，
      // 多实例本身是可以的），而是这个站的负载根本用不着第二个进程。
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      // PM2 默认不轮转日志，时间长了会撑爆磁盘：
      //   pm2 install pm2-logrotate
      //   pm2 set pm2-logrotate:max_size 10M
      //   pm2 set pm2-logrotate:retain 14
    },
  ],
};
