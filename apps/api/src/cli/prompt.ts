import { createInterface } from 'node:readline';
import { randomBytes } from 'node:crypto';

/**
 * 读一行密码，**不回显**。
 *
 * 不用命令行参数传密码：那会把明文留在 shell history、`ps` 的输出和
 * 各种进程监控里。非交互场景（脚本、CI）走管道喂进来。
 */
export function promptHidden(question: string): Promise<string> {
  if (!process.stdin.isTTY) {
    // 管道输入：读一行就走
    return new Promise((resolve) => {
      const rl = createInterface({ input: process.stdin });
      rl.once('line', (line) => {
        rl.close();
        resolve(line.trim());
      });
    });
  }

  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const output = rl as unknown as { output: NodeJS.WriteStream; _writeToOutput(s: string): void };
    let muted = false;
    output._writeToOutput = (s: string) => {
      if (!muted) output.output.write(s);
    };
    rl.question(question, (answer) => {
      muted = false;
      process.stdout.write('\n');
      rl.close();
      resolve(answer);
    });
    muted = true;
  });
}

/**
 * 生成一个随机强密码。
 *
 * 用 base64url 的 24 字节 ≈ 192 bit 熵 —— 远超任何字典攻击的射程。
 * 这是「不加两步验证」这个决定成立的前提：整套安全押在密码上，
 * 那密码就不能是人脑记得住的东西。
 */
export function generatePassword(): string {
  return randomBytes(24).toString('base64url');
}
