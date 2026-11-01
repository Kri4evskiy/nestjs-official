# NestJS Official Courses — Practical Labs & Architectural Deep Dives

<p align="center">
  <a href="https://nestjs.com/" target="_blank">
    <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
  </a>
</p>

<p align="center">
  Hands-on implementation, in-depth laboratory projects, architectural diagrams, and comprehensive study notes based on the official educational curriculum by the framework creators at <b><a href="https://courses.nestjs.com/">NestJS Courses</a></b> (Kamil Myśliwiec & Mark Pieszak).
</p>

---

## 📌 About this Repository

> **Repository Classification & Disclaimer:**  
> This repository is a practical implementation and architectural reference hub based on the official **[NestJS Courses](https://courses.nestjs.com/)** curriculum by Kamil Myśliwiec (creator) & Mark Pieszak (core team member).  
> It serves as an independent educational workspace and engineering portfolio showcasing deep mastery of core, advanced, and enterprise NestJS patterns across real-world codebases, automated tests, and production architectures (not an official repository of the NestJS core organization).

---

## 🗺️ Repository Structure & Covered Courses

| Directory | Official NestJS Course | Level | Key Technologies & Architectural Patterns |
| :--- | :--- | :---: | :--- |
| [**`coffee-app/`**](./coffee-app) | **NestJS Fundamentals** | Core / Base | NestJS 11, TypeORM, PostgreSQL, Docker, Swagger/OpenAPI, Jest, E2E |
| [**`advanced-concepts/`**](./advanced-concepts) | **NestJS Advanced Concepts** | Advanced / Enterprise | NestJS 12, Vitest, Worker Threads (Piscina), Schematics, Event-Emitter, Durable Providers, i18n |
| [**`auth-extension/`**](./auth-extension) | **Authentication & Authorization** | Security / Master | NestJS 12, JWT, Cookies, RBAC, Claims, CASL (PBAC/ABAC), Security Guards |

```text
nestjs/
├── coffee-app/           # [Course 1] NestJS Fundamentals (REST API, TypeORM, Postgres, Filters, Guards, Interceptors)
├── advanced-concepts/    # [Course 2] NestJS Advanced Concepts (IoC Discovery, Worker Threads, Circuit Breaker, Durable Providers, Schematics)
└── auth-extension/       # [Course 3] Authentication & Authorization (AuthN vs AuthZ, JWT, Sessions, RBAC, CASL Policies)
```

---

## 📦 Detailed Course Breakdowns

### 1. ☕ `coffee-app` — [NestJS Fundamentals](https://courses.nestjs.com/)
> **Course Objective:** Master the foundational architectural pillars of NestJS, Inversion of Control (IoC), and Dependency Injection (DI), while building a production-ready REST API integrated with an SQL database and comprehensive test suites.

- **Domain Scope:** A coffee shop management API handling coffees (`coffees`), flavors, related domain events (`events`), and recommendations/ratings (`coffee-rating`).
- **Core Topics & Implementations:**
  - **NestJS Architectural Pillars:** Modules (`@Module`), Controllers (`@Controller`), Services (`@Injectable`), custom providers, and DI dependency tree resolution.
  - **Advanced Dependency Injection:** Custom Providers (`useValue`, `useClass`, `useFactory`), non-class provider tokens, asynchronous providers, and Provider Scopes (`DEFAULT`, `REQUEST`, `TRANSIENT`).
  - **Database & Persistence (TypeORM & PostgreSQL):**
    - PostgreSQL integration via `@nestjs/typeorm`.
    - Relational entity mapping: Many-to-Many (`Coffee` ↔ `Flavor`) and One-to-Many relationships with cascading operations.
    - Transaction management and atomicity using TypeORM `QueryRunner`.
    - Database schema migrations (`migration:generate`, `migration:run`, `migration:revert`).
  - **Validation & DTOs:**
    - Global `ValidationPipe` configured with `whitelist: true`, `transform: true`, and `forbidNonWhitelisted: true`.
    - Input validation with `class-validator` and object transformation with `class-transformer`.
    - DTO inheritance and partial types using `@nestjs/mapped-types` (`PartialType`).
  - **Configuration Management:**
    - Environment variable loading with `@nestjs/config`.
    - Strict schema validation using **Joi**.
    - Modular namespaced and typed configurations (`registerAs`).
  - **Request-Response Lifecycle Building Blocks:**
    - **Exception Filters:** Custom global HTTP exception interception (`HttpExceptionFilter`).
    - **Guards:** Endpoint protection with `ApiKeyGuard` combined with custom reflection metadata (`@Public()`, `Reflector`).
    - **Interceptors:** Response payload standardisation (`WrapResponseInterceptor`) and request timeout handling (`TimeoutInterceptor`) using RxJS operators.
    - **Pipes:** Custom parameter transformation (`ParseIntPipe`).
    - **Middleware:** Request logging and tracing (`LoggingMiddleware`).
    - **Custom Param Decorators:** Extraction decorators such as `@Protocol()`.
  - **OpenAPI / API Documentation:** Interactive documentation using `@nestjs/swagger` and the Swagger CLI plugin.
  - **Automated Testing:**
    - Isolated unit tests (`coffees.service.spec.ts`) with custom repository mocking (`getRepositoryToken`).
    - End-to-end integration tests (`app.e2e-spec.ts`) running against containerized PostgreSQL via Docker Compose.

---

### 2. 🚀 `advanced-concepts` — [NestJS Advanced Concepts](https://courses.nestjs.com/)
> **Course Objective:** Deep dive into the internal runtime mechanics of NestJS ("under the hood"), high-performance multithreading, runtime metadata introspection, custom CLI tooling, and resilient enterprise architectures.

- **Core Topics & Implementations:**
  - **Debugging & Circular Dependency Resolution:**
    - Framework runtime profiling with `NEST_DEBUG=true`.
    - Detecting and untangling circular dependencies using `madge` and visualising module dependency graphs with **Graphviz**.
  - **Lazy Loading Modules:**
    - Dynamic module instantiation on demand via `LazyModuleLoader` to reduce memory footprints and optimize cold-start latency in serverless environments.
  - **IoC Container Discovery Pattern:**
    - Runtime metadata inspection using `DiscoveryService`, `MetadataScanner`, and `Reflector`.
    - Building a custom automated task scheduler using declarative decorators (`@IntervalHost`, `@Interval`).
  - **High-Performance Multithreading (Worker Threads & Piscina):**
    - Offloading heavy CPU-bound computations (such as Fibonacci calculations) away from the Node.js event loop into a dedicated worker thread pool via **Piscina**.
  - **Resilience & Fault Tolerance (Circuit Breaker Pattern):**
    - Custom interceptor implementing the Circuit Breaker pattern with three discrete states: *CLOSED*, *OPEN*, and *HALF_OPEN*, preventing cascading system failures during third-party service degradation.
  - **Configurable Dynamic Modules:**
    - Developing clean, strongly-typed asynchronous dynamic modules using `ConfigurableModuleBuilder` (`HttpClientModule`).
  - **TypeScript Mixins & Dynamic DI Pipes:**
    - Class mixins (`WithUUID`) for dynamic DTO and entity composition.
    - Dependency-injected validation pipes (`EntityExistsPipe`) capable of dynamically checking entity existence in the database.
  - **NestJS CLI Schematics:**
    - Authoring custom schematic generators (`schematics/`) to automate boilerplate generation for custom modules and services across engineering teams.
  - **Event-Driven Architecture & DI Sub-Trees:**
    - Decoupled asynchronous architecture using `@nestjs/event-emitter`.
    - Context propagation across asynchronous event handlers utilizing DI sub-trees (`ContextIdFactory`).
  - **Durable Providers & Multi-Tenancy / i18n:**
    - Mitigating memory overhead for request-scoped providers using `durable: true`.
    - Custom context resolution strategies (`ContextIdStrategy`) for multi-tenant isolation and localized i18n sub-trees.

---

### 3. 🛡️ `auth-extension` — [NestJS Authentication & Authorization](https://courses.nestjs.com/)
> **Course Objective:** Build an enterprise-grade, secure, and scalable access control system covering authentication, token lifecycles, role-based access, and fine-grained attribute-based policies.

- **Core Topics & Implementations:**
  - **AuthN (Authentication) vs. AuthZ (Authorization):**
    - Clear domain separation between identity verification and permission enforcement.
  - **Authentication Mechanisms & Strategies:**
    - Secure password hashing using industry-standard cryptographic algorithms (Argon2 / Bcrypt) abstracted behind a `HashingService` interface.
    - Stateless JWT authentication: lifecycle, signing, and verification via `@nestjs/jwt`.
    - Dual-token security scheme: short-lived **Access Tokens** combined with rotating, secure **Refresh Tokens**.
    - Stateful sessions and cookie-based authentication (`HttpOnly`, `Secure`, `SameSite=Lax`).
    - Multi-Factor Authentication (2FA / MFA with TOTP & QR codes) and OAuth2 social integration.
    - Contextual user resolution via custom `@ActiveUser()` decorator.
  - **Authorization Models:**
    - **RBAC (Role-Based Access Control):** Role hierarchies enforced via metadata (`@Roles()`) and `RolesGuard`.
    - **CBAC / PBAC (Claim / Permission-Based Access Control):** Granular permission claims for fine-grained action checks.
    - **ABAC (Attribute-Based Access Control / Policies via CASL):** Contextual and entity-attribute permission rules using `@casl/ability` and policy handlers (`PoliciesGuard`).
  - **Security Best Practices & Hardening:**
    - Defenses against CSRF and XSS vectors.
    - Distributed token invalidation and revocation lists (e.g., Redis blacklisting).

---

## 🛠️ Technology Stack

- **Framework:** NestJS 11 & 12 (Express HTTP platform)
- **Language:** TypeScript (Strict mode, ES Modules)
- **Database & ORM:** PostgreSQL, TypeORM
- **Testing:** Jest, Vitest, Supertest
- **Tooling & Infrastructure:** Docker, Docker Compose, Biome, Oxlint, Prettier, Piscina, Swagger/OpenAPI

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (version 20 LTS or higher)
- **Docker Desktop** (for running PostgreSQL containers)
- Package manager: **npm** or **pnpm**

---

### ☕ Running `coffee-app` (Fundamentals)

```bash
cd coffee-app

# 1. Install dependencies
npm install

# 2. Start PostgreSQL container
docker compose up -d

# 3. Run TypeORM migrations
npm run migration:run

# 4. Start the application in development mode
npm run start:dev

# 5. Run end-to-end tests
npm run test:e2e
```

📍 **Swagger API Documentation:** `http://localhost:3000/api`

---

### 🚀 Running `advanced-concepts` (Advanced)

```bash
cd advanced-concepts

# 1. Install dependencies
npm install

# 2. Start the development server
npm run start:dev

# 3. Run Vitest test suite
npm run test
```

---

### 🛡️ Running `auth-extension` (Auth & Security)

```bash
cd auth-extension

# 1. Install dependencies
npm install

# 2. Start development server
npm run start:dev

# 3. Run test suite
npm run test
```

---

<p align="center">
  <sub>Maintained for educational reference and professional engineering portfolio purposes based on the official NestJS learning path.</sub>
</p>
