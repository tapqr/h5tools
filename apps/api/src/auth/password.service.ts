import { Injectable } from '@nestjs/common';
import { Algorithm, hash, verify } from '@node-rs/argon2';

/**
 * argon2id。不是 bcrypt，更不是 sha256。
 *
 * 这个站公网可达，整套安全性押在这一个密码上，哈希算法上不省钱。
 */
@Injectable()
export class PasswordService {
  hash(plain: string): Promise<string> {
    return hash(plain, { algorithm: Algorithm.Argon2id });
  }

  async verify(hashed: string, plain: string): Promise<boolean> {
    try {
      return await verify(hashed, plain);
    } catch {
      // 哈希串损坏或格式不对 —— 当作校验失败，不要把异常抛到登录流程里
      return false;
    }
  }
}
