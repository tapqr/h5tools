import { createTestApp, loggedInAgent, type TestApp } from '../test/app.js';
import { QWeatherGeoProvider } from './providers/qweather-geo.provider.js';
import type { NormalizedLocation } from './interfaces/geo.interfaces.js';

// 端到端契约测试:真正走 HTTP 层,覆盖 controller.spec 覆盖不到的 DTO 转换与校验。
// 用 .overrideProvider(QWeatherGeoProvider) 换成假 provider,不会真的打和风 API,
// 所以不需要 .env 里的真实凭据。
//
// 搬迁后的两处变化:
// 1. geo 接口**需要登录**(全局 AuthGuard 默认拒绝),用已登录的 supertest agent 发请求。
// 2. 原来每个用例重建一次应用,为的是拿到干净的进程内缓存。现在缓存在 Redis 里,
//    ctx.reset() 会清掉本测试前缀下的全部 key(含缓存),所以应用建一次就够 ——
//    但**桩的行为要在每个用例前重置**,因为有用例会把它改成 reject。

const dongcheng: NormalizedLocation = {
  id: '101011600',
  name: '东城',
  adm1: '北京市',
  adm2: '北京',
  lat: 39.91755,
  lon: 116.41876,
};

describe('GET /geo (e2e)', () => {
  let ctx: TestApp;
  let agent: Awaited<ReturnType<typeof loggedInAgent>>;

  const fakeProvider = {
    reverse: vi.fn(),
    search: vi.fn(),
    top: vi.fn(),
  };

  beforeAll(async () => {
    ctx = await createTestApp({
      customize: (builder) =>
        builder.overrideProvider(QWeatherGeoProvider).useValue(fakeProvider),
    });
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    // 有用例会把桩改成 reject，必须逐个用例复位，否则测试之间会互相污染
    fakeProvider.reverse.mockReset().mockResolvedValue(dongcheng);
    fakeProvider.search.mockReset().mockResolvedValue([dongcheng]);
    fakeProvider.top.mockReset().mockResolvedValue([dongcheng]);

    // 连带清掉 Redis 里的响应缓存 —— 否则上一个用例缓存下来的成功响应，
    // 会让下一个"上游挂了"的用例照样拿到 200
    await ctx.reset();
    agent = await loggedInAgent(ctx, 'geo-tester');
  });

  it('reverse 把 query string 里的字符串坐标转成数字并返回地点', async () => {
    const response = await agent.get('/geo/reverse?lat=39.9042&lon=116.4074').expect(200);

    expect(response.body).toEqual({ location: dongcheng });
    // DTO 必须把字符串转成 number,否则 provider 拿到的是 "39.9042"
    expect(fakeProvider.reverse).toHaveBeenCalledWith(39.9042, 116.4074);
  });

  it('reverse 缺参数返回 400', async () => {
    await agent.get('/geo/reverse?lat=39.9042').expect(400);
  });

  it('reverse 坐标非法返回 400', async () => {
    await agent.get('/geo/reverse?lat=999&lon=116.4074').expect(400);
  });

  it('reverse 在上游失败时仍返回 200 + location:null,不让前端进错误分支', async () => {
    fakeProvider.reverse.mockRejectedValue(new Error('upstream down'));

    const response = await agent.get('/geo/reverse?lat=39.9042&lon=116.4074').expect(200);

    expect(response.body).toEqual({ location: null });
  });

  it('search 返回候选列表', async () => {
    const response = await agent.get('/geo/search?q=%E5%8C%97%E4%BA%AC').expect(200);

    expect(response.body).toEqual({ locations: [dongcheng] });
    expect(fakeProvider.search).toHaveBeenCalledWith('北京');
  });

  it('search 单字关键词是有效请求,不设最小长度门槛', async () => {
    await agent.get('/geo/search?q=%E5%8C%97').expect(200);

    expect(fakeProvider.search).toHaveBeenCalledWith('北');
  });

  it('search 缺 q 或 q 为空白返回 400', async () => {
    await agent.get('/geo/search').expect(400);
    await agent.get('/geo/search?q=%20%20').expect(400);
  });

  it('search 的 q 超过 32 字符返回 400 —— 防止用户可控的无界 key 挤占共享 LRU 缓存', async () => {
    const tooLong = 'a'.repeat(33);
    await agent.get(`/geo/search?q=${tooLong}`).expect(400);
  });

  it('search 在上游失败时返回 5xx —— 用户主动发起的操作必须有反馈', async () => {
    fakeProvider.search.mockRejectedValue(new Error('upstream down'));

    await agent.get('/geo/search?q=%E5%8C%97%E4%BA%AC').expect(500);
  });

  it('search 的错误响应体不含上游原始文本', async () => {
    fakeProvider.search.mockRejectedValue(new Error('API key is invalid: secret-token-leaked'));

    const response = await agent.get('/geo/search?q=%E5%8C%97%E4%BA%AC').expect(500);

    expect(JSON.stringify(response.body)).not.toContain('secret-token-leaked');
  });

  it('top 返回热门城市', async () => {
    const response = await agent.get('/geo/top').expect(200);

    expect(response.body).toEqual({ locations: [dongcheng] });
  });

  it('top 在上游失败时返回 200 + 空数组', async () => {
    fakeProvider.top.mockRejectedValue(new Error('upstream down'));

    const response = await agent.get('/geo/top').expect(200);

    expect(response.body).toEqual({ locations: [] });
  });
});
