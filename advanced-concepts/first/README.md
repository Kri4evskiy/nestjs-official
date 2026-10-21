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
