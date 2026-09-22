import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  HttpException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { CurrentUser as CurrentUserType } from '@h5tools/shared';
import { Public } from './public.decorator.js';
import { CurrentUser } from './current-user.decorator.js';
import { AuthService } from './auth.service.js';
import { LoginThrottleService } from './login-throttle.service.js';
import { LoginDto } from './dto/login.dto.js';
import { SESSION_COOKIE, sessionCookieOptions } from './cookie.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly throttle: LoginThrottleService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CurrentUserType> {
    // req.ip 的正确性依赖 main.ts 里的 trust proxy —— 没设的话这里拿到的
    // 永远是 nginx 的地址，IP 维度的限流会退化成全站共享一个额度
    const ip = req.ip ?? 'unknown';

    const status = await this.throttle.check(ip, dto.username);
    if (status.locked) {
      res.setHeader('Retry-After', String(status.retryAfter));
      throw new HttpException(
        `尝试过于频繁，请 ${Math.ceil(status.retryAfter / 60)} 分钟后再试`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.auth.validate(dto.username, dto.password);
    if (!user) {
      const delay = await this.throttle.recordFailure(ip, dto.username);
      await sleep(delay);
      // 不区分「用户不存在」与「密码错误」—— 区分了等于送出一个枚举账号的接口
      throw new UnauthorizedException('账号或密码不正确');
    }

    await this.throttle.clear(ip, dto.username);
    const sid = await this.auth.createSession(user.id);
    res.cookie(
      SESSION_COOKIE.name,
      sid,
      sessionCookieOptions(this.config.get<string>('nodeEnv') === 'production'),
    );
    return user;
  }

  /**
   * 登出刻意是 @Public() 的。
   *
   * 若要求已登录，session 过期后点「登出」会拿到 401，而且 res.clearCookie
   * 根本不会执行 —— 浏览器里那个失效的 cookie 反而留着不动。
   * 这个接口对无效 session 是纯粹的空操作，幂等且无副作用；
   * 跨站强制登出由 SameSite=Lax 挡住。
   */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const sid = req.cookies?.[SESSION_COOKIE.name];
    if (sid) await this.auth.destroySession(sid);
    res.clearCookie(
      SESSION_COOKIE.name,
      sessionCookieOptions(this.config.get<string>('nodeEnv') === 'production'),
    );
  }

  @Get('me')
  me(@CurrentUser() user: CurrentUserType): CurrentUserType {
    return user;
  }
}
