# Production Readiness Roadmap & Task Registry (TODO.md)

This task backlog outlines the engineering steps required to transition the **Intent Runtime (AI Receptionist)** from a prototype/MVP into a hardened, production-ready enterprise application. Every item is grounded in the findings from `AUDIT.md`, `ACTION_PLAN.md`, `ARCHITECTURE.md`, and `FUTURE_ARCHITECTURE.md`.

---

## 1. Storage & Persistence Hardening

### [P0] Replace Volatile In-Memory Arrays with Durable Database
- [ ] **Task 1.1: Database Schema & Migration Strategy**
  - **Description**: Replace global `sessions`, `events`, `telemetry`, and `actionQueue` in-memory arrays in `server.ts` with a durable database (PostgreSQL via Cloud SQL or Google Cloud Firestore).
  - **Acceptance Criteria**:
    - State survives container recycles and process restarts without data loss.
    - Implement indexed queries for session lookups by `session_id`, `created_at`, and `status`.
  - **Evidence Reference**: `AUDIT.md` (`volatile_in_memory_state`), `FUTURE_ARCHITECTURE.md` (Pillar 3 & 6).
  - **Priority**: Critical (Immediate) | **Difficulty**: Medium

- [ ] **Task 1.2: Transactional Locking & Concurrency Control**
  - **Description**: Add optimistic locking or atomic database transactions around session state updates and action queue claiming.
  - **Acceptance Criteria**:
    - Simultaneous incoming messages for the same `session_id` cannot overwrite facts or produce race conditions during state transitions.
  - **Evidence Reference**: `ARCHITECTURE.md` (`architecture_risks`).
  - **Priority**: High | **Difficulty**: Medium

- [ ] **Task 1.3: Log Rotation & History Pagination**
  - **Description**: Add cursor-based pagination and retention policies for `/api/db/stats`, `events`, and `telemetry` endpoints.
  - **Acceptance Criteria**:
    - `/api/db/stats` loads bounded chunks (e.g. 50-100 records) with `limit` and `cursor` parameters.
    - Memory usage remains constant regardless of total session volume.
  - **Evidence Reference**: `AUDIT.md` (`linear_search_performance`), `ACTION_PLAN.md` (`API Pagination`).
  - **Priority**: Medium | **Difficulty**: Easy

---

## 2. Security, Authentication & Input Validation

### [P0] Protect Administrative Endpoints & Add Access Control
- [ ] **Task 2.1: Authentication & Authorization Middleware**
  - **Description**: Restrict sensitive endpoints (`/api/session/reset`, `/api/session/facts/override`, internal telemetry endpoints) behind API tokens or role-based auth middleware.
  - **Acceptance Criteria**:
    - Unauthenticated requests to administrative endpoints return `401 Unauthorized` or `403 Forbidden`.
    - Support configurable administrative keys (`ADMIN_API_KEY`) or JWT bearer tokens.
  - **Evidence Reference**: `AUDIT.md` (`unauthenticated_admin_routes`), `ACTION_PLAN.md` (`Secure administrative endpoints`).
  - **Priority**: High | **Difficulty**: Easy

- [ ] **Task 2.2: Strict Input Schema Validation (Zod/TypeBox)**
  - **Description**: Validate and sanitize all incoming payloads on `/api/session/input`, `/api/session/facts/override`, and `/api/replay`.
  - **Acceptance Criteria**:
    - Enforce date formats (`YYYY-MM-DD`), valid 24h/12h time strings (`HH:MM`), integer ranges for `party_size` (1–50), and phone number formats (E.164 standard).
    - Return structured `400 Bad Request` with field-level validation errors instead of corrupting runtime state.
  - **Evidence Reference**: `AUDIT.md` (`missing_input_validation`), `ACTION_PLAN.md` (`Input validation for override endpoints`).
  - **Priority**: High | **Difficulty**: Easy

- [ ] **Task 2.3: Rate Limiting & Abuse Prevention**
  - **Description**: Implement IP/client-based rate limiting (e.g., `express-rate-limit`) on conversational input endpoints.
  - **Acceptance Criteria**:
    - Protect Gemini API quota from denial-of-wallet / denial-of-service spam.
    - Return `429 Too Many Requests` with `Retry-After` headers when limits are exceeded.
  - **Evidence Reference**: `FUTURE_ARCHITECTURE.md` (Phase 4).
  - **Priority**: Medium | **Difficulty**: Easy

- [ ] **Task 2.4: CORS & Security Headers**
  - **Description**: Apply `helmet` middleware for standard HTTP security headers (CSP, HSTS, X-Content-Type-Options) and configure strict CORS policies.
  - **Acceptance Criteria**:
    - Disallow unauthorized cross-origin requests in production mode.
  - **Priority**: Medium | **Difficulty**: Easy

---

## 3. Testing & Verification Suite

### [P0] Automated Test Pipeline Setup
- [ ] **Task 3.1: Unit Testing State Transition Matrix (Vitest)**
  - **Description**: Set up Vitest and write comprehensive unit tests for `evaluateMissingFields`, intent parsing guards, and deterministic transition tables.
  - **Acceptance Criteria**:
    - Test all valid state transitions (`idle` -> `awaiting_date` -> `awaiting_time` -> `awaiting_contact_information` -> `awaiting_confirmation` -> `completed`).
    - Test edge cases: partial fact inputs, conflicting date formats, out-of-order intent submissions, and invalid field submissions.
  - **Evidence Reference**: `AUDIT.md` (`missing_automated_tests`), `ACTION_PLAN.md` (`Create automated unit tests`).
  - **Priority**: High | **Difficulty**: Medium

- [ ] **Task 3.2: API Integration & Idempotency Testing**
  - **Description**: Create integration tests for `/api/session/input`, `/api/session/facts/override`, `/api/replay`, and `/api/session/reset`.
  - **Acceptance Criteria**:
    - Verify that submitting duplicate `request_id` values reliably returns cached results without executing downstream transitions or side-effects.
  - **Evidence Reference**: `MASTER_SPEC.md` (Section 1 Pillar 3).
  - **Priority**: High | **Difficulty**: Medium

- [ ] **Task 3.3: Replay Consistency & Regression Test Suite**
  - **Description**: Build an automated regression test that plays recorded real-world conversation logs through `/api/replay` to verify zero state divergence across releases.
  - **Acceptance Criteria**:
    - Any breaking change in transition rules or entity extraction triggers a CI test failure with diff report.
  - **Evidence Reference**: `MASTER_SPEC.md` (Section 3).
  - **Priority**: Medium | **Difficulty**: Medium

---

## 4. Observability, Monitoring & Reliability

### [P1] Production Observability & Health Checks
- [ ] **Task 4.1: Standardized Health & Readiness Probes**
  - **Description**: Expand `/api/health` with detailed liveness (`/api/health/live`) and readiness (`/api/health/ready`) endpoints checking database connectivity and Gemini client health.
  - **Acceptance Criteria**:
    - Container orchestrators (Cloud Run / Kubernetes) can reliably probe app readiness before routing traffic.
  - **Priority**: High | **Difficulty**: Easy

- [ ] **Task 4.2: Structured JSON Logging & OpenTelemetry Tracing**
  - **Description**: Implement structured JSON logging (using `pino` or `winston`) with contextual trace IDs, session IDs, and request correlation IDs.
  - **Acceptance Criteria**:
    - Logs emit standardized fields (`timestamp`, `severity`, `session_id`, `trace_id`, `latency_ms`, `tokens_used`).
    - Ready for ingestion into Google Cloud Logging or Datadog.
  - **Evidence Reference**: `FUTURE_ARCHITECTURE.md` (Phase 3).
  - **Priority**: Medium | **Difficulty**: Medium

- [ ] **Task 4.3: Action Queue Dead-Letter Queue (DLQ) & Retry Policies**
  - **Description**: Enhance the background Action Queue worker with exponential backoff retries, max retry thresholds, and a Dead-Letter Queue (DLQ).
  - **Acceptance Criteria**:
    - Failed third-party integrations (e.g. timeout during calendar sync) retry up to 3 times before moving to `FAILED_PERMANENT` status with alerts.
  - **Evidence Reference**: `MASTER_SPEC.md` (Section 1 Pillar 5).
  - **Priority**: High | **Difficulty**: Medium

- [ ] **Task 4.4: Graceful Shutdown Lifecycle**
  - **Description**: Handle `SIGTERM` and `SIGINT` signals in `server.ts` to allow active action queue jobs to complete and close DB pools cleanly before container termination.
  - **Acceptance Criteria**:
    - No in-flight actions are terminated mid-execution during rolling deployments.
  - **Priority**: Medium | **Difficulty**: Easy

---

## 5. External Integrations & Connectors

### [P2] Live Provider Integrations
- [ ] **Task 5.1: Real Google Calendar / Booking API Connector**
  - **Description**: Replace the `CREATE_CALENDAR_EVENT` simulated `setTimeout` worker with actual Google Calendar API / Cal.com OAuth or service account integration.
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

| Category | Priority | Tasks | Primary Benefit |
| :--- | :--- | :--- | :--- |
| **Storage & Persistence** | **P0 (Immediate)** | 1.1, 1.2, 1.3 | Prevents data loss on restart; eliminates concurrency races. |
| **Security & Validation** | **P0 (Immediate)** | 2.1, 2.2, 2.3, 2.4 | Blocks unauthorized overrides, invalid inputs, and DoS attacks. |
| **Testing & CI** | **P0 (Immediate)** | 3.1, 3.2, 3.3 | Prevents regression bugs in state machine & deterministic guards. |
| **Observability & Reliability** | **P1 (High)** | 4.1, 4.2, 4.3, 4.4 | Enables production monitoring, health checks, DLQ & graceful shutdown. |
| **External Integrations** | **P2 (Medium)** | 5.1, 5.2 | Connects real calendar & SMS dispatchers in place of simulations. |
| **Multi-Tenancy & Memory** | **P3 (Long-Term)** | 6.1, 6.2 | Unlocks SaaS multi-tenancy and persistent customer memory. |
