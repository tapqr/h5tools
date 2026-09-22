import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthGuard } from './auth.guard.js';
import { PasswordService } from './password.service.js';
import { SessionService } from './session.service.js';
import { LoginThrottleService } from './login-throttle.service.js';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    SessionService,
    LoginThrottleService,
    // 全站默认拒绝。放行要显式 @Public()。
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [AuthService, PasswordService, SessionService],
})
export class AuthModule {}
