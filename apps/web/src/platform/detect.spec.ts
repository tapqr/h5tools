import { detectPlatform } from './detect';

const UA = {
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  androidPhone:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
  androidTablet:
    'Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  ipadOld:
    'Mozilla/5.0 (iPad; CPU OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1',
  ipadOS13:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  windows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
};

describe('detectPlatform', () => {
  it('iPhone 是移动端', () => {
    expect(detectPlatform({ userAgent: UA.iphone, coarsePointer: true })).toBe('mobile');
  });

  it('Android 手机是移动端', () => {
    expect(detectPlatform({ userAgent: UA.androidPhone, coarsePointer: true })).toBe('mobile');
  });

  it('Android 平板归 PC 侧（UA 里没有 Mobile）', () => {
    expect(detectPlatform({ userAgent: UA.androidTablet, coarsePointer: true })).toBe('pc');
  });

  it('老 iPad 归 PC 侧', () => {
    expect(detectPlatform({ userAgent: UA.ipadOld, coarsePointer: true })).toBe('pc');
  });

  it('iPadOS 13+ 伪装成 Macintosh，靠触屏信号认出来，归 PC 侧', () => {
    expect(detectPlatform({ userAgent: UA.ipadOS13, coarsePointer: true })).toBe('pc');
  });

  it('真 Mac 是 PC', () => {
    expect(detectPlatform({ userAgent: UA.mac, coarsePointer: false })).toBe('pc');
  });

  it('Windows 是 PC', () => {
    expect(detectPlatform({ userAgent: UA.windows, coarsePointer: false })).toBe('pc');
  });

  /**
   * 这条是整个判定方式的核心理由：PC 上把窗口拖窄不该改变「端」。
   * 判定函数根本拿不到宽度，所以这件事在结构上就不可能发生。
   */
  it('判定不依赖视口宽度 —— PC 窗口拖窄仍是 PC', () => {
    // 同样的信号重复判定，结果恒定；函数签名里没有宽度这个入参
    expect(detectPlatform({ userAgent: UA.windows, coarsePointer: false })).toBe('pc');
    expect(detectPlatform({ userAgent: UA.mac, coarsePointer: false })).toBe('pc');
  });
});
