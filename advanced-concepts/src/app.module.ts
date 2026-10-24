import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CoffeesModule } from './coffees/coffees.module.js';
import { SchedulerModule } from './scheduler/scheduler.module.js';
import { CronModule } from './cron/cron.module.js';
import { FibonacciModule } from './fibonacci/fibonacci.module.js';
import { CircuitBreakerInterceptor } from './common/interceptors/circuit-breaker/circuit-breaker.interceptor.js';
import { APP_INTERCEPTOR, ContextIdFactory } from '@nestjs/core';
import { HttpClientModule } from './http-client/http-client.module.js';
import { TagsModule } from './tags/tags.module.js';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PaymentsModule } from './payments/payments.module.js';
import { DataSourceModule } from './data-source/data-source.module.js';
import { UsersModule } from './users/users.module.js';
import { AggregateByTenantContextIdStrategy } from './core/aggregate-by-tenant.strategy.js';

ContextIdFactory.apply(new AggregateByTenantContextIdStrategy());
@Module({
  imports: [
    EventEmitterModule.forRoot(),
    CoffeesModule,
    SchedulerModule,
    CronModule,
    FibonacciModule,
    HttpClientModule.register({ baseUrl: 'http://nestjs.com' }),
    TagsModule,
    PaymentsModule,
    DataSourceModule,
    UsersModule,
    // ⚠️  Alternatively:
    // HttpClientModule.registerAsync({
    //   useFactory: () => ({ baseUrl: 'http://nestjs.com' }),
    // }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: CircuitBreakerInterceptor,
    },
  ],
})
export class AppModule {}
