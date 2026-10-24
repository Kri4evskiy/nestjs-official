import { ContextIdFactory, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { AggregateByTenantContextIdStrategy } from './core/aggregate-by-tenant.strategy.js';

ContextIdFactory.apply(new AggregateByTenantContextIdStrategy());

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
