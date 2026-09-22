import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * Prisma 7 不再用查询引擎二进制，改走驱动适配器（这里是 node-postgres）。
 *
 * 连接串从 ConfigService 取而不是直接读 process.env —— 测试里要把它指向
 * 测试库，走统一入口才能一处覆盖。
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService) {
    const connectionString = config.getOrThrow<string>('databaseUrl');
    super({ adapter: new PrismaPg({ connectionString }) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('数据库已连接');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
