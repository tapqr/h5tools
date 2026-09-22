import type { Server } from 'node:http';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from '../app.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { resetDb } from './db.js';

export interface TestApp {
  app: NestExpressApplication;
  /** 给 supertest 用。getHttpServer() 返回 any，在这里收成具体类型，
   *  免得每个 spec 各自 as 一遍 —— 那样 vitest 不报错但构建会红。 */
  server: Server;
  prisma: PrismaService;
  redis: RedisService;
  /** 清空数据库与测试 Redis，用于用例之间的隔离 */
  reset(): Promise<void>;
  close(): Promise<void>;
}

/**
 * 起一个与 main.ts 形态一致的应用。
 *
 * 关键是走完整的 AppModule —— 全局 AuthGuard 是通过 APP_GUARD 注册的，
 * 只 import 单个 controller 的测试模块**不会**带上它，那样测出来的
 * 「接口能访问」是假的。
 */
export async function createTestApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();

  app.set('trust proxy', 1);
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.init();

  const prisma = app.get(PrismaService);
  const redis = app.get(RedisService);

  return {
    app,
    server: app.getHttpServer() as Server,
    prisma,
    redis,
    async reset() {
      await resetDb(prisma);
      await redis.client.flushdb();
    },
    async close() {
      await app.close();
    },
  };
}
