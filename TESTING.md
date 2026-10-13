# Testing — CelularPro API

Suite automatizada con **Vitest 4 + Supertest**. Todo el stack corre sin base de datos ni `.env`: la capa de datos y los repositorios se reemplazan por mocks, y el secreto JWT se fija por archivo.

## How to run

| Command | Scope |
| --- | --- |
| `npm test` | Full suite |
| `npm run test:api` | API tests only (`tests/api/`) |
| `npm run test:performance` | Performance tests only (`tests/performance/`) |
| `npm run test:coverage` | Suite + coverage (istanbul) |

**Current status: 104 tests / 13 files — all passing.**

| Category | Files | Tests |
| --- | --- | --- |
| Regression | `tests/app`, `tests/application`, `tests/interface` | 72 |
| API | `tests/api` | 27 |
| Performance | `tests/performance` | 5 |

"Gotten" = result of the last full run (all green).

---

## 1. Regression tests — 72

### 1.1 HTTP regression — ban user (`tests/app/app.test.ts`, 7)

Endpoint `PUT /api/v1/admin/users/:id/ban` (graph V(G)=7 paths).

| Test (path) | Objective | Expected | Gotten |
| --- | --- | --- | --- |
| 1 — no Bearer header | Unauthenticated request is blocked | `401 Token requerido`, no DB write | Pass |
| 2 — invalid signature | Tampered token is rejected | `401 Token inválido o expirado` | Pass |
| 3 — USER role | Non-admin is blocked by middleware | `403 Acceso restringido` | Pass |
| 4 — reason < 4 chars | Zod validates the body | `400 Datos inválidos` | Pass |
| 5 — admin bans itself (RN-05) | Self-ban business rule | `400 No puedes banear tu propia cuenta`, no write | Pass |
| 6 — P2025 not found | Prisma not-found maps to 404 (DEF-26-01 regression) | `404 Usuario no encontrado` | Pass |
| 7 — valid ban | Success path returns the banned user | `200`, `banned=true`, no `password` in payload | Pass |

### 1.2 Admin use-cases (`tests/application/use-cases/admin.use-cases.test.ts`, 3)

| Test | Objective | Expected | Gotten |
| --- | --- | --- | --- |
| Promotes USER to ADMIN | `changeUserRole` updates the role | `role: 'ADMIN'` | Pass |
| Rejects changing your own role | Self-change guard | 400 | Pass |
| Changes ADMIN to USER | Demotion works the same way | `role: 'USER'` | Pass |

### 1.3 Auth use-cases (`tests/application/use-cases/auth.use-cases.test.ts`, 16)

| Test | Objective | Expected | Gotten |
| --- | --- | --- | --- |
| Registers a new user and returns public user + token | Register happy path (bcrypt hash, repo create, JWT) | token returned, `create` called with hashed password, no `password` leak | Pass |
| Rejects with 409 when email already registered | Duplicate email guard | `409`, `create`/hash not called | Pass |
| Returns public user + token for valid credentials | Login happy path | token, no `password` leak | Pass |
| Rejects with 401 when the user does not exist | Unknown user | `401 Credenciales inválidas` | Pass |
| Rejects with 401 on a wrong password | Wrong password | `401`, no JWT | Pass |
| Rejects with 403 for a banned user including the reason | Banned user with motive | `403` + `Motivo: …` | Pass |
| Rejects with 403 for a banned user without a reason | Banned user, no motive | `403`, plain message | Pass |
| Defaults the expiry to `7d` | `JWT_EXPIRES_IN` not set | `expiresIn: '7d'` | Pass |
| Uses `JWT_EXPIRES_IN` from the environment | Env var set | `expiresIn: '2h'` | Pass |
| Rejects a password < 8 chars | Min-length rule | `La contraseña debe tener al menos 8 caracteres` | Pass |
| Rejects a name with `<script>` (XSS) | HTML/script injection blocked | `No se permiten etiquetas HTML ni scripts` | Pass |
| Rejects a name with any HTML tag (`<b>`) | HTML tags blocked | schema invalid | Pass |
| Rejects a name with `javascript:` scheme | Script scheme blocked | schema invalid | Pass |
| Accepts legitimate names (`O'Brien García`) | No false positives | schema valid | Pass |
| Rejects an email containing HTML tags | Email safety | schema invalid | Pass |
| Login rejects an empty password | `loginDto` min rule | `La contraseña es requerida` | Pass |

> Note: the uppercase-password rule was added and then reverted (the seeded admin password `admin1234` has no uppercase, so login broke). No caps tests remain.

### 1.4 Orders use-cases (`tests/application/use-cases/orders.use-cases.test.ts`, 20)

| Test | Objective | Expected | Gotten |
| --- | --- | --- | --- |
| Creates an order with userId | `createOrder` passes `userId` | `create` called with `{...data, userId}` | Pass |
| Creates an order without userId | Anonymous orders still work | `userId: undefined` forwarded | Pass |
| Propagates repository errors | Errors bubble up | rejection rethrown | Pass |
| Rejects when a required field is missing (x7: email, name, phone, address, city, dept, items) | Zod required fields | `ZodError` per field | Pass |
| Accepts a complete order | Happy-path parse | `parse` returns the data | Pass |
| Rejects an invalid email | Email format | `ZodError` | Pass |
| Rejects an empty items array | Items must be non-empty | `ZodError` | Pass |
| Rejects a non-positive quantity | `qty` positive rule | `ZodError` | Pass |
| Rejects a non-uuid phoneId | `phoneId` must be UUID | `ZodError` | Pass |
| Returns all orders for the given user | `getMyOrders` queries by user | `findByUser(userId)` called, orders returned | Pass |
| Returns an empty array when the user has no orders | No-orders case | `[]` | Pass |
| Returns a paginated list | `getAllOrders` forwards page/limit | `findAll(page, limit)` + `meta` | Pass |
| Updates the status of an existing order | `updateOrderStatus` happy path | `findById` then `updateStatus(id, status)` | Pass |
| Rejects with 404 when the order does not exist | Not-found guard | `404`, `updateStatus` not called | Pass |

### 1.5 Phones use-cases (`tests/application/use-cases/phones.use-cases.test.ts`, 15)

| Test | Objective | Expected | Gotten |
| --- | --- | --- | --- |
| Returns the phone when the slug exists | `getPhoneBySlug` happy path | matching phone returned | Pass |
| Asks the repository for the exact slug | Delegates correctly | `findBySlug('iphone-15')` | Pass |
| Throws 404 when the slug does not exist | Not-found guard | `404 Celular no encontrado` | Pass |
| Throws 404 when the repository has no phones | Empty catalog | `404` | Pass |
| Matches the slug exactly, not partial text | Exact-match semantics | partial slug → `404` | Pass |
| Delegates filters and pagination | `getPhones` builds filters + forwards page/limit | `findAll(filters, page, limit)` | Pass |
| Applies the filters to in-memory phones | Filtering behavior | only matching brand returned | Pass |
| Returns the phone when the id exists | `getPhoneById` happy path | matching phone returned | Pass |
| Throws 404 when the id does not exist | Not-found guard | `404` | Pass |
| Keeps every optional field provided | `createPhone` preserves optional data | all fields set | Pass |
| Defaults optional fields to null when absent | Defaults | `null` for each optional field | Pass |
| Updates an existing phone | `updatePhone` happy path | `update(id, data)` called, fields changed | Pass |
| Throws 404 when the phone does not exist | Not-found guard | `404` | Pass |
| Deletes an existing phone | `deletePhone` happy path | `delete(id)` called, phone removed | Pass |
| Throws 404 when the phone does not exist | Not-found guard | `404` | Pass |

### 1.6 Auth DTO (`tests/application/dtos/auth.test.ts`, 6)

| Test | Objective | Expected | Gotten |
| --- | --- | --- | --- |
| Rejects a too-short password | `min(8)` rule | invalid, error message | Pass |
| Rejects a body without `name` | Required field | invalid | Pass |
| Rejects a one-letter `name` | `min(2)` rule | `El nombre debe tener al menos 2 caracteres` | Pass |
| Accumulates all body errors, not just the first | Zod error aggregation | errors for email + name + password | Pass |
| Accepts a valid body | Happy-path parse | data returned | Pass |
| Discards fields not in the schema (e.g. `role`) | No privilege escalation via body | `role` stripped | Pass |

### 1.7 Controllers + middlewares (`tests/interface`, 5)

| Test | Objective | Expected | Gotten |
| --- | --- | --- | --- |
| Change user role — valid user | Repository role change works | `role: 'ADMIN'` | Pass |
| Change user role — admin cannot change own role | Self-change guard | throws | Pass |
| `requireAdmin` blocks USER | Non-admin blocked | `403 Acceso restringido` | Pass |
| `requireAdmin` allows ADMIN | Admin passes | `next()` called | Pass |
| `validate` rejects invalid `changeRoleDto` | Zod middleware | HTTP `400` | Pass |

---

## 2. API testing — 27 (`tests/api/`, via Supertest against the Express app)

Repositories are mocked (constructor stubs); tokens are real JWTs signed with the test secret.

### 2.1 `PUT /api/v1/admin/users/:id/role` (`tests/api/admin.api.test.ts`, 7)

| Test | Objective | Expected | Gotten |
| --- | --- | --- | --- |
| No bearer header | Unauthenticated blocked | `401 Token requerido` | Pass |
| Invalid signature | Tampered token rejected | `401 Token inválido o expirado` | Pass |
| USER role | Non-admin blocked | `403 Acceso restringido` | Pass |
| Invalid role in body (`SUPERUSER`) | Zod validation | `400 Datos inválidos` | Pass |
| Admin changes own role | Business rule (RN) | `400 No puedes cambiar tu propio rol` | Pass |
| User does not exist | Error passthrough | `404 Usuario no encontrado` | Pass |
| Correct change | Happy path | `200`, `role` updated, no `password` | Pass |

### 2.2 Orders (`tests/api/orders.api.test.ts`, 17)

`POST /api/v1/orders` (6):

| Test | Objective | Expected | Gotten |
| --- | --- | --- | --- |
| No token | Unauthenticated blocked | `401 Token requerido` | Pass |
| Invalid signature | Tampered token rejected | `401 Token inválido o expirado` | Pass |
| Invalid email | Zod body validation | `400 Datos inválidos` | Pass |
| Empty items | Zod items rule | `400 Datos inválidos` | Pass |
| Valid order | Happy path links order to user | `201`, `create` called with `{...body, userId}` | Pass |
| Repository stock rule | AppError passthrough | `400 Stock insuficiente` | Pass |

`GET /api/v1/orders/my` (2):

| Test | Objective | Expected | Gotten |
| --- | --- | --- | --- |
| No token | Unauthenticated blocked | `401 Token requerido` | Pass |
| Authenticated user | Returns that user's orders | `200 {data: [...]}`, `findByUser(userId)` | Pass |

`GET /api/v1/orders/` (4):

| Test | Objective | Expected | Gotten |
| --- | --- | --- | --- |
| No token | Unauthenticated blocked | `401` | Pass |
| USER role | Admin-only route | `403 Acceso restringido` | Pass |
| ADMIN, default page/limit | Defaults (1, 20) forwarded | `200` + `meta {page:1, limit:20}` | Pass |
| ADMIN, `?page=2&limit=5` | Query pagination forwarded | `findAll(2, 5)` + `meta` | Pass |

`PUT /api/v1/orders/:id/status` (5):

| Test | Objective | Expected | Gotten |
| --- | --- | --- | --- |
| No token | Unauthenticated blocked | `401` | Pass |
| USER role | Admin-only route | `403 Acceso restringido` | Pass |
| Invalid status (`INVENTADO`) | Zod enum validation | `400 Datos inválidos` | Pass |
| Order does not exist | 404 guard | `404 Orden no encontrada`, no update | Pass |
| Valid status change | Happy path | `200`, `status: 'SHIPPED'` | Pass |

### 2.3 `GET /api/v1/phones/:slug` (`tests/api/phones.api.test.ts`, 3 — public, no auth)

| Test | Objective | Expected | Gotten |
| --- | --- | --- | --- |
| Existing slug | Public catalog detail | `200` with full phone | Pass |
| Unknown slug | Not-found guard | `404 Celular no encontrado` | Pass |
| Repository error | Error passthrough | `404`, no leak of internals | Pass |

---

## 3. Performance testing — 5 (`tests/performance/use-cases.perf.test.ts`)

Each use-case runs against a resolving mock repo. Methodology: 20 warm-up calls + 200 timed samples, **median** duration (µs), guard rail `LIMITE_MEDIANA_MS = 25 ms`.

| Method | Objective | Limit | Gotten (median) | Result |
| --- | --- | --- | --- | --- |
| `changeUserRole` | Resolves within an acceptable time | < 25 ms | 2.7 µs | Pass |
| `getMyOrders` | Resolves within an acceptable time | < 25 ms | 1.3 µs | Pass |
| `getAllOrders` | Resolves within an acceptable time | < 25 ms | 2.1 µs | Pass |
| `getPhoneBySlug` | Resolves within an acceptable time | < 25 ms | 2.1 µs | Pass |
| `createOrder` | Resolves within an acceptable time | < 25 ms | 2.4 µs | Pass |