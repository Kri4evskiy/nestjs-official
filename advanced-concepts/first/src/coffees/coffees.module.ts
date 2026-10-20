import { Module } from '@nestjs/common';
import { CoffeesService } from './coffees.service.js';
import { CoffeesController } from './coffees.controller.js';

@Module({
  controllers: [CoffeesController],
  providers: [CoffeesService],
})
export class CoffeesModule {}
