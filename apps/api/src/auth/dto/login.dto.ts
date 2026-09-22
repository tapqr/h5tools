import { IsString, MaxLength, MinLength } from 'class-validator';
import type { LoginRequest } from '@h5tools/shared';

export class LoginDto implements LoginRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  username!: string;

  // 上限是为了挡住拿超长字符串打 argon2 的 CPU（argon2 本身就慢，这是特性）
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  password!: string;
}
