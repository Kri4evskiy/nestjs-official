import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { DataSourceModule } from '../data-source/data-source.module.js';

@Module({
  imports: [DataSourceModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
