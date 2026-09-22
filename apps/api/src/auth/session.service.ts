import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { RedisService } from '../redis/redis.service.js';

/** 30 天滑动过期 */
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

const sessionKey = (sid: string) => `sess:${sid}`;
const userSessionsKey = (userId: string) => `user-sess:${userId}`;

/**
 * 服务端 session，存 Redis。刻意不用 JWT。
 *
 * 换来三件事：可以即时吊销（改密码时清掉该用户全部 session）、
 * 不用处理 token 续期、注销是真注销而不是「前端把 token 删了」。
 */
@Injectable()
export class SessionService {
  constructor(private readonly redis: RedisService) {}

  async create(userId: string): Promise<string> {
    // 32 字节随机，base64url。不要用可预测的 id。
    const sid = randomBytes(32).toString('base64url');
    await this.redis.client
      .multi()
      .set(sessionKey(sid), userId, 'EX', SESSION_TTL_SECONDS)
      // 记一份「这个用户有哪些 session」，改密码时才能一次全清
      .sadd(userSessionsKey(userId), sid)
      .expire(userSessionsKey(userId), SESSION_TTL_SECONDS)
      .exec();
    return sid;
  }

  /** 命中则顺带续期（滑动过期）。返回 userId。 */
  async touch(sid: string): Promise<string | null> {
    const userId = await this.redis.client.get(sessionKey(sid));
    if (!userId) return null;

    await this.redis.client
      .multi()
      .expire(sessionKey(sid), SESSION_TTL_SECONDS)
      .expire(userSessionsKey(userId), SESSION_TTL_SECONDS)
      .exec();
    return userId;
  }

  async destroy(sid: string): Promise<void> {
    const userId = await this.redis.client.get(sessionKey(sid));
    const tx = this.redis.client.multi().del(sessionKey(sid));
    if (userId) tx.srem(userSessionsKey(userId), sid);
    await tx.exec();
  }

  /**
   * 清掉某个用户的所有 session。改密码后必须调用 ——
   * 否则「改了密码」对已经登录的攻击者毫无影响。
   */
  async destroyAllForUser(userId: string): Promise<number> {
    const sids = await this.redis.client.smembers(userSessionsKey(userId));
    const tx = this.redis.client.multi();
    for (const sid of sids) tx.del(sessionKey(sid));
    tx.del(userSessionsKey(userId));
    await tx.exec();
    return sids.length;
  }
}
