import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CoffeesModule } from './coffees/coffees.module.js';

@Module({
  imports: [CoffeesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
