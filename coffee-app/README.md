# ☕ Coffee App — NestJS Fundamentals (Official Course Labs)

<p align="center">
  <a href="https://nestjs.com/" target="_blank">
    <img src="https://nestjs.com/img/logo-small.svg" width="100" alt="Nest Logo" />
  </a>
</p>

<p align="center">
  A production-ready RESTful API implementing the complete curriculum of the official <b><a href="https://courses.nestjs.com/">NestJS Fundamentals Course</a></b> by Kamil Myśliwiec & Mark Pieszak.
</p>

---

## 📌 Project Overview

This repository subproject contains the complete, battle-tested implementation of the **NestJS Fundamentals** course. It demonstrates foundational and intermediate architectural concepts of NestJS, built around an enterprise-style domain model: managing a coffee catalog (`coffees`), coffee flavors (`flavors`), transactional coffee recommendation events (`events`), and cross-module rating services (`coffee-rating`).

---

## 🚀 Getting Started & Execution

### 1. Prerequisites
- **Node.js**: v20+ LTS
- **Docker & Docker Compose**: Installed and running
- **npm** or **pnpm**

---

### 2. Environment Configuration

Create or inspect the `.env` file in `coffee-app/`:

```env
DATABASE_USER=postgres
DATABASE_PASSWORD=pass123
DATABASE_NAME=postgres
DATABASE_PORT=5432
DATABASE_HOST=localhost

API_KEY=true
```

> 🔐 **Security Note:** The `API_KEY` is validated by `ApiKeyGuard` for protected endpoints. Endpoints decorated with `@Public()` can be accessed without providing the API key header.

---

### 3. Installation & Database Setup

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL container in the background
docker compose up -d

# 3. Run TypeORM database migrations
npm run migration:run
```

---

### 4. Running the Application

```bash
# Start in watch/development mode
npm run start:dev

# Start in debug mode
npm run start:debug

# Build and run production bundle
npm run build
npm run start:prod
```

Once started:
- 🌐 **REST API Base URL:** `http://localhost:3000`
- 📑 **Swagger / OpenAPI Documentation:** `http://localhost:3000/api`

---

### 5. Running Tests

#### Unit Tests
Unit tests use **Jest** and mock out database repositories via `getRepositoryToken()`:

```bash
# Run unit tests
npm test

# Run unit tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:cov
```

#### Automated End-to-End (E2E) Tests
The E2E test suite automatically provisions an isolated PostgreSQL container (`test-db`) on port `5433` via Docker Compose profiles, runs the test suite, and tears the container down afterward:

```bash
# Executes pretest:e2e -> test:e2e -> posttest:e2e
npm run test:e2e
```

---

## 📚 Course Curriculum & Codebase Mapping

Below is the complete lesson breakdown and architectural map correlating the official course syllabus with the codebase files:

### 1. Architectural Building Blocks & Inversion of Control (IoC)
- **Controllers & Routing:** Handling REST verbs (`@Get`, `@Post`, `@Patch`, `@Delete`), route parameters (`@Param`), request bodies (`@Body`), and query strings (`@Query`).
  - 📁 [`src/modules/coffees/coffees.controller.ts`](./src/modules/coffees/coffees.controller.ts)
- **Services & Dependency Injection:** Encapsulating business logic and injecting providers into controllers.
  - 📁 [`src/modules/coffees/coffees.service.ts`](./src/modules/coffees/coffees.service.ts)
- **Modules & Encapsulation:** Encapsulating features and exporting providers across module boundaries.
  - 📁 [`src/modules/coffees/coffees.module.ts`](./src/modules/coffees/coffees.module.ts)
  - 📁 [`src/modules/events/events.module.ts`](./src/modules/events/events.module.ts)
  - 📁 [`src/modules/coffee-rating/coffee-rating.module.ts`](./src/modules/coffee-rating/coffee-rating.module.ts)

---

### 2. Advanced Dependency Injection & Providers
- **Custom Providers:**
  - Value-based providers (`useValue` for constants and mock objects).
  - Class-based providers (`useClass` for conditional strategy resolution).
  - Factory providers (`useFactory` with `inject` for asynchronous initialization and dynamic instantiation).
  - 📁 [`src/modules/coffees/coffees.module.ts`](./src/modules/coffees/coffees.module.ts)
- **Non-Class Provider Tokens:** Injecting configuration values and tokens using `@Inject('COFFEE_BRANDS')`.
- **Provider Scopes:** Exploring `Scope.DEFAULT` (singleton), `Scope.REQUEST` (per-request instance), and `Scope.TRANSIENT` (unique instance per consumer).

---

### 3. Database Persistence & TypeORM
- **Relational Entity Mapping:**
  - `@Entity()`, `@PrimaryGeneratedColumn()`, `@Column()`.
  - Many-to-Many relationships: `Coffee` ↔ `Flavor` with `@JoinTable()` and cascade updates.
  - 📁 [`src/modules/coffees/entities/coffee.entity.ts`](./src/modules/coffees/entities/coffee.entity.ts)
  - 📁 [`src/modules/coffees/entities/flavor.entity.ts`](./src/modules/coffees/entities/flavor.entity.ts)
  - 📁 [`src/modules/events/entities/event.entity.ts`](./src/modules/events/entities/event.entity.ts)
- **Database Transactions & Atomicity:**
  - Handling multi-entity operations (e.g. coffee recommendation events) safely using TypeORM `QueryRunner` (`startTransaction`, `commitTransaction`, `rollbackTransaction`).
  - 📁 [`src/modules/coffees/coffees.service.ts`](./src/modules/coffees/coffees.service.ts)
- **Migrations & CLI:**
  - Managing schema evolutions without `synchronize: true` in production environments.
  - CLI script: `typeorm-cli.config.ts`.
  - Migration script: 📁 [`src/migrations/1791806872090-InitialMigration.ts`](./src/migrations/1791806872090-InitialMigration.ts).
  - Commands: `npm run migration:generate`, `npm run migration:run`, `npm run migration:revert`.

---

### 4. Validation, Transformation & DTOs
- **Global Validation Pipe:**
  - Rejecting unknown fields with `whitelist: true` and `forbidNonWhitelisted: true`.
  - Automatic type coercion with `transform: true` and `transformOptions.enableImplicitConversion: true`.
  - 📁 [`src/main.ts`](./src/main.ts)
- **DTOs & Type Inheritance:**
  - Request contracts validated with `class-validator` and `class-transformer`.
  - Reusing schemas and generating partial types via `@nestjs/mapped-types` (`PartialType(CreateCoffeeDto)`).
  - 📁 [`src/modules/coffees/dto/create-coffee.dto/create-coffee.dto.ts`](./src/modules/coffees/dto/create-coffee.dto/create-coffee.dto.ts)
  - 📁 [`src/modules/coffees/dto/update-coffee.dto/update-coffee.dto.ts`](./src/modules/coffees/dto/update-coffee.dto/update-coffee.dto.ts)
  - 📁 [`src/common/dto/pagination-query.dto/pagination-query.dto.ts`](./src/common/dto/pagination-query.dto/pagination-query.dto.ts)

---

### 5. Configuration & Environment Variables
- **ConfigModule & Schema Validation:**
  - Type-safe environment validation at startup using **Joi** schema validation.
  - 📁 [`src/app.module.ts`](./src/app.module.ts)
- **Namespaced & Typed Configs:**
  - Modular configuration using `registerAs` and strongly-typed injection via `ConfigType`.
  - 📁 [`src/config/app.config.ts`](./src/config/app.config.ts)
  - 📁 [`src/modules/coffees/config/coffees.config.ts`](./src/modules/coffees/config/coffees.config.ts)

---

### 6. Request-Response Lifecycle & Building Blocks
NestJS processes requests through an established lifecycle pipeline. This project implements every key lifecycle hook:

```text
Incoming Request ──> Middleware ──> Guards ──> Interceptors (pre) ──> Pipes ──> Controller / Service
                                                                                       │
Outgoing Response <── Exception Filter <── Interceptors (post) <───────────────────────┘
```

1. **Middleware:**
   - Intercepts raw HTTP requests and logs execution time and request paths.
   - 📁 [`src/common/middleware/logging/logging.middleware.ts`](./src/common/middleware/logging/logging.middleware.ts)
2. **Guards:**
   - Protects routes by validating custom headers (`API_KEY`) using `CanActivate`.
   - Bypassed on public endpoints using custom reflection metadata (`@Public()`).
   - 📁 [`src/common/guards/api-key/api-key.guard.ts`](./src/common/guards/api-key/api-key.guard.ts)
   - 📁 [`src/common/decorators/public.decorator.ts`](./src/common/decorators/public.decorator.ts)
3. **Interceptors:**
   - Response standardization: transforms outgoing payloads into `{ data: ... }` via RxJS `map`.
     - 📁 [`src/common/interceptors/wrap-response/wrap-response.interceptor.ts`](./src/common/interceptors/wrap-response/wrap-response.interceptor.ts)
   - Timeout interceptor: cancels slow requests exceeding 3000ms using RxJS `timeout` and throws `RequestTimeoutException`.
     - 📁 [`src/common/interceptors/timeout/timeout.interceptor.ts`](./src/common/interceptors/timeout/timeout.interceptor.ts)
4. **Pipes:**
   - Parameter transformation: custom pipe parsing string IDs into numbers with `BadRequestException` on failure.
   - 📁 [`src/common/pipes/parse-int/parse-int.pipe.ts`](./src/common/pipes/parse-int/parse-int.pipe.ts)
5. **Exception Filters:**
   - Catches unhandled HTTP exceptions and formats uniform JSON error responses with timestamps and paths.
   - 📁 [`src/common/filters/http-exception/http-exception.filter.ts`](./src/common/filters/http-exception/http-exception.filter.ts)
6. **Custom Param Decorators:**
   - Extracts URL protocol details (`http` vs `https`) directly into route handler signatures.
   - 📁 [`src/common/decorators/protocol.decorator.ts`](./src/common/decorators/protocol.decorator.ts)

---

### 7. OpenAPI / Swagger Documentation
- Automated Swagger documentation generated using `@nestjs/swagger` and `@nestjs/swagger/plugin`.
- Configured in [`src/main.ts`](./src/main.ts) and decorated with `@ApiTags()`, `@ApiResponse()`, and `@ApiProperty()`.
- Interactive UI available at: `http://localhost:3000/api`.

---

### 8. Testing Strategy
- **Unit Testing:**
  - Mocking TypeORM repository methods (`find`, `findOne`, `create`, `save`, `preload`, `delete`) via `getRepositoryToken(Coffee)` and `getRepositoryToken(Flavor)`.
  - 📁 [`src/modules/coffees/coffees.service.spec.ts`](./src/modules/coffees/coffees.service.spec.ts)
- **Integration & E2E Testing:**
  - Full request-response assertions using **Supertest**.
  - Automated spin-up of PostgreSQL on port 5433 via `docker-compose --profile test`.
  - Tests verify CRUD workflows, DTO validations, and status codes.
  - 📁 [`test/coffee/coffees.e2e-spec.ts`](./test/coffee/coffees.e2e-spec.ts)

---

## 📁 Project Structure

```text
coffee-app/
├── src/
│   ├── common/                               # Cross-cutting lifecycle building blocks
│   │   ├── decorators/                       # @Protocol(), @Public()
│   │   ├── dto/                              # PaginationQueryDto
│   │   ├── filters/                          # HttpExceptionFilter
│   │   ├── guards/                           # ApiKeyGuard
│   │   ├── interceptors/                     # WrapResponseInterceptor, TimeoutInterceptor
│   │   ├── middleware/                       # LoggingMiddleware
│   │   ├── pipes/                            # ParseIntPipe
│   │   └── common.module.ts                  # Global module binding APP_GUARD & middleware
│   ├── config/                               # Global application configuration
│   │   └── app.config.ts
│   ├── migrations/                           # TypeORM migration files
│   │   └── 1791806872090-InitialMigration.ts
│   ├── modules/
│   │   ├── coffee-rating/                    # Cross-module DI consumer service
│   │   ├── coffees/                          # Core domain feature
│   │   │   ├── config/                       # Typed coffees namespace config
│   │   │   ├── dto/                          # CreateCoffeeDto, UpdateCoffeeDto
│   │   │   ├── entities/                     # Coffee, Flavor TypeORM entities
│   │   │   ├── coffees.controller.ts         # REST API endpoints
│   │   │   ├── coffees.module.ts             # Custom & dynamic provider registrations
│   │   │   ├── coffees.service.ts            # Business logic & QueryRunner transactions
│   │   │   └── coffees.service.spec.ts       # Service unit tests with mocked repositories
│   │   └── events/                           # Event domain entity & module
│   ├── app.controller.ts
│   ├── app.module.ts                         # Root module (Config, TypeORM, Feature modules)
│   ├── app.service.ts
│   └── main.ts                               # Bootstrap (ValidationPipe, Filters, Swagger)
├── test/
│   ├── coffee/
│   │   └── coffees.e2e-spec.ts               # Feature E2E integration test
│   ├── app.e2e-spec.ts                       # Root application E2E test
│   └── jest-e2e.json
├── docker-compose.yml                        # Postgres (port 5432) & test-db (port 5433)
├── typeorm-cli.config.ts                     # TypeORM CLI datasource configuration
└── README.md
```

---

<p align="center">
  <sub>Part of the <a href="../README.md">Official NestJS Learning Path Repository</a>.</sub>
</p>
