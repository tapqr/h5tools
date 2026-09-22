import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule } from '@nestjs/throttler';
import { createKeyv } from '@keyv/redis';
import configuration from './config/configuration.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { RedisThrottlerStorage } from './redis/redis-throttler.storage.js';
import { AuthModule } from './auth/auth.module.js';
import { UserModule } from './user/user.module.js';
import { NavModule } from './nav/nav.module.js';
import { WeatherModule } from './weather/weather.module.js';
import { GeoModule } from './geo/geo.module.js';

/**
 * 一个功能一个 Module。模块化单体 —— 不拆微服务，理由见 docs/adr/0001。
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    PrismaModule,
    RedisModule,

    /**
     * 天气与 geo 的响应缓存。
     *
     * 搬迁源把它放在进程内（`@cacheable/memory` + LRU 上限），并在部署文档里
     * 写明"不要开 cluster 或多实例"—— 否则限流额度翻倍、缓存命中率骤降。
     * 换成 Redis 之后那条约束解除了，reload 也不再丢缓存。
     *
     * 原来的 LRU 条目上限不再需要：Redis 有自己的 maxmemory policy，
     * 而且每个 key 都带 TTL。
     */
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: (config: ConfigService) => ({
        stores: [
          // 用 @keyv/redis 自带的 createKeyv 工厂，不要手工 new Keyv({ store })：
          // 那样 Keyv 和 KeyvRedis 会各加一次前缀，键名变成
          // `h5tools-dev:cache::h5tools-dev:cache:weather:...` —— 能用，但前缀重复了两遍。
          // createKeyv 会把 useKeyPrefix 关掉，前缀只由适配器加一次。
          createKeyv(config.getOrThrow<string>('redisUrl'), {
            // 和 RedisService 共用同一个命名空间前缀 —— 那是一台共享 Redis
            namespace: config.getOrThrow<string>('redisKeyPrefix') + 'cache',
          }),
        ],
      }),
      inject: [ConfigService],
    }),

    /**
     * 上游配额保护。两个具名限流器，controller 各自 @SkipThrottle 掉不属于自己的那个。
     *
     * ⚠ ThrottlerGuard **没有**注册成 APP_GUARD，而是挂在 WeatherController 与
     * GeoController 上。搬迁源是全局的，但在那个仓库里全站只有天气和 geo 两组接口。
     * 这里全局挂上去，30 次/分钟的额度会连带盖住导航页的加载和点击上报 ——
     * 那些接口打的是我们自己的数据库，没有配额问题，限它毫无收益却会弄坏界面。
     */
    ThrottlerModule.forRootAsync({
      // ConfigModule 与 RedisModule 都是 isGlobal，这里不需要真的导入什么，
      // 只是满足 ThrottlerAsyncOptions 把 imports 声明为必填的类型要求。
      imports: [],
      useFactory: (config: ConfigService, storage: RedisThrottlerStorage) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.get<number>('throttle.ttlMs')!,
            limit: config.get<number>('throttle.limit')!,
          },
          {
            name: 'geo',
            ttl: config.get<number>('geo.throttleTtlMs')!,
            limit: config.get<number>('geo.throttleLimit')!,
          },
        ],
        storage,
      }),
      inject: [ConfigService, RedisThrottlerStorage],
    }),

    AuthModule,
    UserModule,
    NavModule,
    WeatherModule,
    GeoModule,
    HealthModule,
  ],
})
export class AppModule {}
