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

  it('链接管理页只适配 PC', () => {
    const admin = routes.find((r) => r.name === 'nav-admin');
    expect(admin?.meta?.platforms).toEqual(['pc']);
  });

  /** 管理页不进导航栏：手机上根本进不去，PC 上从导航页顶部进 */
  it('管理页不出现在导航入口里', () => {
    const admin = routes.find((r) => r.name === 'nav-admin');
    expect(admin?.meta?.nav).toBeUndefined();
  });

  /**
   * 全站默认需要登录。漏标 public 的后果是「要登录才能看」（安全），
   * 误标 public 的后果是「裸奔」（不安全）—— 所以默认值必须是前者。
   */
  /**
   * 天气页自带一整套随昼夜变色的沉浸式皮肤，外壳要让位。
   * 这个标记掉了的症状是：顶栏/底 tab 罩在变色背景上，交界处很难看。
   */
  it('天气页声明了 fullBleed', () => {
    const weather = routes.find((r) => r.name === 'weather');
    expect(weather?.meta?.fullBleed).toBe(true);
  });

  it('只有登录页、不支持提示页和 404 是 public', () => {
    const publicRoutes = routes.filter((r) => r.meta?.public).map((r) => r.name);
    expect(publicRoutes.sort()).toEqual(['login', 'not-found', 'unsupported']);
  });
});
