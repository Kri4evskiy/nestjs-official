# NestJS Authentication and Authorization

> Master course notes, architecture diagrams, and best practices for implementing secure Authentication and Authorization in NestJS.

---

## 01. Authentication vs Authorization

Based on [Okta: Authentication vs Authorization](https://www.okta.com/identity-101/authentication-vs-authorization/).

### Core Concepts

```
┌───────────────────────────────────────────┐
│              Incoming Request             │
└─────────────────────┬─────────────────────┘
                      │
                      ▼
┌───────────────────────────────────────────┐
│     1. Authentication (AuthN)             │  👉 "Who are you?"
│     - Verify identity                     │
│     - Login/Password, 2FA, Biometrics     │
└─────────────────────┬─────────────────────┘
                      │ Identity Confirmed (User / Subject)
                      ▼
┌───────────────────────────────────────────┐
│     2. Authorization (AuthZ)              │  👉 "What can you do?"
│     - Verify permissions and policies     │
│     - RBAC (Roles), PBAC/ABAC (Policies)  │
└─────────────────────┬─────────────────────┘
                      │ Granted / Forbidden
                      ▼
┌───────────────────────────────────────────┐
│            Access to Resource             │
└───────────────────────────────────────────┘
```

| Feature | Authentication (**AuthN**) | Authorization (**AuthZ**) |
| :--- | :--- | :--- |
| **Question** | *"Who are you?"* | *"What are you allowed to do?"* |
| **Method** | Credentials (passwords, biometrics, OTP, social login) | Roles, permissions, access policies (RBAC, PBAC) |
| **Data Format** | Handled via tokens (ID tokens, session cookies) | Access tokens, scopes, claims, permissions list |
| **Frontend Parallel** | Submitting login form, verifying session state in Next.js middleware / Auth context | Disabling buttons (`canEdit`), conditionally hiding routes (`ProtectedRoute`) |
| **NestJS Layer** | Auth Guards, Passport Strategies (`validate()`), Session Guards | Roles Guard, Permissions Guard, Policy Handlers (CASL) |

---
