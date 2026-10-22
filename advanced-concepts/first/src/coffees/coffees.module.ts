import { Module } from '@nestjs/common';
import { CoffeesService } from './coffees.service.js';
import { CoffeesController } from './coffees.controller.js';
import { COFFEES_DATA_SOURCE } from './coffees.service.js';
import { Coffee } from './entities/coffee.entity.js';
import { randomUUID } from 'crypto';

@Module({
  controllers: [CoffeesController],
  providers: [
    CoffeesService,
    { provide: COFFEES_DATA_SOURCE, useValue: [] },
    { provide: Coffee, useValue: { uuid: randomUUID() } },
  ],
})
export class CoffeesModule {}
