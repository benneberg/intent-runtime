# Intent Runtime - Master Specification

This is the authoritative build document for the Intent Runtime.

## 1. Core Architecture Pillars

The Intent Runtime is designed as a secure, deterministic engine built around six permanent pillars:

```
                  ┌────────────────────────┐
                  │    User Interaction    │
                  └───────────┬────────────┘
                              │
                    ┌─────────▼─────────┐
                    │ 1. Intent Parser  │
                    └─────────┬─────────┘
                              │ (Intents)
                              ▼
               ┌──────────────────────────────┐
               │ 2. Fact Reconciliation Engine│
               └──────────────┬───────────────┘
                              │ (Facts State)
                              ▼
                ┌────────────────────────────┐
                │   3. Session State Store   │
                └─────────────┬──────────────┘
                              │
                              ▼
              ┌──────────────────────────────┐
              │ 4. Deterministic State Machine│
              └──────────────┬───────────────┘
                              │
               ┌──────────────┴──────────────┐
               │                             │
               ▼                             ▼
       ┌───────────────┐             ┌───────────────┐
       │5. Action Queue│             │6. Event Store │
       └───────┬───────┘             └───────────────┘
               │ (Async Execution)
               ▼
       ┌───────────────┐
       │Worker / Effect│
       └───────────────┘
```

1. **Intent Parser**: Translates raw conversational text or interactions into typed intents.
2. **Fact Reconciliation Engine**: Processes input text and extracts factual key-values, reconciling them continuously with existing facts to prevent data duplication, override obsolete items, or detect anomalies.
3. **Session State Store**: Maintains user sessions, tracking current state, metadata, prompt telemetry, and transaction statuses.
4. **Deterministic State Machine**: A strict transition matrix utilizing state guards and explicit transition actions. Manages clarification states explicitly to avoid prompt-level ambiguity.
5. **Action Queue**: An asynchronous FIFO execution queue that triggers scheduled workflows or external notifications/webhooks decoupled from state updates.
6. **Event Store**: An immutable event ledger recording all system-wide occurrences (`INPUT_RECEIVED`, `FACTS_EXTRACTED`, `INTENT_PARSED`, `STATE_TRANSITION`, `ACTION_DISPATCHED`, `ACTION_COMPLETED`, etc.) to facilitate replay and auditing.

---

## 2. Updated Architectural Principles

### Runtime Philosophy
* **LLMs as Stateless Reasoning Engines**: Large Language Models must only extract facts, classify intents, generate structured responses, and propose state transitions. They are strictly forbidden from writing to databases, invoking third-party APIs, or updating core states directly.
* **Deterministic Transitions**: State changes can only happen through a hardcoded, deterministic state transition engine running inside the secure environment.
* **Idempotency**: All webhook state transitions and external requests must require a unique client-side `request_id` (UUID). If a request with the same ID has already completed, the cached execution result is returned immediately.
* **Async Side-Effects**: System and integration side-effects are pushed to a background Worker Queue. State transitions write the next action to the queue and immediately commit/respond, maintaining sub-second latency even if external integrations are slow.

---

## 3. Data Schema Specifications

The Intent Runtime represents data using the following models (implemented as SQLite/PostgreSQL-compatible relational collections):

### 3.1 Runtime Sessions (`runtime_sessions`)
Stores state, accumulated facts, active workflow context, and lock markers.
* `session_id`: UUID (Primary Key)
* `current_state`: VARCHAR(64) (e.g., `idle`, `awaiting_date`, `awaiting_time`, `awaiting_confirmation`, `awaiting_contact_information`, `completed`)
* `facts`: JSONB (Key-value store of reconciled facts, e.g., `{ "date": "2026-07-04", "time": "14:00", "guest_count": 3 }`)
* `created_at`: TIMESTAMPTZ
* `updated_at`: TIMESTAMPTZ

### 3.2 Runtime Events (`runtime_events`)
An immutable ledger capturing all system telemetry and execution replays.
* `event_id`: UUID (Primary Key)
* `session_id`: UUID (Foreign Key)
* `event_type`: VARCHAR(64) (e.g., `INPUT_RECEIVED`, `FACTS_EXTRACTED`, `INTENT_PARSED`, `STATE_TRANSITION`, `ACTION_DISPATCHED`, `ACTION_COMPLETED`, `ACTION_FAILED`)
* `payload`: JSONB (Contains the inputs, outputs, or error traces)
* `telemetry_metadata`: JSONB (Prompt performance details: latency, token counts)
* `created_at`: TIMESTAMPTZ

### 3.3 Prompt Version Ledger (`prompt_telemetry`)
Tracks model execution stats for traceability and observability.
* `id`: UUID (Primary Key)
* `provider`: VARCHAR(32) (e.g., `google`)
* `model`: VARCHAR(64) (e.g., `gemini-3.5-flash`)
* `prompt_version`: VARCHAR(16) (e.g., `v1.2.0`)
* `latency_ms`: INTEGER
* `input_tokens`: INTEGER
* `output_tokens`: INTEGER
* `created_at`: TIMESTAMPTZ

### 3.4 Action Queue (`action_queue`)
Asynchronous job queue to isolate transitions from slow integrations.
* `action_id`: UUID (Primary Key)
* `session_id`: UUID
* `action_type`: VARCHAR(64) (e.g., `DISPATCH_CONFIRMATION`, `CHECK_AVAILABILITY`, `CREATE_CALENDAR_EVENT`)
* `payload`: JSONB
* `status`: VARCHAR(32) (`pending`, `running`, `completed`, `failed`)
* `idempotency_key`: UUID (Unique request ID)
* `created_at`: TIMESTAMPTZ
* `updated_at`: TIMESTAMPTZ

---

## 4. Workflows & States (AI Receptionist)

The primary application target validating this runtime is the **AI Receptionist** (Restaurant / Office Booking Agent).

### 4.1 Transition Matrix
```
[idle] ──(Input: Request book)──> [validate_availability]
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼ (missing date)                                      ▼ (missing time)
     [awaiting_date]                                       [awaiting_time]
            │                                                     │
            └───────────────(Input: provide info)─────────────────┘
                                       │
                                       ▼
                             [awaiting_confirmation] ──(Confirm)──> [completed]
                                       │
                                       ▼ (Reject/Cancel)
                                    [idle]
```

### 4.2 Clarification States
To resolve prompt ambiguities, the state machine implements deterministic states:
* `awaiting_date`: Activates when date fact is missing.
* `awaiting_time`: Activates when time fact is missing.
* `awaiting_contact_information`: Activates when user name or phone is missing.
* `awaiting_confirmation`: Prompts the user with a recap of extracted facts for verbal/written booking verification.
