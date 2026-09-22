import { routes, supportsPlatform } from './routes';

describe('路由的端声明', () => {
  it('没声明 platforms 视为两端都适配', () => {
    expect(supportsPlatform(undefined, 'pc')).toBe(true);
    expect(supportsPlatform(undefined, 'mobile')).toBe(true);
  });

  it('只声明 pc 时移动端不适配', () => {
    expect(supportsPlatform(['pc'], 'pc')).toBe(true);
    expect(supportsPlatform(['pc'], 'mobile')).toBe(false);
  });

  it('配置页只适配 PC', () => {
    const settings = routes.find((r) => r.name === 'settings');
    expect(settings?.meta?.platforms).toEqual(['pc']);
  });

  /**
   * 全站默认需要登录。漏标 public 的后果是「要登录才能看」（安全），
   * 误标 public 的后果是「裸奔」（不安全）—— 所以默认值必须是前者。
   */
  it('只有登录页、不支持提示页和 404 是 public', () => {
    const publicRoutes = routes.filter((r) => r.meta?.public).map((r) => r.name);
    expect(publicRoutes.sort()).toEqual(['login', 'not-found', 'unsupported']);
  });
});
