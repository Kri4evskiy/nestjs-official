# NestJS Advanced Concepts - Course Notes

## Lesson: Debugging & Circular Dependencies

### 1. Enabling NestJS Debug Mode

Useful when troubleshooting dependency resolution issues (unknown dependencies / IoC errors).

- **macOS / Linux / Bash:**
  ```bash
  NEST_DEBUG=true npm run start:dev
  ```

- **Windows (PowerShell):**
  ```powershell
  $env:NEST_DEBUG="true"; npm run start:dev
  ```

---

### 2. Custom Providers & Injection Example

#### Interface (`coffees.service.ts`):
```typescript
export interface CoffeesDataSource {
  // OR alternatively: export type CoffeesDataSource = Coffee[]
  [index: number]: Coffee;
}
```

#### Token & Module Provider (`coffees.module.ts`):
```typescript
export const COFFEES_DATA_SOURCE = Symbol('COFFEES_DATA_SOURCE');

@Module({
  controllers: [CoffeesController],
  providers: [
    CoffeesService,
    {
      provide: COFFEES_DATA_SOURCE,
      useValue: [],
    },
  ],
})
export class CoffeesModule {}
```

#### Injecting Token into Service (`coffees.service.ts`):
```typescript
@Injectable()
export class CoffeesService {
  constructor(
    @Inject(COFFEES_DATA_SOURCE) private readonly dataSource: CoffeesDataSource,
  ) {}
}
```

---

### 3. Detecting Circular Dependencies with Madge

- **Detect circular dependencies in console:**
  ```bash
  npx madge dist/main.js --circular
  ```

- **Generate visual dependency graph (requires Graphviz installed):**
  ```bash
  npx madge dist/main.js --image graph.png
  ```

> **Note on Graphviz (Windows):**
> If you get `Error: Graphviz could not be found (gvpr ENOENT)`, install Graphviz and ensure its `bin` directory is in your `PATH`:
> ```powershell
> winget install Graphviz.Graphviz
> ```
> Documentation: [Madge Graphviz setup](https://www.npmjs.com/package/madge#graphviz-optional)

---

### 4. Best Practices to Prevent Circular Dependencies

- **Single Export per File:** Try to maintain one main export per file (e.g. only the service class or only the module class).
- **Dedicated Constants Files:** Move tokens, symbols, and shared configuration out of services and modules into separate files like `coffees.constants.ts`.
- **Linter Enforcements:** In projects with ESLint, enable rule `import/no-cycle` to catch circular imports at compile/lint time.

---

## Lesson: Lazy Loading Modules

Lazy loading allows deferring the compilation and instantiation of modules/providers until they are explicitly needed (e.g. in Serverless / AWS Lambda to decrease cold start times, or for rarely triggered operations).

### Implementation Reference

Implementation can be found in [`src/coffees/coffees.service.ts`](/src/coffees/coffees.service.ts) within the `create()` method:

```typescript
@Injectable()
export class CoffeesService {
  constructor(
    @Inject(COFFEES_DATA_SOURCE) dataSource: CoffeesDataSource,
    private readonly lazyModuleLoader: LazyModuleLoader, // 👈 Injected from '@nestjs/core'
  ) {}

  async create(createCoffeeDto: CreateCoffeeDto) {
    console.time();
    // 1. Dynamically load RewardsModule on-demand
    const rewardsModuleRef = await this.lazyModuleLoader.load(() =>
      import('../rewards/rewards.module.js').then((m) => m.RewardsModule),
    );

    // 2. Dynamically import RewardsService and obtain instance from loaded moduleRef
    const { RewardsService } = await import('../rewards/rewards.service.js');
    const rewardsService = rewardsModuleRef.get(RewardsService);
    console.timeEnd();

    // 3. Execute method from lazy service
    rewardsService.grantTo();
    return 'This action adds a new coffee';
  }
  // ...
}
```

### Key Differences from Eager Loading:
- `RewardsModule` is **NOT** included in `imports: [...]` in `CoffeesModule`.
- `RewardsService` is **NOT** statically injected into the `constructor`.
- The module is loaded and cached on first call; subsequent calls retrieve the cached reference with near-zero latency.

### Testing the Lazy-Loaded Endpoint

- **Windows PowerShell (using `curl.exe`):**
  ```powershell
  curl.exe -H "content-type: application/json" http://localhost:3000/coffees -d "{}"
  ```

---

## Lesson: Accessing IoC Container & Discovery Pattern (Custom Scheduler)

This lesson demonstrates how to inspect and introspect the NestJS IoC container dynamically using `@nestjs/core` utilities (`DiscoveryService`, `Reflector`, `MetadataScanner`). We implemented a custom interval scheduler (similar to `@nestjs/schedule`).

### How It Works:
- **`DiscoveryService`**: Scans and discovers provider instances from the IoC container.
- **`Reflector`**: Reads metadata decorators (`@IntervalHost`, `@Interval`).
- **`MetadataScanner`**: Iterates through all prototype method names of a class.
- **`OnApplicationBootstrap` & `OnApplicationShutdown`**: Manage timer lifecycles to start tasks on boot and prevent memory leaks on shutdown.

1. **Metadata Decorators:**
   - [`@IntervalHost`](/src/scheduler/decorators/interval-host.decorator.ts): Marks a class as a host containing periodic tasks.
   - [`@Interval(ms)`](/src/scheduler/decorators/interval.decorator.ts): Marks a method with a timer interval in milliseconds.
2. **Container Discovery & Lifecycle (`IntervalScheduler`):**
   - Implements `OnApplicationBootstrap` to scan providers after the application boots.
   - Uses `DiscoveryService.getProviders()` to traverse all instantiated classes in the container.
   - Uses `Reflector` to check for classes decorated with `@IntervalHost`.
   - Uses `MetadataScanner.getAllMethodNames()` to find methods decorated with `@Interval(ms)`.
   - Schedules tasks with `setInterval()`.
   - Implements `OnApplicationShutdown` to safely clean up all active intervals (`clearInterval`).

### Code Example:

#### Host Service ([`src/cron/cron.service.ts`](/src/cron/cron.service.ts)):
```typescript
@IntervalHost
export class CronService {
  @Interval(2000)
  everyTwoSeconds() {
    console.log('This will be logged every 2 seconds 🐈 ');
  }
}
```

#### Scheduler Service ([`src/scheduler/interval.scheduler/interval.scheduler.ts`](/src/scheduler/interval.scheduler/interval.scheduler.ts)):
```typescript
@Injectable()
export class IntervalScheduler implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly intervals: NodeJS.Timeout[] = [];

  constructor(
    private readonly discoverService: DiscoveryService,
    private readonly reflector: Reflector,
    private readonly metadataScanner: MetadataScanner,
  ) {}

  onApplicationBootstrap() {
    const providers = this.discoverService.getProviders();
    providers.forEach((provider) => {
      const { instance } = provider;
      const prototype = instance && Object.getPrototypeOf(instance);
      if (!prototype || !instance) return;

      const isIntervalHost = this.reflector.get(INTERVAL_HOST_KEY, instance.constructor) ?? false;
      if (!isIntervalHost) return;

      const methodKeys = this.metadataScanner.getAllMethodNames(prototype);
      methodKeys.forEach((methodKey) => {
        const interval = this.reflector.get(INTERVAL_KEY, instance[methodKey]);
        if (interval === undefined) return;

        const intervalRef = setInterval(() => instance[methodKey](), interval);
        this.intervals.push(intervalRef);
      });
    });
  }

  onApplicationShutdown() {
    this.intervals.forEach((intervalRef) => clearInterval(intervalRef));
  }
}
```

---

## Lesson: Worker Threads & Thread Pooling (Piscina)

Node.js runs on a single-threaded Event Loop, making it highly efficient for I/O operations (database, network), but vulnerable to **CPU-intensive operations** (complex calculations, PDF generation, image processing) that block the entire Event Loop for all incoming requests.

**Worker Threads** allow executing heavy CPU tasks on separate OS-level threads across multiple CPU cores without blocking NestJS.

---

### Approach 1: Native Node.js `worker_threads` + RxJS

Uses native `Worker` from `node:worker_threads` and coordinates messaging via RxJS `Observable` with request-response correlation IDs.

#### 1. Worker Script ([`src/fibonacci/fibonacci.worker.ts`](/src/fibonacci/fibonacci.worker.ts)):
```typescript
import { parentPort } from 'worker_threads';

function fib(n: number): number {
  if (n < 2) return n;
  return fib(n - 1) + fib(n - 2);
}

// Listen for tasks from the main thread
parentPort!.on('message', ({ n, id }: { n: number; id: string }) => {
  const result = fib(n);
  // Send calculation back with the correlation ID
  parentPort!.postMessage({ result, id });
});
```

#### 2. Worker Host Service ([`src/fibonacci/fibonacci-worker.host.ts`](/src/fibonacci/fibonacci-worker.host.ts)):
```typescript
@Injectable()
export class FibonacciWorkerHost
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private worker: Worker;
  private message$: Observable<{ id: string; result: number }>;

  onApplicationBootstrap() {
    this.worker = new Worker(join(import.meta.dirname, 'fibonacci.worker.js'));
    this.message$ = fromEvent(this.worker, 'message') as Observable<{
      id: string;
      result: number;
    }>;
  }

  async onApplicationShutdown() {
    await this.worker.terminate();
  }

  run(n: number): Promise<number> {
    const uniqueId = randomUUID();
    this.worker.postMessage({ n, id: uniqueId });

    return firstValueFrom(
      this.message$.pipe(
        filter(({ id }) => id === uniqueId), // Match response to request
        map(({ result }) => result),
      ),
    );
  }
}
```

> **Note on `message$` naming:**
> The `$` suffix follows **Finnish Notation**, an industry convention signifying that the variable holds an RxJS `Observable` stream rather than a plain static value.

---

### Approach 2: Thread Pool with `piscina` (Production Best Practice)

Creating a new thread on every request is expensive. **Piscina** provides a worker thread pool that manages idle/active threads automatically and resolves tasks via native Promises.

#### 1. Worker Function ([`src/fibonacci/fibonacci.worker.ts`](/src/fibonacci/fibonacci.worker.ts)):

```typescript
function fib(n: number): number {
  if (n < 2) return n;
  return fib(n - 1) + fib(n - 2);
}

export default (n: number) => fib(n);
```

#### 2. Controller using Piscina ([`src/fibonacci/fibonacci.controller.ts`](/src/fibonacci/fibonacci.controller.ts)):
```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { resolve } from 'path';
import { Piscina } from 'piscina'; // Named import in Piscina v4/v5

@Controller('fibonacci')
export class FibonacciController {
  fibonacciWorker = new Piscina({
    filename: resolve(import.meta.dirname, 'fibonacci.worker.js'),
  });

  @Get()
  fibonacci(@Query('n') n = 10) {
    return this.fibonacciWorker.run(+n);
  }
}
```

---

### Testing CPU-Bound Endpoints

- **Calculate Fibonacci without blocking the Event Loop:**
  ```powershell
  curl.exe -X GET -w "\nTime total: %{time_total}s\n" "localhost:3000/fibonacci/?n=41"
  ```
- While this calculation runs (~1.4s), background tasks like [`CronService`](/src/cron/cron.service.ts) continue executing every 2 seconds without stutter or delay.

---

### Architectural Decision Guide: When to Use What?

| Scenario | Recommended Approach | Why? |
| :--- | :--- | :--- |
| **Infrequent / One-off CPU task** (e.g. monthly ledger report, batch data migration) | **Native `new Worker()`** | Threads are spun up on-demand and destroyed with `worker.terminate()`, releasing OS memory immediately without keeping idle threads alive. |
| **High-throughput API with short CPU tasks** (e.g. image resizing, hashing, parsing JSON/XML) | **Thread Pool (`Piscina`)** | Reuses a fixed pool of worker threads matched to CPU core count. Eliminates the ~50ms and 30-50MB overhead of spawning a thread per request. |
| **Long-running background jobs** (minutes to hours: video encoding, massive web scraping) | **Job Queues (BullMQ / Redis)** | Heavy multi-minute jobs should NOT run inside the web server process at all. Dedicated queue workers isolate crashes, allow automatic retries, and distribute workloads across server clusters. |

---

## Lesson: Implementing the Circuit Breaker Pattern & Resilience Strategies

In distributed systems, remote service calls can fail due to network hiccups, high latency, or total downtime. When a remote supplier is unresponsive, callers sending repeated requests can exhaust critical resources (sockets, memory, worker threads), causing cascading failures across multiple systems (the **snowball effect**).

The **Circuit Breaker** acts like an electrical circuit breaker in a home: if faults exceed a safety threshold, it "trips" and immediately stops outgoing requests, returning a fast cached error instead of overwhelming the failing dependency.

---

### Circuit Breaker States:

```
  ┌─────────────────┐
  │  CLOSED (Normal)│ ◄────────── Successful operation (reset failureCount)
  └────────┬────────┘
           │ failures >= FAILURE_THRESHOLD (3)
           ▼
  ┌─────────────────┐
  │   OPEN (Tripped)│ ── Fast-fails all requests immediately without hitting handler
  └────────┬────────┘
           │ wait OPEN_TO_HALF_OPEN_WAIT_TIME (1 min)
           ▼
  ┌─────────────────┐
  │    HALF-OPEN    │ ─── failures > 0 ──────────────► Returns to OPEN
  └────────┬────────┘
           │ successes >= SUCCESS_THRESHOLD (3)
           ▼
       (Back to CLOSED)
```

---

### Implementation:

#### 1. Core State Machine ([`src/common/interceptors/circuit-breaker/circuit-breaker.ts`](/src/common/interceptors/circuit-breaker/circuit-breaker.ts)):
```typescript
export class CircuitBreaker {
  private state = CircuitBreakerState.Closed;
  private failureCount = 0;
  private successCount = 0;
  private lastError: Error;
  private nextAttempt: number;

  exec(next: CallHandler) {
    if (this.state === CircuitBreakerState.Open) {
      if (this.nextAttempt > Date.now()) {
        return throwError(() => this.lastError); // Fast-fail
      }
      this.state = CircuitBreakerState.HalfOpen;
    }
    return next.handle().pipe(
      tap({
        next: () => this.handleSuccess(),
        error: (err) => this.handleError(err),
      }),
    );
  }
  // ...
}
```

#### 2. Interceptor with Isolated State per Handler ([`src/common/interceptors/circuit-breaker/circuit-breaker.interceptor.ts`](/src/common/interceptors/circuit-breaker/circuit-breaker.interceptor.ts)):
Using `WeakMap<Function, CircuitBreaker>` ensures each route method maintains its own isolated circuit breaker state:
```typescript
@Injectable()
export class CircuitBreakerInterceptor implements NestInterceptor {
  private readonly circuitBreakerByHandler = new WeakMap<Function, CircuitBreaker>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const methodRef = context.getHandler();

    let circuitBreaker: CircuitBreaker;
    if (this.circuitBreakerByHandler.has(methodRef)) {
      circuitBreaker = this.circuitBreakerByHandler.get(methodRef)!;
    } else {
      circuitBreaker = new CircuitBreaker();
      this.circuitBreakerByHandler.set(methodRef, circuitBreaker);
    }
    return circuitBreaker.exec(next);
  }
}
```

#### 3. Global Registration via `APP_INTERCEPTOR` ([`src/app.module.ts`](/src/app.module.ts)):
Registered globally via DI token so all application endpoints are automatically protected and E2E tests inherit the interceptor seamlessly:
```typescript
@Module({
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: CircuitBreakerInterceptor,
    },
  ],
})
export class AppModule {}
```

---

### Testing Circuit Breaker

Simulating 50 rapid requests against a failing endpoint:
- **Windows PowerShell:**
  ```powershell
  1..50 | ForEach-Object { curl.exe -s -w "`n" "http://localhost:3000/coffees" }
  ```
- **Bash (Linux/macOS):**
  ```bash
  for i in `seq 1 50`; do curl -w "\n" "http://localhost:3000/coffees"; done
  ```

**Observed Result:**  
Only the first 3 requests execute `findAll()` (reaching `FAILURE_THRESHOLD = 3`). The remaining 47 requests are instantly rejected by the circuit breaker in `Open` state without invoking the controller method.

---

### Alternative Resilience Strategies

| Strategy | Description | Typical Use Case |
| :--- | :--- | :--- |
| **Retry Pattern with Exponential Backoff & Jitter** | Retries failed calls with exponentially increasing delays plus random noise (jitter) to prevent thundering herds. | Transient glitches (momentary network drops, DB connection resets). |
| **Fallback (Graceful Degradation)** | Returns a cached response, default placeholder, or read-only replica when primary service fails. | Read-heavy public features (recommendations, banners, exchange rates). |
| **Rate Limiting / Throttling** | Caps the maximum number of requests a client can make in a given timeframe (e.g. `@nestjs/throttler`). | Protecting endpoints from brute-force, scraping, or client-side retry floods. |
| **Bulkhead Pattern** | Partitions critical resources (thread pools, DB connection pools) into isolated compartments. | Ensuring a failure in an auxiliary feature (like PDF rendering) cannot exhaust DB connections needed for checkout. |
| **Strict Timeouts** | Aborts outgoing HTTP or DB operations that exceed a defined threshold (e.g. 2–5 seconds). | Preventing hanging sockets from exhausting Node.js memory. |

---

## Lesson: Building Configurable Modules (`ConfigurableModuleBuilder`)

Creating dynamic modules with `.register()` / `.registerAsync()` / `.forRoot()` / `.forRootAsync()` used to require 100+ lines of manual boilerplate (custom tokens, factory interfaces, async option types). The `ConfigurableModuleBuilder` generates all of this automatically.

---

### Module Definition ([`src/http-client/http-client.module-definition.ts`](/src/http-client/http-client.module-definition.ts)):

```typescript
import { ConfigurableModuleBuilder } from '@nestjs/common';

export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN: HTTP_MODULE_OPTIONS,
  OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<{ baseUrl?: string }>({ alwaysTransient: true })
  .setExtras<{ isGlobal?: boolean }>(
    { isGlobal: true },
    (definition, extras) => ({
      ...definition,
      global: extras.isGlobal,
    }),
  )
  .build();
```

**What the builder generates:**
- `ConfigurableModuleClass`: Base class with ready-made `register()` and `registerAsync()` static methods.
- `HTTP_MODULE_OPTIONS` (renamed from `MODULE_OPTIONS_TOKEN`): DI token to inject the passed options into any provider.
- `OPTIONS_TYPE` / `ASYNC_OPTIONS_TYPE`: TypeScript helper types for strict typing of sync/async options.

**Builder Configuration Options:**
- `.setClassMethodName('forRoot')`: Renames `register` → `forRoot` and `registerAsync` → `forRootAsync`.
- `.setExtras(...)`: Adds extra properties (like `isGlobal`) that are handled separately from the module options.
- `{ alwaysTransient: true }`: Each `register()` call creates an independent module instance (useful when different feature modules need different configurations).

---

### Module Class ([`src/http-client/http-client.module.ts`](/src/http-client/http-client.module.ts)):

```typescript
@Module({})
export class HttpClientModule extends ConfigurableModuleClass {
  constructor(@Inject(HTTP_MODULE_OPTIONS) private options: typeof OPTIONS_TYPE) {
    console.log(options);
    super();
  }

  // Override to add custom logic (validation, extra providers, logging)
  static register(options: typeof OPTIONS_TYPE): DynamicModule {
    return {
      ...super.register(options),
    };
  }

  static registerAsync(options: typeof ASYNC_OPTIONS_TYPE): DynamicModule {
    return {
      ...super.registerAsync(options),
    };
  }
}
```

---

### Usage in AppModule ([`src/app.module.ts`](/src/app.module.ts)):

```typescript
@Module({
  imports: [
    // Synchronous:
    HttpClientModule.register({ baseUrl: 'http://nestjs.com' }),
    // Asynchronous (from ConfigService / .env):
    // HttpClientModule.registerAsync({
    //   useFactory: () => ({ baseUrl: 'http://nestjs.com' }),
    // }),
  ],
})
export class AppModule {}
```

---

### Naming Conventions for Dynamic Module Methods

| Method | Where? | How many times? | Purpose |
| :--- | :--- | :--- | :--- |
| **`forRoot`** | Only in `AppModule` | **Once** per project | Global configuration (DB connection, core config) |
| **`forFeature`** | In feature modules | **Multiple** times | Registers feature-specific entities to the global root (repositories, queues) |
| **`register`** | In any module | **As needed** | Independent instance with its own configuration (HTTP client, JWT) |

---

## Lesson: Composition with Mixins

### Core Concepts

In TypeScript and JavaScript, a class can only inherit from a single parent class (`extends Base`). Multiple inheritance is not supported directly. The **Mixin Pattern** solves this limitation by relying on **composition of behaviors** instead of rigid inheritance hierarchies.

A **Mixin** is a higher-order function that takes a base class as an argument and returns a newly constructed, anonymous subclass extending that base with extra properties, methods, or metadata.

```text
Base Class  ──>  [ Mixin A ]  ──>  [ Mixin B ]  ──>  Enhanced Composed Class
```

---

### Use Case 1: Entity Behavior Composition (`WithUuid`)

When multiple entities or classes need identical behavioral slices (e.g., auto-generated UUIDs, timestamps, audit fields) without forcing them into an unnatural single inheritance tree.

#### Mixin Definition ([`src/common/mixins/with-uuid.mixin/with-uuid.mixin.ts`](/src/common/mixins/with-uuid.mixin/with-uuid.mixin.ts)):

```typescript
import { Type } from '@nestjs/common';
import { randomUUID } from 'crypto';

export function WithUuid<TBase extends Type>(Base: TBase) {
  return class extends Base {
    uuid = randomUUID();

    regenerateUuid() {
      this.uuid = randomUUID();
    }
  };
}
```

#### Applying to an Entity ([`src/coffees/entities/coffee.entity.ts`](/src/coffees/entities/coffee.entity.ts)):

```typescript
import { WithUuid } from '../../common/mixins/with-uuid.mixin/with-uuid.mixin.js';

export class Coffee {
  constructor(public name: string) {}
}

const CoffeeWithUuid = WithUuid(Coffee);
const coffee = new CoffeeWithUuid('Buddy Brew');
// coffee.name  --> 'Buddy Brew'
// coffee.uuid  --> 'c28a54d6-8b2d-...'
// coffee.regenerateUuid()
```

---

### Use Case 2: Dynamic NestJS Providers & Pipes (`EntityExistsPipe`)

In REST APIs (`PATCH /:id`, `DELETE /:id`, `GET /:id`), checking whether a record exists before executing controller logic is critical to prevent unhandled database errors or non-standard 500s.

Instead of writing repetitive pipes (`CoffeeExistsPipe`, `UserExistsPipe`, `OrderExistsPipe`), a mixin creates a **parameterized Pipe class** tailored to any given entity repository on demand.

#### Generic Pipe Factory ([`src/common/pipes/entity-exists/entity-exists.pipe.ts`](/src/common/pipes/entity-exists/entity-exists.pipe.ts)):

```typescript
import {
  ArgumentMetadata,
  Inject,
  Injectable,
  PipeTransform,
  Type,
} from '@nestjs/common';

export function EntityExistsPipe(entityCls: Type): Type<PipeTransform> {
  @Injectable()
  class EntityExistsPipeCls implements PipeTransform {
    constructor(
      @Inject(entityCls)
      private entityRepository: { exists(condition: unknown): Promise<void> },
    ) {}

    async transform(value: any, metadata: ArgumentMetadata) {
      // In a real ORM setup (e.g. TypeORM / MikroORM), throws NotFoundException if record does not exist
      await this.entityRepository.exists({ where: { id: value } });
      return value;
    }
  }

  return EntityExistsPipeCls;
}
```

#### Usage in Controllers ([`src/coffees/coffees.controller.ts`](/src/coffees/coffees.controller.ts)):

```typescript
@Patch(':id')
update(
  @Param('id', EntityExistsPipe(Coffee)) id: string,
  @Body() updateCoffeeDto: UpdateCoffeeDto,
) {
  return this.coffeesService.update(+id, updateCoffeeDto);
}
```

> **How NestJS DI resolves it:**
> 1. `EntityExistsPipe(Coffee)` executes at route definition time and returns the newly minted `EntityExistsPipeCls` class constructor.
> 2. NestJS instantiates the pipe through its IoC container, resolving the dependency injected via `@Inject(Coffee)`.
> 3. During request execution, `transform()` runs **before** the controller handler. If the entity doesn't exist, an exception halts the execution pipeline immediately.

---

### Comparison: Inheritance vs. Mixins

| Feature | Single Inheritance (`extends`) | Mixins (Higher-Order Functions) |
| :--- | :--- | :--- |
| **Hierarchy** | Strict "is-a" relationship (e.g., `Dog is an Animal`) | Flexible "can-do / has-a" traits (e.g., `Class with Uuid`) |
| **Composition Limit** | Limited to 1 parent class | Unlimited combinations (`MixinC(MixinB(MixinA(Base)))`) |
| **Coupling** | High tight-coupling to parent modifications | Modular, isolated, plug-and-play behavior |
| **DI Integration** | Difficult to parameterize constructors dynamically | Can dynamically decorate classes with `@Injectable()` and custom `@Inject()` tokens |
