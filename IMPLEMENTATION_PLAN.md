# Intent Runtime - Implementation Plan

## Goal
Generate measurable revenue from the AI Receptionist product before expanding platform capabilities.

---

## Phase 0 — Runtime Kernel (Current Implementation)
* **Goal**: Establish the deterministic kernel supporting state, facts, intents, actions, and immutable events.
* **Deliverables**:
  - Relational in-memory/persistent engine schema simulating PostgreSQL.
  - Active runtime session controller.
  - LLM integration for Intent Parsing and Fact Reconciliation (using `gemini-3.5-flash`).
  - Async Action execution queue simulating background workers.
  - Telemetry and prompt-version tracking.
* **Exit Criteria**: A workflow executes successfully: User Input ➔ Extracted Facts ➔ Parsed Intent ➔ Transition Matrix ➔ Background Action ➔ Immutable Log.

---

## Phase 1 — AI Receptionist Product
* **Goal**: Launch the AI Booking Receptionist on top of the runtime.
* **Features**:
  - Full-featured reservation workflow (guests, date, time, contact).
  - Mock third-party Calendar integration.
  - Real-time fact verification widgets.
* **Success Metric**: Confirmed reservation workflows completing with proper transition states and event persistency.

---

## Phase 2 — Runtime Hardening
* **Goal**: Build operational resilience.
* **Features**:
  - Retry policies for failed Actions.
  - Dead-Letter Queue (DLQ) viewer.
  - Session replay tool (rewind session state back using immutable events ledger).
  - Detailed prompt-version telemetry dashboard.

---

## Phase 3 — Product Expansion (Future)
* **Goal**: Leverage the identical Intent Runtime to support additional workflows without changing the code engine.
* **Candidate Products**:
  - Personal Chief of Staff
  - Mental Load OS
  - Elder Care Assistant
* **Constraint**: Must use the same state parser, action queue, and event store schema.

---

## Phase 4 — Platform Monetization (Future)
* **Goal**: Public API monetization.
* **Features**:
  - Multi-tenancy support.
  - API Metering & Usage limits.
  - Developer console.
