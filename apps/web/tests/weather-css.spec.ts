import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * 天气页的样式是通过非 scoped 的 `<style>` 引入的，也就是**全局注入且永不卸载**。
 * 而天气页是懒加载路由 —— 一旦访问过一次，这份 CSS 里任何没被限定作用域的规则
 * 都会留在整个会话里，把别的页面一起改掉。
 *
 * 搬迁时踩过一次：`body` 的渐变背景和 `#app` 的 520px 限宽跟着泄漏出去，
 * 导航页会变成一条窄列、背景还是天气色。**这种坏法是完全静默的** ——
 * 不报错，只是别的页面莫名其妙变了样，而且要先访问天气页才复现。
 *
 * 所以用一条结构性测试钉住它。
 */
describe('weather.css 的作用域', () => {
  // 用 vitest 的 root（apps/web）作基准。不用 import.meta.url —— 测试环境里
  // 它不是 file: URL；也不用 ?raw —— Vite 对 CSS 的处理链会让它拿不到源文本。
  const css = readFileSync(resolve(process.cwd(), 'src/weather/weather.css'), 'utf8');
  // 注释里会提到 :root（解释为什么不用它），先剥掉再检查，否则测的是注释不是代码
  const code = css.replace(/\/\*[\s\S]*?\*\//g, '');

  /**
   * 抓出所有**顶层**选择器。
   *
   * 按嵌套层级扫描，不按行匹配 —— 第一版是按行的（要求行尾是 `{`），
   * 结果 `body { background: red; }` 这种写在一行里的规则直接漏过，
   * 反向验证时才发现这条测试自己有洞。
   */
  function topLevelSelectorsOf(source: string): string[] {
    const selectors: string[] = [];
    let depth = 0;
    let buffer = '';
    for (const ch of source) {
      if (ch === '{') {
        if (depth === 0) selectors.push(buffer.trim());
        depth++;
        buffer = '';
      } else if (ch === '}') {
        depth = Math.max(0, depth - 1);
        buffer = '';
      } else if (depth === 0) {
        buffer += ch;
      }
    }
    // @media 之类的 at-rule 本身不是选择器，它内部的规则要单独看
    return selectors.filter((sel) => sel.length > 0 && !sel.startsWith('@'));
  }

  const topLevelSelectors = topLevelSelectorsOf(code);

  it('确实解析到了选择器（防止这条测试因为解析失败而空过）', () => {
    expect(topLevelSelectors.length).toBeGreaterThan(5);
  });

  it('每一个顶层选择器都被 .weather-page 限定', () => {
    const leaking = topLevelSelectors.filter((sel) =>
      sel.split(',').some((one) => !one.trim().startsWith('.weather-page')),
    );
    expect(leaking).toEqual([]);
  });

  it('不含 :root —— 那会把配色变量挂到整站', () => {
    expect(code).not.toMatch(/:root/);
  });
});
