import { Module } from '@nestjs/common';
import { NavController } from './nav.controller.js';
import { NavService } from './nav.service.js';

@Module({
  controllers: [NavController],
  providers: [NavService],
})
export class NavModule {}
