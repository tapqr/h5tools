import { Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';

/**
 * @nestjs/throttler 只从包根导出了 ThrottlerStorage，没导出这个记录类型
 * （它在 dist/throttler-storage-record.interface 里）。深入 dist 取类型太脆 ——
 * 那是构建产物路径，升级时说没就没。四个字段就地声明，结构对上即可。
 */
interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}
import { RedisService } from './redis.service.js';

/**
 * 把 @nestjs/throttler 的计数放到 Redis。
 *
 * 自己写而不是引第三方 storage 包：接口只有一个方法，而搬迁源在
 * @nestjs/throttler 的依赖兼容上已经踩过一次（它的 package.json 里留着一段
 * 为 peer 声明滞后而加的 overrides）。多一个跟着 throttler 版本走的包，
 * 就多一处会在升级时卡住的地方。
 *
 * key 会自动带上 RedisService 的命名空间前缀 —— 那是一台共享 Redis。
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redis: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const countKey = `throttle:${throttlerName}:${key}`;
    const blockKey = `throttle-block:${throttlerName}:${key}`;

    const client = this.redis.client;
    const [hits, ttlMs, blockTtlMs] = await Promise.all([
      client.incr(countKey),
      client.pttl(countKey),
      client.pttl(blockKey),
    ]);

    // 第一次计数时才设窗口，否则每次请求都把窗口往后推 —— 那样窗口永远不会结束
    if (hits === 1) {
      await client.pexpire(countKey, ttl);
    }

    let isBlocked = blockTtlMs > 0;
    let timeToBlockExpire = Math.ceil(Math.max(blockTtlMs, 0) / 1000);

    if (!isBlocked && hits > limit) {
      await client.set(blockKey, '1', 'PX', blockDuration);
      isBlocked = true;
      timeToBlockExpire = Math.ceil(blockDuration / 1000);
    }

    return {
      totalHits: hits,
      // hits === 1 时 pttl 拿到的是 -1（还没设过期），用配置值兜底
      timeToExpire: Math.ceil((ttlMs > 0 ? ttlMs : ttl) / 1000),
      isBlocked,
      timeToBlockExpire,
    };
  }
}
