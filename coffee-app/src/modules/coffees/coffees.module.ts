import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoffeesController } from './coffees.controller';
import { CoffeesService } from './coffees.service';
import { Coffee } from './entities/coffee.entity';
import { Flavor } from './entities/flavor.entity';
import { ConfigModule } from '@nestjs/config';
import coffeesConfig from './config/coffees.config';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Coffee, Flavor]),
    ConfigModule.forFeature(coffeesConfig),
    EventsModule,
  ],
  exports: [CoffeesService],
  controllers: [CoffeesController],
  providers: [CoffeesService],
})
export class CoffeesModule {}
