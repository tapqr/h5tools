import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { UserAdminService } from './user-admin.service.js';

@Module({
  // PasswordService 与 SessionService 由 AuthModule 导出。
  // 不是循环依赖：AuthModule 不反过来依赖 UserModule。
  imports: [AuthModule],
  providers: [UserAdminService],
  exports: [UserAdminService],
})
export class UserModule {}
