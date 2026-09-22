import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import type { CurrentUser as CurrentUserType, NavCategory, NavLink, NavTree } from '@h5tools/shared';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { NavService } from './nav.service.js';
import {
  CreateCategoryDto,
  CreateLinkDto,
  ReorderDto,
  UpdateCategoryDto,
  UpdateLinkDto,
} from './dto/nav.dto.js';

/**
 * 全部路由都需要登录 —— 没有 @Public()，全局 AuthGuard 默认拒绝。
 */
@Controller('nav')
export class NavController {
  constructor(private readonly nav: NavService) {}

  /** 一次返回整棵树。几十条的量级，不分页、不懒加载。 */
  @Get('tree')
  tree(@CurrentUser() user: CurrentUserType): Promise<NavTree> {
    return this.nav.tree(user.id);
  }

  @Post('categories')
  createCategory(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: CreateCategoryDto,
  ): Promise<NavCategory> {
    return this.nav.createCategory(user.id, dto);
  }

  @Patch('categories/:id')
  updateCategory(
    @CurrentUser() user: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<NavCategory> {
    return this.nav.updateCategory(user.id, id, dto);
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCategory(
    @CurrentUser() user: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.nav.deleteCategory(user.id, id);
  }

  @Post('links')
  createLink(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: CreateLinkDto,
  ): Promise<NavLink> {
    return this.nav.createLink(user.id, dto);
  }

  @Patch('links/:id')
  updateLink(
    @CurrentUser() user: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLinkDto,
  ): Promise<NavLink> {
    return this.nav.updateLink(user.id, id, dto);
  }

  @Delete('links/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteLink(
    @CurrentUser() user: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.nav.deleteLink(user.id, id);
  }

  @Patch('order')
  @HttpCode(HttpStatus.NO_CONTENT)
  reorder(@CurrentUser() user: CurrentUserType, @Body() dto: ReorderDto): Promise<void> {
    return this.nav.reorder(user.id, dto);
  }

  /** 前端用 navigator.sendBeacon 打这个，不阻塞跳转 */
  @Post('links/:id/click')
  @HttpCode(HttpStatus.NO_CONTENT)
  click(
    @CurrentUser() user: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.nav.recordClick(user.id, id);
  }

  @Post('stats/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetStats(@CurrentUser() user: CurrentUserType): Promise<void> {
    return this.nav.resetStats(user.id);
  }
}
