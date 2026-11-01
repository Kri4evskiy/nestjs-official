# Official NestJS Learning Path — Master Repository & Architecture Hub

<p align="center">
  <a href="https://nestjs.com/" target="_blank">
    <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
  </a>
</p>

<p align="center">
  A centralized master repository, architectural companion, and practical laboratory workspace covering the complete official course catalog from <b><a href="https://courses.nestjs.com/">NestJS Courses</a></b> by framework creators Kamil Myśliwiec & Mark Pieszak.
</p>

---

## 📌 About this Repository

> **Curriculum Hub & Architectural Reference:**  
> This repository documents an end-to-end learning journey across the full official **[NestJS Courses](https://courses.nestjs.com/)** curriculum bundle.  
> Rather than a single monolithic app, it is organized into dedicated, self-contained subprojects representing each specialized course. This root document serves as the high-level roadmap and syllabus index, while each subproject folder contains its own standalone codebase, environment configuration, run instructions, and lesson-by-lesson architectural notes.

---

## 🗺️ Curriculum Roadmap & Course Status

| Course / Directory | Status | Level | Key Technologies & Architectural Focus |
| :--- | :---: | :---: | :--- |
| [**1. NestJS Fundamentals** (`coffee-app/`)](./coffee-app) | ✅ **Completed** | Core / Foundation | REST API architecture, TypeORM, PostgreSQL, DI Scopes, Lifecycle Building Blocks, E2E |
| [**2. NestJS Advanced Concepts** (`advanced-concepts/`)](./advanced-concepts) | ✅ **Completed** | Advanced / Enterprise | IoC Discovery, Worker Threads (Piscina), Circuit Breaker, Durable Providers, Schematics, i18n |
| [**3. Authentication & Authorization** (`auth-extension/`)](./auth-extension) | 🔄 **In Progress** | Security / Master | Baseline project setup & bootstrap. Upcoming: Argon2, JWT rotation, RBAC, CASL policies |
| **4. NestJS GraphQL** | ⏳ *Coming Soon* | Full-Stack API | Code-First & Schema-First, Resolvers, Mutations, Subscriptions, Federation |
| **5. NestJS Microservices** | ⏳ *Coming Soon* | Distributed Systems | Transports (Redis, NATS, Kafka, gRPC), Message Patterns, Event Streaming, Hybrid Apps |
| **6. Architecture & Advanced Patterns** | ⏳ *Coming Soon* | Enterprise Scale | Clean Architecture, Hexagonal / Ports & Adapters, CQRS, Domain-Driven Design (DDD) |

```text
nestjs/
├── coffee-app/           # [Course 1: Completed] NestJS Fundamentals (REST API, TypeORM, Postgres, Lifecycle Building Blocks)
├── advanced-concepts/    # [Course 2: Completed] NestJS Advanced Concepts (IoC Discovery, Worker Threads, Circuit Breaker, Schematics)
├── auth-extension/       # [Course 3: In Progress] Authentication & Authorization (Bootstrap completed; Security modules upcoming)
├── [graphql-app/]        # [Course 4: Planned] NestJS GraphQL (Code-First & Schema-First)
├── [microservices/]      # [Course 5: Planned] NestJS Microservices (Distributed Transports & Event-Driven)
└── [architecture-app/]   # [Course 6: Planned] NestJS Architecture & Enterprise Patterns (CQRS, DDD)
```

---

## 📦 Course Overview & Navigation

### 1. ☕ `coffee-app` — [NestJS Fundamentals](https://courses.nestjs.com/)
- **Status:** ✅ **Completed**
- **Domain:** Coffee shop management API managing products (`coffees`), flavors, transactional coffee recommendations (`events`), and ratings (`coffee-rating`).
- **Core Topics Covered:**
  - **Core Architecture:** Modules (`@Module`), Controllers (`@Controller`), Services (`@Injectable`), and Dependency Injection trees.
  - **Advanced DI:** Custom Providers (`useValue`, `useClass`, `useFactory`), non-class provider tokens, asynchronous providers, and Provider Scopes (`DEFAULT`, `REQUEST`, `TRANSIENT`).
  - **Database & Persistence:** PostgreSQL via `@nestjs/typeorm`, relational mappings (Many-to-Many, One-to-Many), atomic transactions via `QueryRunner`, and database migrations.
  - **Validation & Configuration:** Global `ValidationPipe` with `class-validator` / `class-transformer`, `@nestjs/config` with strict **Joi** schema validation, and typed configuration namespaces.
  - **Request-Response Lifecycle:** Exception Filters (`HttpExceptionFilter`), Guards (`ApiKeyGuard` + `@Public()` decorator), Interceptors (`WrapResponseInterceptor`, `TimeoutInterceptor`), custom Pipes (`ParseIntPipe`), Middleware (`LoggingMiddleware`), and custom Param Decorators (`@Protocol()`).
  - **Documentation & Testing:** OpenAPI / Swagger specification generation, unit testing with repository mocks, and containerized E2E testing with Docker Compose.
- 📖 **Execution & Codebase Walkthrough:** See [`coffee-app/README.md`](./coffee-app/README.md) for launch scripts, database setup, and detailed file breakdowns.

---

### 2. 🚀 `advanced-concepts` — [NestJS Advanced Concepts](https://courses.nestjs.com/)
- **Status:** ✅ **Completed**
- **Domain:** Advanced framework mechanics, high-performance computing, internal tooling, and resilient architecture patterns.
- **Core Topics Covered:**
  - **Framework Internals & Diagnostics:** Profiling runtime initialization with `NEST_DEBUG=true`, detecting circular dependencies with `madge`, and visualising dependency graphs with Graphviz.
  - **Lazy Loading Modules:** Demand-driven instantiation via `LazyModuleLoader` for serverless optimization and faster startup times.
  - **IoC Container Introspection:** Discovery pattern with `DiscoveryService`, `MetadataScanner`, and `Reflector`; authoring a custom declarative cron/interval scheduler (`@IntervalHost`, `@Interval`).
  - **Multithreading & Performance:** Dedicated worker thread pools via **Piscina** to offload CPU-intensive calculations (e.g. Fibonacci sequence) from the main Event Loop.
  - **Resilience & Fault Tolerance:** Custom Circuit Breaker interceptor featuring *CLOSED*, *OPEN*, and *HALF_OPEN* states to guard against third-party service outages.
  - **Dynamic Modules & Schematics:** Reusable asynchronous dynamic modules via `ConfigurableModuleBuilder` (`HttpClientModule`), TypeScript mixins (`WithUUID`), DI-aware pipes (`EntityExistsPipe`), and custom Nest CLI Schematics generators (`schematics/`).
  - **Event-Driven Architecture & Durable Providers:** Decoupled events via `@nestjs/event-emitter` with DI subtree context propagation, request-scoped memory optimizations with `durable: true`, and custom `ContextIdStrategy` for multi-tenancy and i18n.
- 📖 **Execution & Codebase Walkthrough:** See [`advanced-concepts/README.md`](./advanced-concepts/README.md) for launch scripts, Vitest test suites, and architectural deep-dives.

---

### 3. 🛡️ `auth-extension` — [NestJS Authentication & Authorization](https://courses.nestjs.com/)
- **Status:** 🔄 **In Progress** *(Initial project setup & baseline scaffolding established)*
- **Domain:** Enterprise security, user identity verification, credential management, and granular permission enforcement.
- **Current Stage:**
  - Initial project bootstrapping and runtime foundation completed following official course setup guidance.
- **Upcoming Modules & Target Architecture:**
  - **AuthN (Authentication):** Cryptographic password hashing (Argon2 / Bcrypt) via abstracted `HashingService`, JWT token lifecycle management via `@nestjs/jwt`, dual-token scheme (short-lived Access Tokens + rotating Refresh Tokens), session/cookie-based auth, and Multi-Factor Authentication (2FA/TOTP).
  - **AuthZ (Authorization):** Role-Based Access Control (RBAC with `@Roles()`), Claim/Permission-Based Access Control (PBAC), and Attribute-Based Access Control (ABAC) using **CASL** (`@casl/ability`).
  - **Hardening:** CSRF/XSS protection and distributed token revocation lists with Redis.
- 📖 **Execution & Current Status:** See [`auth-extension/README.md`](./auth-extension/README.md) for initial setup and progress notes.

---

### 4. ⏳ Upcoming Courses (Full Bundle Roadmap)

#### 🕸️ NestJS GraphQL
- **Focus:** Building scalable GraphQL APIs with NestJS.
- **Planned Highlights:** Code-First and Schema-First approaches, Object Types, Queries, Mutations, Resolvers, Input Types, GraphQL Subscriptions (WebSockets), Apollo & Mercurius integrations, and GraphQL Federation.

#### ⚡ NestJS Microservices
- **Focus:** Scalable distributed systems and event-driven architectures.
- **Planned Highlights:** Microservice transport layers (Redis, NATS, RabbitMQ, Kafka, MQTT, gRPC), Request-Response vs. Event-based messaging, Hybrid Applications, and fault-tolerant message consumers.

#### 🏛️ NestJS Architecture & Advanced Patterns
- **Focus:** Enterprise application architecture and maintainable software design.
- **Planned Highlights:** Clean Architecture, Hexagonal / Ports & Adapters pattern, CQRS (Command Query Responsibility Segregation), Domain-Driven Design (DDD) bounded contexts, and enterprise scalability patterns.

---

## 🛠️ Global Tech Stack & Prerequisites

Each subproject is self-contained with its own dependencies, scripts, and configurations:

- **Runtime & Language:** Node.js (v20+ LTS), TypeScript (Strict mode)
- **Framework:** NestJS 11 & 12 (Express HTTP platform)
- **Databases & Containers:** PostgreSQL, Docker, Docker Compose
- **Testing Tools:** Jest, Vitest, Supertest
- **Code Quality:** Biome, Oxlint, Prettier

> 💡 **How to Run Projects:** Navigate into any specific project directory (e.g., `cd coffee-app`) and follow the dedicated `README.md` inside that directory for exact startup commands, environment variables, and test instructions.

---

<p align="center">
  <sub>Maintained as an educational reference and portfolio hub for the official NestJS learning path.</sub>
</p>
