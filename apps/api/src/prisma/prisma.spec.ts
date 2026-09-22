import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import configuration from '../config/configuration.js';
import { PrismaModule } from './prisma.module.js';
import { PrismaService } from './prisma.service.js';
import { resetDb } from '../test/db.js';

describe('PrismaService 连真实测试库', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, load: [configuration] }), PrismaModule],
    }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDb(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('连的是测试库，不是业务库', () => {
    expect(process.env.DATABASE_URL).toBe(process.env.DATABASE_URL_TEST);
    expect(process.env.DATABASE_URL).toMatch(/_test/);
  });

  it('能写入并读回 User', async () => {
    await prisma.user.create({
      data: { username: 'alice', displayName: '爱丽丝', passwordHash: 'x' },
    });

    const found = await prisma.user.findUnique({ where: { username: 'alice' } });
    expect(found?.displayName).toBe('爱丽丝');
    // 初始账号建出来时密码从未改过 —— 生产启动守卫据此判断(issue 04)
    expect(found?.passwordChangedAt).toBeNull();
  });

  it('username 唯一', async () => {
    await prisma.user.create({
      data: { username: 'bob', displayName: '鲍勃', passwordHash: 'x' },
    });
    await expect(
      prisma.user.create({
        data: { username: 'bob', displayName: '另一个鲍勃', passwordHash: 'y' },
      }),
    ).rejects.toThrow();
  });

  it('用例之间互不污染', async () => {
    // 上一个用例建了 bob，这里应该看不到
    await expect(prisma.user.count()).resolves.toBe(0);
  });
});
