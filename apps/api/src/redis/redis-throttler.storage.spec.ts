import { createTestApp, type TestApp } from '../test/app.js';
import { RedisThrottlerStorage } from './redis-throttler.storage.js';

describe('RedisThrottlerStorage', () => {
  let ctx: TestApp;
  let storage: RedisThrottlerStorage;

  beforeAll(async () => {
    ctx = await createTestApp();
    storage = ctx.app.get(RedisThrottlerStorage);
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await ctx.reset();
  });

  it('计数累加', async () => {
    const a = await storage.increment('k', 60000, 5, 60000, 'default');
    const b = await storage.increment('k', 60000, 5, 60000, 'default');
    expect(a.totalHits).toBe(1);
    expect(b.totalHits).toBe(2);
  });

  it('未超限时不阻断', async () => {
    const r = await storage.increment('k', 60000, 5, 60000, 'default');
    expect(r.isBlocked).toBe(false);
  });

  it('超过额度后阻断并给出解封剩余时间', async () => {
    for (let i = 0; i < 5; i++) await storage.increment('k', 60000, 5, 60000, 'default');
    const over = await storage.increment('k', 60000, 5, 60000, 'default');
    expect(over.isBlocked).toBe(true);
    expect(over.timeToBlockExpire).toBeGreaterThan(0);
  });

  it('不同限流器之间互不干扰', async () => {
    await storage.increment('k', 60000, 5, 60000, 'default');
    const geo = await storage.increment('k', 60000, 5, 60000, 'geo');
    expect(geo.totalHits).toBe(1);
  });

  it('不同 key 之间互不干扰', async () => {
    await storage.increment('a', 60000, 5, 60000, 'default');
    const b = await storage.increment('b', 60000, 5, 60000, 'default');
    expect(b.totalHits).toBe(1);
  });

  /**
   * 这条是最容易写错的地方：如果每次请求都重设过期时间，窗口会被不断往后推，
   * 计数永远不会归零 —— 表现为"限流越来越严，最后谁都进不来"。
   */
  it('窗口只在第一次计数时设定，不会被后续请求往后推', async () => {
    await storage.increment('k', 60000, 5, 60000, 'default');
    const first = await ctx.redis.client.pttl('throttle:default:k');

    await new Promise((r) => setTimeout(r, 30));
    await storage.increment('k', 60000, 5, 60000, 'default');
    const second = await ctx.redis.client.pttl('throttle:default:k');

    expect(second).toBeLessThanOrEqual(first);
  });

  it('第一次计数就返回正确的窗口剩余时间', async () => {
    const r = await storage.increment('k', 60000, 5, 60000, 'default');
    expect(r.timeToExpire).toBe(60);
  });
});
