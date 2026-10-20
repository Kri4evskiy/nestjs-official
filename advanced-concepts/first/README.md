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

- **Native PowerShell command (`Invoke-RestMethod`):**
  ```powershell
  Invoke-RestMethod -Uri http://localhost:3000/coffees -Method Post -ContentType "application/json" -Body "{}"
  ```
