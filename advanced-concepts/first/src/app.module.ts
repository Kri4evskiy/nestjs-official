import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CoffeesModule } from './coffees/coffees.module.js';
import { SchedulerModule } from './scheduler/scheduler.module.js';
import { CronModule } from './cron/cron.module.js';
import { FibonacciModule } from './fibonacci/fibonacci.module.js';

@Module({
  imports: [CoffeesModule, SchedulerModule, CronModule, FibonacciModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
