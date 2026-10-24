import { ContextIdFactory, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { AggregateByTenantContextIdStrategy } from './core/aggregate-by-tenant.strategy.js';
import { AggregateByLocaleContextIdStrategy } from './core/aggregate-by-locale.strategy.js';

// ⚠️ NOTE on ContextIdFactory strategies:
// ContextIdFactory.apply() registers a single global strategy. Calling it multiple times
// will overwrite the previous strategy (last one wins).
//
// In this educational project:
// - Enable AggregateByLocaleContextIdStrategy to test i18n (/ path with accept-language header)
// - Enable AggregateByTenantContextIdStrategy to test Multi-tenancy (/users path with x-tenant-id header)
//
// 💡 Production Best Practice:
// To support BOTH multi-tenancy and i18n simultaneously, implement a single CompositeContextIdStrategy
// that combines tenant and locale maps and returns a combined payload: { tenantId, localeCode }.

ContextIdFactory.apply(new AggregateByLocaleContextIdStrategy());
// ContextIdFactory.apply(new AggregateByTenantContextIdStrategy());

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
