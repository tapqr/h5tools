import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type {
  CreateCategoryRequest,
  CreateLinkRequest,
  ReorderRequest,
  UpdateCategoryRequest,
  UpdateLinkRequest,
} from '@h5tools/shared';

export class CreateCategoryDto implements CreateCategoryRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name!: string;
}

export class UpdateCategoryDto implements UpdateCategoryRequest {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name?: string;
}

/**
 * URL 校验放开了 require_tld 与协议白名单里的内网场景。
 *
 * 这是个人效率工具，收录的链接里相当一部分是**内网地址**
 * （`http://jenkins:8080`、`http://10.0.13.x/...`）。用默认的严格 URL 校验
 * 会把这些全部拒掉 —— 而它们恰恰是这个导航页最该收录的东西。
 */
const URL_OPTIONS = {
  require_tld: false,
  require_protocol: true,
  protocols: ['http', 'https'],
};

export class CreateLinkDto implements CreateLinkRequest {
  @IsUUID()
  categoryId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;

  @IsUrl(URL_OPTIONS)
  @MaxLength(2000)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  icon?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string | null;
}

export class UpdateLinkDto implements UpdateLinkRequest {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsUrl(URL_OPTIONS)
  @MaxLength(2000)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  icon?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string | null;
}

class CategoryOrderItem {
  @IsUUID()
  id!: string;

  @IsInt()
  sortOrder!: number;
}

class LinkOrderItem {
  @IsUUID()
  id!: string;

  @IsUUID()
  categoryId!: string;

  @IsInt()
  sortOrder!: number;
}

export class ReorderDto implements ReorderRequest {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryOrderItem)
  categories?: CategoryOrderItem[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LinkOrderItem)
  links?: LinkOrderItem[];
}
