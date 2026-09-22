import { defineConfig, env } from 'prisma/config';

// Prisma 7 起不再自动读 .env。用 Node 22 内置的 loadEnvFile，不为这一件事装 dotenv。
// CI 或部署环境直接注入环境变量、没有 .env 文件时，这里不该报错。
try {
  process.loadEnvFile(new URL('.env', import.meta.url).pathname);
} catch {
  // 没有 .env 就走进程已有的环境变量
}

/**
 * Prisma 7 起 datasource 的 url 从 schema 挪到这里。
 *
 * 只读 DATABASE_URL 一个变量 —— 要对测试库跑迁移就在命令行覆盖它：
 *   DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
 * 这样「连哪个库」永远是调用方的显式选择，不会出现"以为在测试库上、
 * 其实清了业务库"这种事。
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
