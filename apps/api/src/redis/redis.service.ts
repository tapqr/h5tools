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
  /** 所有 key 的统一前缀，见 configuration.ts 的说明 */
  readonly keyPrefix: string;

  constructor(config: ConfigService) {
    this.keyPrefix = config.getOrThrow<string>('redisKeyPrefix');
    this.client = new Redis(config.getOrThrow<string>('redisUrl'), {
      // ioredis 会给所有命令的 key 自动加上它。
      // ⚠ 唯一的例外是 SCAN 的 MATCH 模式 —— 那个要自己拼前缀。
      keyPrefix: this.keyPrefix,
      maxRetriesPerRequest: 3,
    });
    this.client.on('error', (err: Error) => this.logger.error(`Redis 连接出错: ${err.message}`));
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  /**
   * 删掉本前缀下的所有 key。**只给测试用。**
   *
   * 刻意不用 flushdb:那会清掉整个 db,而这是一台共享 Redis,
   * 上面还有别的项目。SCAN 的 MATCH 不走 ioredis 的自动前缀,
   * 所以这里要手工拼上,删除时也要用不带前缀的原始 key。
   */
  async deleteAllPrefixed(): Promise<number> {
    let cursor = '0';
    let removed = 0;
    do {
      const [next, keys] = await this.client.scan(
        cursor,
        'MATCH',
        `${this.keyPrefix}*`,
        'COUNT',
        500,
      );
      cursor = next;
      if (keys.length > 0) {
        // SCAN 返回的是**带前缀的完整 key**，而 client.del 会再加一次前缀。
        // 所以先把前缀剥掉再删 —— 不这么做会去删 `h5tools-test:h5tools-test:xxx`，
        // 一个不存在的 key，结果是"删除成功但什么都没删掉"。
        const bare = keys.map((k) => k.slice(this.keyPrefix.length));
        removed += await this.client.del(...bare);
      }
    } while (cursor !== '0');
    return removed;
  }
}
