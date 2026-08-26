# Production Readiness Roadmap & Task Registry (TODO.md)

This task backlog outlines the engineering steps required to transition the **Intent Runtime (AI Receptionist)** from a prototype/MVP into a hardened, production-ready enterprise application. Every item is grounded in the findings from `AUDIT.md`, `ACTION_PLAN.md`, `ARCHITECTURE.md`, and `FUTURE_ARCHITECTURE.md`.

---

## 1. Storage & Persistence Hardening

### [P0] Replace Volatile In-Memory Arrays with Durable Database
- [x] **Task 1.1: Database Schema & Migration Strategy**
  - **Description**: Replace global `sessions`, `events`, `telemetry`, and `actionQueue` in-memory arrays in `server.ts` with a durable database / persistent storage engine (`src/store/persistence.ts`).
  - **Status**: Completed. File-backed persistent storage engine (`data/runtime_store.json`) with auto-save, initial data bootstrap, disk flushing, and persistent sessions across restarts.
  - **Evidence Reference**: `AUDIT.md` (`volatile_in_memory_state`), `FUTURE_ARCHITECTURE.md` (Pillar 3 & 6).
  - **Priority**: Critical (Immediate) | **Difficulty**: Medium

- [x] **Task 1.2: Transactional Locking & Concurrency Control**
  - **Description**: Add optimistic locking or atomic database transactions around session state updates and action queue claiming.
  - **Status**: Completed. Added `version` field to `RuntimeSession` with optimistic concurrency validation on `updateSession()` and conflict rejection with 409 status on version mismatches.
  - **Evidence Reference**: `ARCHITECTURE.md` (`architecture_risks`).
  - **Priority**: High | **Difficulty**: Medium

- [x] **Task 1.3: Log Rotation & History Pagination**
  - **Description**: Add cursor-based / page-based pagination and retention policies for `/api/db/stats`, `events`, and `telemetry` endpoints.
  - **Status**: Completed. Integrated `page`, `limit`, and `session_id` query validation with pagination metadata (`total`, `has_more`), alongside bounded memory buffers for telemetry and events to avoid memory leaks.
  - **Evidence Reference**: `AUDIT.md` (`linear_search_performance`), `ACTION_PLAN.md` (`API Pagination`).
  - **Priority**: Medium | **Difficulty**: Easy

---

## 2. Security, Authentication & Input Validation

### [P0] Protect Administrative Endpoints & Add Access Control
- [x] **Task 2.1: Authentication & Authorization Middleware**
  - **Description**: Restrict sensitive endpoints (`/api/session/reset`, `/api/session/facts/override`, internal telemetry endpoints) behind API tokens or role-based auth middleware (`src/services/auth.ts`).
  - **Status**: Completed. `adminAuthMiddleware` checks `Authorization: Bearer <key>` or `X-Admin-Key` against `ADMIN_API_KEY` with graceful development mode fallback and access rejection.
  - **Evidence Reference**: `AUDIT.md` (`unauthenticated_admin_routes`), `ACTION_PLAN.md` (`Secure administrative endpoints`).
  - **Priority**: High | **Difficulty**: Easy

- [x] **Task 2.2: Strict Input Schema Validation (Zod/TypeBox)**
  - **Description**: Validate and sanitize all incoming payloads on `/api/session/input`, `/api/session/facts/override`, and `/api/session/replay` using Zod schemas (`src/services/validation.ts`).
  - **Status**: Completed. Strict Zod schemas enforce ISO date formats (`YYYY-MM-DD`), 24h time formats (`HH:MM`), integer ranges for `party_size` (1–50), sanitized phone numbers, and string length limits, returning structured 400 validation errors.
  - **Evidence Reference**: `AUDIT.md` (`missing_input_validation`), `ACTION_PLAN.md` (`Input validation for override endpoints`).
  - **Priority**: High | **Difficulty**: Easy

- [x] **Task 2.3: Rate Limiting & Abuse Prevention**
  - **Description**: Implement IP/client-based rate limiting on conversational input endpoints (`src/services/rateLimiter.ts`).
  - **Status**: Completed. Sliding-window rate limiter configured for 60 req/min per IP, returning `429 Too Many Requests` with `X-RateLimit-*` headers when exceeded.
  - **Evidence Reference**: `FUTURE_ARCHITECTURE.md` (Phase 4).
  - **Priority**: Medium | **Difficulty**: Easy

- [x] **Task 2.4: CORS & Security Headers**
  - **Description**: Apply standard HTTP security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection) and configure strict CORS policies in `server.ts`.
  - **Status**: Completed. Applied security headers and pre-flight OPTIONS handler.
  - **Priority**: Medium | **Difficulty**: Easy

---

## 3. Testing & Verification Suite

### [P0] Automated Test Pipeline Setup
- [x] **Task 3.1: Unit Testing State Transition Matrix (Vitest)**
  - **Description**: Set up Vitest and write comprehensive unit tests for `evaluateMissingFields`, intent parsing guards, and deterministic transition tables (`tests/stateMachine.test.ts`).
  - **Status**: Completed. 13 unit tests covering state transitions (`idle` -> `awaiting_date` -> `awaiting_time` -> `awaiting_contact_information` -> `awaiting_confirmation` -> `completed`), missing field evaluation, and heuristic regex parsing.
  - **Evidence Reference**: `AUDIT.md` (`missing_automated_tests`), `ACTION_PLAN.md` (`Create automated unit tests`).
  - **Priority**: High | **Difficulty**: Medium

- [x] **Task 3.2: API Integration & Idempotency Testing**
  - **Description**: Create integration tests for `/api/session/input`, `/api/session/facts/override`, and idempotency validation (`tests/api.test.ts`, `tests/validation.test.ts`).
  - **Status**: Completed. Automated tests verify full end-to-end conversation flows, fact updates, idempotency cache resolution, and schema rejection.
  - **Evidence Reference**: `MASTER_SPEC.md` (Section 1 Pillar 3).
  - **Priority**: High | **Difficulty**: Medium

- [x] **Task 3.3: Replay Consistency & Regression Test Suite**
  - **Description**: Build an automated regression test that verifies persistence and replay integrity (`tests/persistence.test.ts`).
  - **Status**: Completed. 4 tests validating session lifecycle, optimistic concurrency collision detection, event appending, and pagination.
  - **Evidence Reference**: `MASTER_SPEC.md` (Section 3).
  - **Priority**: Medium | **Difficulty**: Medium

---

## 4. Observability, Monitoring & Reliability

### [P1] Production Observability & Health Checks
- [x] **Task 4.1: Standardized Health & Readiness Probes**
  - **Description**: Implement `/api/health`, liveness (`/api/health/live`), and readiness (`/api/health/ready`) probes in `server.ts`.
  - **Status**: Completed. Liveness reports process PID and memory usage; readiness reports store state and Gemini client connectivity.
  - **Priority**: High | **Difficulty**: Easy

- [x] **Task 4.2: Structured JSON Logging & OpenTelemetry Tracing**
  - **Description**: Implement structured JSON logging (`src/services/logger.ts`) with contextual trace IDs, session IDs, and request correlation IDs.
  - **Status**: Completed. Formatted JSON logger supporting `INFO`, `WARN`, `ERROR`, and `DEBUG` levels with timestamp and duration metrics.
  - **Evidence Reference**: `FUTURE_ARCHITECTURE.md` (Phase 3).
  - **Priority**: Medium | **Difficulty**: Medium

- [x] **Task 4.3: Action Queue Dead-Letter Queue (DLQ) & Retry Policies**
  - **Description**: Enhance the background Action Queue worker (`src/services/actionWorker.ts`) with exponential backoff retries, max retry thresholds, and a Dead-Letter Queue (DLQ).
  - **Status**: Completed. ActionWorker tracks `retries`, `max_retries`, logs `ACTION_RETRIED` and `ACTION_DEAD_LETTER` events, and updates UI status to DLQ.
  - **Evidence Reference**: `MASTER_SPEC.md` (Section 1 Pillar 5).
  - **Priority**: High | **Difficulty**: Medium

- [x] **Task 4.4: Graceful Shutdown Lifecycle**
  - **Description**: Handle `SIGTERM` and `SIGINT` signals in `server.ts` to allow active action queue jobs to complete and flush persistence state cleanly before container termination.
  - **Status**: Completed. Server drains active ActionWorker jobs with timeout and calls `store.flushSync()` before exiting.
  - **Priority**: Medium | **Difficulty**: Easy

---

## 5. External Integrations & Connectors

### [P2] Live Provider Integrations
- [ ] **Task 5.1: Real Google Calendar / Booking API Connector**
  - **Description**: Replace the `CREATE_CALENDAR_EVENT` simulated worker with actual Google Calendar API / Cal.com OAuth or service account integration.
  - **Acceptance Criteria**:
    - Confirmed reservations generate real calendar events with proper timezone handling.
  - **Evidence Reference**: `PURPOSE.md`, `ACTION_PLAN.md` (`Configure real webhook or calendar triggers`).
  - **Priority**: Low | **Difficulty**: Hard

- [ ] **Task 5.2: Real SMS / Communication Gateway (Twilio / SendGrid)**
  - **Description**: Replace the `DISPATCH_CONFIRMATION` simulation with a live SMS/email dispatcher.
  - **Acceptance Criteria**:
    - Sends automated booking confirmation text to customer's phone number upon reaching `completed` state.
  - **Priority**: Low | **Difficulty**: Medium

---

## 6. Multi-Tenancy & Platform Capabilities

### [P3] Long-Term Platform Roadmap
- [ ] **Task 6.1: Multi-Tenant Workspace Partitioning**
  - **Description**: Add `tenant_id` / `business_id` scopes to all sessions, events, actions, and custom transition configurations.
  - **Acceptance Criteria**:
    - Multiple businesses can deploy customized receptionist personas and state machines with complete data isolation.
  - **Evidence Reference**: `FUTURE_ARCHITECTURE.md` (Phase 4).
  - **Priority**: Long-Term | **Difficulty**: Hard

- [ ] **Task 6.2: Vector Store Long-Term Customer Memory**
  - **Description**: Integrate vector retrieval to remember customer seating preferences, dietary restrictions, and historical bookings across distinct sessions.
  - **Acceptance Criteria**:
    - Receptionist automatically populates preferred party size or seating notes when a returning phone number is recognized.
  - **Evidence Reference**: `FUTURE_ARCHITECTURE.md` (Phase 2).
  - **Priority**: Long-Term | **Difficulty**: Hard

---

## Summary Matrix

| Category | Priority | Tasks | Status | Primary Benefit |
| :--- | :--- | :--- | :--- | :--- |
| **Storage & Persistence** | **P0 (Immediate)** | 1.1, 1.2, 1.3 | **100% Completed** | Prevents data loss on restart; eliminates concurrency races; paginated stats. |
| **Security & Validation** | **P0 (Immediate)** | 2.1, 2.2, 2.3, 2.4 | **100% Completed** | Blocks unauthorized overrides, invalid inputs, DoS attacks, and sets security headers. |
| **Testing & CI** | **P0 (Immediate)** | 3.1, 3.2, 3.3 | **100% Completed** | Prevents regression bugs in state machine & deterministic guards (30 Vitest tests passing). |
| **Observability & Reliability** | **P1 (High)** | 4.1, 4.2, 4.3, 4.4 | **100% Completed** | Production monitoring, liveness/readiness health checks, DLQ, & graceful shutdown. |
| **External Integrations** | **P2 (Medium)** | 5.1, 5.2 | Backlog | Connects real calendar & SMS dispatchers in place of simulations. |
| **Multi-Tenancy & Memory** | **P3 (Long-Term)** | 6.1, 6.2 | Backlog | Unlocks SaaS multi-tenancy and persistent customer memory. |
