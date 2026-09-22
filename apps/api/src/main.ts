import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { assertNoInitialPassword } from './auth/startup-password-check.js';
import { assertRequiredConfig } from './config/validate-required-config.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // 线上在 nginx 后面。不设这个，Express 看到的 req.ip 永远是代理的地址，
  // 登录失败限流会退化成「全站共享一个额度」—— 等于没有防爆破。
  // 上线后必须验证日志里拿到的是真实客户端 IP。
  app.set('trust proxy', 1);

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 天气数据源凭据缺失就启动失败，不要带着空凭据跑起来 ——
  // 那样 `https://${apiHost}/v7/weather/now` 会变成主机名是 v7 的 URL，
  // 真实 API Key 照样被发出去，而运维分不清是"配置漏了"还是"第三方挂了"。
  assertRequiredConfig(config);

  // 带着初始弱口令的生产实例不允许起来。详见 startup-password-check.ts
  await assertNoInitialPassword(app);

  const apiPrefix = config.get<string>('apiPrefix');
  if (apiPrefix) {
    app.setGlobalPrefix(apiPrefix);
  }

  // 前后端同域部署，浏览器不会发起跨域请求，这里配了也不生效。
  // 保留是为了本地开发时 vite dev server(5173)能打到这里。
  // credentials 必须开：session 走 cookie。
  app.enableCors({ origin: config.get<string>('appOrigin'), credentials: true });

  app.enableShutdownHooks();
  await app.listen(config.get<number>('port') ?? 3100, '127.0.0.1');
}

await bootstrap();
