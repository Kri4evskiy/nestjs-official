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
