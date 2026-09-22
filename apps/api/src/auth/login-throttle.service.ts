import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service.js';

/** 计数窗口 */
const WINDOW_SECONDS = 15 * 60;
/** 同一账号连续失败多少次后锁定 */
const ACCOUNT_LIMIT = 5;
/** 同一 IP 连续失败多少次后锁定 —— 比账号维度宽，因为一个 IP 后面可能有多个人 */
const IP_LIMIT = 20;
/** 锁定时长 */
const LOCK_SECONDS = 15 * 60;

const failKey = (dim: string, id: string) => `login-fail:${dim}:${id}`;
const lockKey = (dim: string, id: string) => `login-lock:${dim}:${id}`;

export interface ThrottleStatus {
  locked: boolean;
  /** 还需等待多少秒 */
  retryAfter: number;
}

/**
 * 登录失败限流，IP 与账号**两个维度**。
 *
 * 只按 IP 限流挡不住分布式撞库（换 IP 就绕过），只按账号限流则任何人都能
 * 用一堆错误密码把你自己锁在门外。两个维度一起用，两边都要过。
 *
 * ⚠ 这一切的前提是 `app.set('trust proxy')` —— 在 nginx 后面不设，
 * 拿到的 IP 永远是代理的，IP 维度会退化成「全站共享一个额度」。
 */
@Injectable()
export class LoginThrottleService {
  constructor(private readonly redis: RedisService) {}

  async check(ip: string, username: string): Promise<ThrottleStatus> {
    const [ipTtl, userTtl] = await Promise.all([
      this.redis.client.ttl(lockKey('ip', ip)),
      this.redis.client.ttl(lockKey('user', username)),
    ]);
    const retryAfter = Math.max(ipTtl, userTtl);
    return { locked: retryAfter > 0, retryAfter: Math.max(retryAfter, 0) };
  }

  /** 记一次失败。返回这次应当施加的延迟毫秒数。 */
  async recordFailure(ip: string, username: string): Promise<number> {
    const ipCount = await this.bump('ip', ip, IP_LIMIT);
    const userCount = await this.bump('user', username, ACCOUNT_LIMIT);

    // 递增延迟：让脚本化猜测的成本随失败次数上升，而正常手滑几乎无感
    const worst = Math.max(ipCount / IP_LIMIT, userCount / ACCOUNT_LIMIT);
    return Math.min(Math.round(worst * 1000), 2000);
  }

  async clear(ip: string, username: string): Promise<void> {
    await this.redis.client.del(
      failKey('ip', ip),
      failKey('user', username),
      lockKey('ip', ip),
      lockKey('user', username),
    );
  }

  private async bump(dim: string, id: string, limit: number): Promise<number> {
    const key = failKey(dim, id);
    const count = await this.redis.client.incr(key);
    if (count === 1) {
      await this.redis.client.expire(key, WINDOW_SECONDS);
    }
    if (count >= limit) {
      await this.redis.client.set(lockKey(dim, id), '1', 'EX', LOCK_SECONDS);
    }
    return count;
  }
}
