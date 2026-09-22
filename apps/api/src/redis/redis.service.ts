import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

/**
 * Redis 在这个项目里承担三件事：session、天气缓存、限流。
 *
 * 用它而不是进程内状态，是为了解除「不能开多实例」的约束 —— 搬迁源
 * weather-app 的缓存和限流都在进程内，它的部署文档里专门写了
 * 「不要开 cluster 或多实例」，否则限流额度翻倍、缓存命中率骤降。
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor(config: ConfigService) {
    this.client = new Redis(config.getOrThrow<string>('redisUrl'), {
      maxRetriesPerRequest: 3,
    });
    this.client.on('error', (err: Error) => this.logger.error(`Redis 连接出错: ${err.message}`));
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
