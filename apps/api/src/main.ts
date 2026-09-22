import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // 线上在 nginx 后面。不设这个,Express 看到的 req.ip 永远是代理的地址,
  // 登录失败限流会退化成「全站共享一个额度」—— 等于没有防爆破。
  // 上线后必须验证日志里拿到的是真实客户端 IP。
  app.set('trust proxy', 1);

  const apiPrefix = config.get<string>('apiPrefix');
  if (apiPrefix) {
    app.setGlobalPrefix(apiPrefix);
  }

  // 前后端同域部署,浏览器不会发起跨域请求,这里配了也不生效。
  // 保留是为了本地开发时 vite dev server(5173)能打到这里。
  app.enableCors({ origin: config.get<string>('appOrigin'), credentials: true });

  await app.listen(config.get<number>('port') ?? 3100, '127.0.0.1');
}

await bootstrap();
