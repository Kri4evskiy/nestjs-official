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

### In Real World: Production Circuit Breakers (`opossum`)

While building a custom state machine in an Interceptor is great for understanding the mechanics under the hood, writing and maintaining your own distributed circuit breaker in production can be error-prone (handling sliding error percentage windows, volume thresholds, Prometheus metrics, and distributed fallbacks).

In real-world enterprise Node.js & NestJS applications, the standard, battle-tested third-party library is **[`opossum`](https://www.npmjs.com/package/opossum)** (originally created by Red Hat):


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

---

## Lesson: Custom Schematics & AST Transformations

### Overview

**Schematics** are template-based, platform-independent code generators originally built by the Angular team and adopted by NestJS CLI (`@nestjs/schematics`). Rather than operating directly on the physical filesystem with destructive writes, Schematics operate on a **Virtual Staging Tree** in memory:
1. Validations, merges, and transformations are staged.
2. Supports non-destructive previews via `--dry-run`.
3. Changes commit to disk atomically only if all steps succeed.

In this lesson, we constructed a custom schematic named `configurable-module` that:
- Executes the official `@nestjs/schematics:module` generator to scaffold a module and register it in `app.module.ts`.
- Copies and interpolates template files (`*.module-definition.ts`).
- Uses **TypeScript Compiler AST (Abstract Syntax Tree)** APIs to automatically modify the generated module class to `extends ConfigurableModuleClass` and insert the required import statement.

---

### Project Setup & Configuration

1. In the root `tsconfig.build.json`, exclude the schematics workspace so the application build doesn't attempt to compile schematic assets:
   ```json
   "exclude": ["node_modules", "test", "dist", "**/*spec.ts", "schematics"]
   ```

2. Collection Definition ([`schematics/src/collection.json`](/schematics/src/collection.json)):
   ```json
   {
     "$schema": "../node_modules/@angular-devkit/schematics/collection-schema.json",
     "schematics": {
       "configurable-module": {
         "description": "Generates a configurable module.",
         "factory": "./configurable-module/index#generate",
         "schema": "./configurable-module/schema.json"
       }
     }
   }
   ```

3. CLI Schema Options ([`schematics/src/configurable-module/schema.json`](/schematics/src/configurable-module/schema.json)):
   ```json
   {
     "$schema": "http://json-schema.org/schema",
     "$id": "configurable-module",
     "type": "object",
     "properties": {
       "name": {
         "type": "string",
         "description": "The name of the module.",
         "$default": {
           "$source": "argv",
           "index": 0
         },
         "x-prompt": "What name would you like to use for the module?"
       }
     },
     "required": ["name"]
   }
   ```

4. File Template ([`schematics/src/configurable-module/files/__name@dasherize__/__name@dasherize__.module-definition.ts`](/schematics/src/configurable-module/files/__name@dasherize__/__name@dasherize__.module-definition.ts)):
   ```typescript
   import { ConfigurableModuleBuilder } from '@nestjs/common';

   export const { ConfigurableModuleClass } =
     new ConfigurableModuleBuilder().build();
   ```

---

### Implementation with AST Manipulation ([`schematics/src/configurable-module/index.ts`](/schematics/src/configurable-module/index.ts)):

```typescript
import { dasherize } from '@angular-devkit/core/src/utils/strings';
import {
  apply,
  chain,
  externalSchematic,
  mergeWith,
  move,
  Rule,
  SchematicContext,
  strings,
  template,
  Tree,
  url,
} from '@angular-devkit/schematics';
import * as ts from 'typescript';
import { findNodes, insertImport } from '@schematics/angular/utility/ast-utils';
import { InsertChange } from '@schematics/angular/utility/change';

interface ConfigurableModuleSchematicOptions {
  name: string;
}

function updateModuleFile(
  tree: Tree,
  options: ConfigurableModuleSchematicOptions,
): Tree {
  const name = dasherize(options.name);
  const moduleFilePath = `src/${name}/${name}.module.ts`;
  const moduleFileContent = tree.readText(moduleFilePath);

  // 1. Parse existing module file into TypeScript AST
  const source = ts.createSourceFile(
    moduleFilePath,
    moduleFileContent,
    ts.ScriptTarget.Latest,
    true,
  );

  const updateRecorder = tree.beginUpdate(moduleFilePath);

  // 2. Insert import statement via AST helper
  const insertImportChange = insertImport(
    source,
    moduleFilePath,
    'ConfigurableModuleClass',
    `./${name}.module-definition.js`,
  );
  if (insertImportChange instanceof InsertChange) {
    updateRecorder.insertRight(
      insertImportChange.pos,
      insertImportChange.toAdd,
    );
  }

  // 3. Find ClassDeclaration node and inject "extends ConfigurableModuleClass"
  const classNode = findNodes(source, ts.SyntaxKind.ClassDeclaration)[0];
  updateRecorder.insertRight(
    classNode.end - 2,
    'extends ConfigurableModuleClass ',
  );

  tree.commitUpdate(updateRecorder);
  return tree;
}

export function generate(options: ConfigurableModuleSchematicOptions): Rule {
  return (_tree: Tree, _context: SchematicContext) => {
    const templateSource = apply(url('./files'), [
      template({ ...options, ...strings }),
      move('src'),
    ]);

    return chain([
      // A. Delegate initial module scaffolding to official NestJS schematic
      externalSchematic('@nestjs/schematics', 'module', {
        name: options.name,
      }),
      // B. Merge our template (*.module-definition.ts)
      mergeWith(templateSource),
      // C. Perform AST modification on the newly created module file
      (tree) => updateModuleFile(tree, options),
    ]);
  };
}
```

---

### Build & Execution Commands

#### 1. Compile Schematics (TypeScript to JavaScript)
Schematics execute in Node.js runtime and **must be built** before execution:
```powershell
# From the /schematics subdirectory:
npm run build
# OR watch mode during development:
npm run build -- --watch
```

#### 2. Dry-Run Preview (Testing without disk changes)
```powershell
# Run from project root:
npx @angular-devkit/schematics-cli ./schematics:configurable-module recipes --dry-run
```

#### 3. Real Execution (Writing files to disk)

> [!NOTE]
> When executing local schematic collections specified with relative paths (`./schematics`), `@angular-devkit/schematics-cli` enables `debug` and `dry-run` modes by default. To persist changes to disk, explicitly disable both:

```powershell
# Directly using Schematics CLI:
npx @angular-devkit/schematics-cli ./schematics:configurable-module recipes --no-debug --no-dry-run

# Or linking locally to run seamlessly via Nest CLI:
cd schematics && npm link && cd ..
npm link schematics
nest g schematics:configurable-module recipes
```

---

## Lesson: Dependency Injection (DI) Sub-trees & Context Isolation

### Overview & The "Scope Infection" Problem

By default, providers in NestJS are **Singletons** (`Scope.DEFAULT`): instantiated once at boot and shared across the entire application.

When providers require per-request data (such as tenant IDs, request URLs, auth tokens), we often mark them as `Scope.REQUEST`. However, **Request Scope bubbles up the dependency tree**:
- If Service B is `Scope.REQUEST`, any Service A that injects B automatically becomes `Scope.REQUEST`.
- Any Controller injecting Service A also becomes `Scope.REQUEST`.
- Under high throughput (e.g., thousands of RPS), reconstructing full dependency chains on every incoming HTTP call introduces substantial garbage-collection and memory pressure.

**DI Sub-trees** allow applications to isolate request-scoped state into targeted, transient sub-graphs while keeping upstream controllers, services, and event listeners as lightweight **Singletons**.

```mermaid
graph TD
  subgraph Singleton Realm
    Ctrl[PaymentsWebhookController]
    Notif[NotificationsService]
    Sub[SubscriptionsService]
  end

  subgraph DI Sub-tree (ContextId: #42)
    ReqData[(Registered Request Object)]
    Ctx[EventContext - Scope.REQUEST]
  end

  Ctrl -- "1. ContextIdFactory.create()" --> ContextID[ContextId #42]
  Ctrl -- "2. registerRequestByContextId(req, #42)" --> ReqData
  Ctrl -- "3. emit(event, meta: { contextId: #42 })" --> Bus[EventEmitter2]

  Bus --> Notif
  Bus --> Sub

  Notif -- "moduleRef.resolve(EventContext, #42)" --> Ctx
  Sub -- "moduleRef.resolve(EventContext, #42)" --> Ctx
  ReqData -. "Injected via @Inject(REQUEST)" .-> Ctx
```

---

### Key Primitives

1. **`ContextId`**: A unique token representing an isolated dependency sub-tree instance.
2. **`ContextIdFactory.create()`**: Generates a new unique `ContextId` on demand (even outside standard HTTP cycles, e.g., in queues or events).
3. **`moduleRef.registerRequestByContextId(request, contextId)`**: Associates a mock, custom payload or real HTTP `request` object with the given `ContextId` under the `@Inject(REQUEST)` DI token.
4. **`moduleRef.resolve(TargetProvider, contextId)`**:
   - Asynchronously creates or retrieves the instance of `TargetProvider` bound to that specific `ContextId`.
   - If called multiple times with the **same** `ContextId`, it returns the **exact same instance** (cached per sub-tree).
   - If called without a `contextId`, it generates a completely detached, disposable instance.

---

### Implementation Example: Event-Driven Payment Webhooks

#### 1. Request-Scoped Context ([`src/payments/context/event-context.ts`](/src/payments/context/event-context.ts)):

```typescript
import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class EventContext {
  constructor(@Inject(REQUEST) public readonly request: Request) {}
}
```

#### 2. Event Payload Carrying Context ([`src/payments/events/payment-failed.event.ts`](/src/payments/events/payment-failed.event.ts)):

```typescript
import { ContextId } from '@nestjs/core';

export class PaymentFailedEvent {
  static readonly key = 'PAYMENT_FAILED';

  constructor(
    public readonly paymentId: number,
    public readonly meta: { contextId: ContextId },
  ) {}
}
```

#### 3. Controller Spawning Sub-tree ([`src/payments/payments-webhook.controller.ts`](/src/payments/payments-webhook.controller.ts)):

```typescript
@Controller('payments-webhook')
export class PaymentsWebhookController {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly moduleRef: ModuleRef,
  ) {}

  @Get()
  webhook(@Req() request: Request) {
    const contextId = ContextIdFactory.create();
    const paymentId = Math.floor(Math.random() * 1000);

    // Bind current request to the generated contextId
    this.moduleRef.registerRequestByContextId(request, contextId);

    // Broadcast event with contextId attached
    this.eventEmitter.emit(
      PaymentFailedEvent.key,
      new PaymentFailedEvent(paymentId, { contextId }),
    );
  }
}
```

#### 4. Decoupled Listeners Sharing the Sub-tree:

**[`src/payments/notifications.service.ts`](/src/payments/notifications.service.ts)**:
```typescript
@Injectable()
export class NotificationsService {
  constructor(private readonly moduleRef: ModuleRef) {}

  @OnEvent(PaymentFailedEvent.key)
  async sendPaymentNotification(event: PaymentFailedEvent) {
    const eventContext = await this.moduleRef.resolve(
      EventContext,
      event.meta.contextId, // Resolves or reuses shared instance
    );

    console.log('Sending a payment notification', eventContext.request.url);
  }
}
```

**[`src/payments/subscriptions.service.ts`](/src/payments/subscriptions.service.ts)**:
```typescript
@Injectable()
export class SubscriptionsService {
  constructor(private readonly moduleRef: ModuleRef) {}

  @OnEvent(PaymentFailedEvent.key)
  async cancelSubscription(event: PaymentFailedEvent) {
    const eventContext = await this.moduleRef.resolve(
      EventContext,
      event.meta.contextId, // Shared instance identical to NotificationsService!
    );

    console.log('Cancelling subscription', eventContext.request.url);
  }
}
```

---

### Real-World Context Enrichment (Signatures & Multi-Provider Webhooks)

In production setups (e.g., handling Stripe, PayPal, or multiple webhook sources simultaneously), the `EventContext` wrapper serves as a strongly-typed adapter exposing convenient getters instead of forcing listeners to inspect raw `request.headers`:

```typescript
@Injectable({ scope: Scope.REQUEST })
export class EventContext {
  constructor(@Inject(REQUEST) public readonly request: Request) {}

  // Automatically detects webhook origin based on provider headers
  get provider(): 'stripe' | 'paypal' | 'unknown' {
    if (this.request.headers['stripe-signature']) return 'stripe';
    if (this.request.headers['paypal-transmission-sig']) return 'paypal';
    return 'unknown';
  }

  // Unified signature extractor for security/HMAC verification
  get signature(): string | undefined {
    return (this.request.headers['stripe-signature'] ||
      this.request.headers['paypal-transmission-sig']) as string | undefined;
  }

  get clientIp(): string {
    return (this.request.headers['x-forwarded-for'] as string) || this.request.ip || '';
  }
}
```

#### Consumer Usage in Singleton Services:

```typescript
@Injectable()
export class NotificationsService {
  constructor(private readonly moduleRef: ModuleRef) {}

  @OnEvent(PaymentFailedEvent.key)
  async sendPaymentNotification(event: PaymentFailedEvent) {
    const ctx = await this.moduleRef.resolve(EventContext, event.meta.contextId);

    console.log(`Payment failed via: ${ctx.provider}`);
    console.log(`Verified signature: ${ctx.signature}`);
    console.log(`Client IP: ${ctx.clientIp}`);
  }
}
```

#### Production Webhook Controller (POST & Fast Acknowledge):

```typescript
@Controller('payments-webhook')
export class PaymentsWebhookController {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly moduleRef: ModuleRef,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Req() request: Request, @Body() body: any) {
    const contextId = ContextIdFactory.create();
    this.moduleRef.registerRequestByContextId(request, contextId);

    // Broadcast decoupled event to all handlers via Sub-tree
    this.eventEmitter.emit(
      PaymentFailedEvent.key,
      new PaymentFailedEvent(body.paymentId, { contextId }),
    );

    // Fast 200 acknowledge to prevent webhook retries by Stripe/PayPal
    return { received: true };
  }
}
```

---

## Lesson: Durable Providers in-depth

### Core Concepts & The Scaling Problem

In standard request-scoped setups (`Scope.REQUEST`), NestJS reconstructs the entire dependency sub-tree on **every single incoming HTTP request**.

In SaaS Multi-Tenant architectures or high-throughput localized portals:
- Tens of thousands of requests may arrive from the **same tenant** (e.g., `Company A`) within seconds.
- Recreating tenant-specific database connection pools, repositories, or translators on each individual request causes extreme CPU spikes and Garbage Collection thrashing.

**Durable Providers** solve this by combining the isolation of `Scope.REQUEST` with the persistence of `Scope.DEFAULT`:
- Configured via `@Injectable({ scope: Scope.REQUEST, durable: true })`.
- Instructs NestJS to **cache and reuse** the instantiated sub-tree across requests as long as they share the same tenant/context identifier.

```text
Request 1 (Tenant A) ───┐
Request 2 (Tenant A) ───┼──> [ Tenant A Durable Sub-tree ] (Instantiated ONCE)
Request 3 (Tenant A) ───┘

Request 4 (Tenant B) ──────> [ Tenant B Durable Sub-tree ] (Instantiated ONCE)
```

---

### Part 1: Multi-Tenancy with Custom ContextIdStrategy

#### 1. Durable Provider Definition ([`src/data-source/data-source.service.ts`](/src/data-source/data-source.service.ts)):

```typescript
import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';

@Injectable({ scope: Scope.REQUEST, durable: true })
export class DataSourceService {
  constructor(@Inject(REQUEST) private request: unknown) {}
}
```

#### 2. Dependent Service Demonstrating Lifecycle ([`src/users/users.service.ts`](/src/users/users.service.ts)):

```typescript
@Injectable()
export class UsersService {
  constructor(private readonly dataSourceService: DataSourceService) {
    // Logged only when a new instance is constructed for a tenant
    console.log(this);
  }
}
```

#### 3. Custom Context ID Strategy ([`src/core/aggregate-by-tenant.strategy.ts`](/src/core/aggregate-by-tenant.strategy.ts)):

Implements `ContextIdStrategy` to route requests to tenant-specific sub-trees using an in-memory TTL map:

```typescript
import {
  ContextId,
  ContextIdFactory,
  ContextIdResolver,
  ContextIdResolverFn,
  ContextIdStrategy,
  HostComponentInfo,
} from '@nestjs/core';
import { Request } from 'express';

export class AggregateByTenantContextIdStrategy implements ContextIdStrategy {
  private readonly tenants = new Map<string, ContextId>();

  attach(
    contextId: ContextId,
    request: Request,
  ): ContextIdResolverFn | ContextIdResolver {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return () => contextId; // Fallback to standard request context
    }

    let tenantSubTreeId: ContextId;
    if (this.tenants.has(tenantId)) {
      // Reuse existing tenant sub-tree
      tenantSubTreeId = this.tenants.get(tenantId) as ContextId;
    } else {
      // First visit: create sub-tree and set a 3-second cache TTL
      tenantSubTreeId = ContextIdFactory.create();
      this.tenants.set(tenantId, tenantSubTreeId);
      setTimeout(() => this.tenants.delete(tenantId), 3000);
    }

    return {
      payload: { tenantId },
      resolve: (info: HostComponentInfo) =>
        info.isTreeDurable ? tenantSubTreeId : contextId,
    };
  }
}
```

#### 4. Global Strategy Registration ([`src/main.ts`](/src/main.ts)):

Must be registered before application bootstrap so the strategy intercepts all inbound contexts from the very first request:

```typescript
import { ContextIdFactory, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { AggregateByTenantContextIdStrategy } from './core/aggregate-by-tenant.strategy.js';

// Apply strategy globally before bootstrap
ContextIdFactory.apply(new AggregateByTenantContextIdStrategy());

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
```

---

### Verifying Durable Provider Behavior

- **Consecutive requests within TTL (Same Tenant):**
  ```powershell
  curl.exe -H "x-tenant-id: 1" localhost:3000/users
  curl.exe -H "x-tenant-id: 1" localhost:3000/users
  curl.exe -H "x-tenant-id: 1" localhost:3000/users
  ```
  `console.log(this)` prints **only once**, proving the instance was cached and reused.

- **Request for a Different Tenant:**
  ```powershell
  curl.exe -H "x-tenant-id: 2" localhost:3000/users
  ```
  `console.log(this)` prints again, creating a dedicated sub-tree for Tenant 2.

- **Request after TTL (after 3000ms):**
  The entry is pruned from the map, triggering fresh instantiation on subsequent requests.

---

### Part 2: Internationalization (i18n) & Type-Safe Locales

Parsing localization JSON translation dictionaries on every single request is CPU-intensive. By combining `durable: true` with locale-based context aggregation, translation files are cached in memory **per language sub-tree** (`en`, `ua`), while maintaining strict TypeScript type-safety for nested keys.

#### 1. Configuration for JSON Modules

- In [`tsconfig.json`](/tsconfig.json):
  ```json
  "compilerOptions": {
    "resolveJsonModule": true
  }
  ```

#### 2. Type-Safe I18n Service ([`src/i18n/i18n.service.ts`](/src/i18n/i18n.service.ts)):

Uses recursive conditional types (`Join<PathsToStringProps<Schema>>`) to validate dot-notated paths (e.g., `'ERRORS.USER_NOT_FOUND'`) against the JSON structure at compile time:

```typescript
import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import format from 'string-format';
import en from '../assets/locales/en.json' with { type: 'json' };
import ua from '../assets/locales/ua.json' with { type: 'json' };

type Schema = typeof en;

type PathsToStringProps<T> = T extends string
  ? []
  : {
      [K in Extract<keyof T, string>]: [K, ...PathsToStringProps<T[K]>];
    }[Extract<keyof T, string>];

type Join<T extends string[]> = T extends []
  ? never
  : T extends [infer F]
    ? F
    : T extends [infer F, ...infer R]
      ? F extends string
        ? `${F}.${Join<Extract<R, string[]>>}`
        : never
      : string;

@Injectable({ scope: Scope.REQUEST, durable: true })
export class I18nService {
  public static readonly defaultLanguage = 'en';
  public static readonly supportedLanguages = ['en', 'ua'];
  private readonly locales: Record<string, Schema> = { en, ua };

  constructor(
    @Inject(REQUEST) private readonly payload: { localeCode: string },
  ) {}

  translate(
    key: Join<PathsToStringProps<Schema>>,
    ...args: Array<string | Record<string, unknown>>
  ): string {
    const locale =
      this.locales[this.payload.localeCode ?? I18nService.defaultLanguage];

    // Traverses nested object path e.g. "ERRORS.USER_NOT_FOUND"
    const text: string = key
      .split('.')
      .reduce((o: any, i) => o?.[i], locale) as unknown as string;

    return format(text, ...args);
  }
}
```

#### 3. Locale Context Strategy ([`src/core/aggregate-by-locale.strategy.ts`](/src/core/aggregate-by-locale.strategy.ts)):

Uses `accept-language-parser` to parse client preference and route to cached locale sub-trees:

```typescript
import {
  ContextId,
  ContextIdFactory,
  ContextIdResolver,
  ContextIdResolverFn,
  ContextIdStrategy,
  HostComponentInfo,
} from '@nestjs/core';
import { pick } from 'accept-language-parser';
import { Request } from 'express';
import { I18nService } from '../i18n/i18n.service.js';

export class AggregateByLocaleContextIdStrategy implements ContextIdStrategy {
  private readonly locales = new Map<string, ContextId>();

  attach(
    contextId: ContextId,
    request: Request,
  ): ContextIdResolverFn | ContextIdResolver {
    const localeCode =
      pick(
        I18nService.supportedLanguages,
        request.headers['accept-language'] ?? I18nService.defaultLanguage,
      ) ?? I18nService.defaultLanguage;

    let localeSubTreeId: ContextId;
    if (this.locales.has(localeCode)) {
      localeSubTreeId = this.locales.get(localeCode) as ContextId;
    } else {
      localeSubTreeId = ContextIdFactory.create();
      this.locales.set(localeCode, localeSubTreeId);
      setTimeout(() => this.locales.delete(localeCode), 3000);
    }

    return {
      payload: { localeCode },
      resolve: (info: HostComponentInfo) =>
        info.isTreeDurable ? localeSubTreeId : contextId,
    };
  }
}
```

#### 4. Usage in Consumer Service ([`src/app.service.ts`](/src/app.service.ts)):

```typescript
@Injectable()
export class AppService {
  constructor(private readonly i18nService: I18nService) {}

  getHello(): string {
    return this.i18nService.translate('ERRORS.USER_NOT_FOUND', {
      firstName: 'Kamil',
    });
  }
}
```

#### 5. Verification Commands:

- **Default English Translation:**
  ```powershell
  curl.exe localhost:3000
  # Output: User Kamil does not exist
  ```

- **Ukrainian Translation via Accept-Language Header:**
  ```powershell
  curl.exe -H "accept-language: ua" localhost:3000
  # Output: Користувач Kamil не знайдений
  ```

---

> [!TIP]
> **Production Best Practice Note:**
> In production enterprise applications, writing a custom i18n engine from scratch is rarely necessary. The standard, battle-tested community library is **[`nestjs-i18n`](https://github.com/toonvanstrijp/nestjs-i18n)**.
> It implements the exact same sub-tree isolation under the hood, but provides out-of-the-box support for:
> - Multiple language resolvers (Headers, Query parameters `?lang=ua`, Cookies, or JWT claims).
> - Automatic CLI-based type generation (`i18n-generated.ts`).
> - Complex pluralization rules across different language families.
> - Seamless integration with `class-validator` for automated DTO validation message translation.
