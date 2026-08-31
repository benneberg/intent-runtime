***ARCHITECTURE.md***
# Intent Runtime Architecture
1. Purpose
Intent Runtime is a deterministic execution runtime for conversational booking workflows.
The system accepts conversational input, extracts booking information, reconciles that information with the current session, evaluates a deterministic workflow state, persists the resulting session and event data, and can dispatch asynchronous actions through a worker.
The central architectural boundary is:
Language-model or heuristic interpretation may propose structured information, but workflow state changes are decided by deterministic runtime code.
The current implementation is a TypeScript application with an Express/Vite server, a browser dashboard, file-backed persistence, deterministic workflow logic, and an asynchronous action worker.
----
2. High-level architecture
            ┌─────────────────────┐
            │   Browser / Client  │
            │  conversational UI  │
            └──────────┬──────────┘
                       │
                       ▼
            ┌─────────────────────┐
            │     HTTP Server     │
            │     server.ts       │
            │                     │
            │ validation          │
            │ authentication      │
            │ rate limiting       │
            │ session endpoints   │
            │ diagnostics         │
            └──────────┬──────────┘
                       │
                       ▼
            ┌─────────────────────┐
            │ Input interpretation│
            │                     │
            │ LLM when configured │
            │ heuristic fallback  │
            └──────────┬──────────┘
                       │
            intent + extracted facts
                       │
                       ▼
            ┌─────────────────────┐
            │ Deterministic       │
            │ Workflow Engine     │
            │                     │
            │ stateMachine.ts     │
            └───────┬─────┬───────┘
                    │     │
          session   │     │ events/actions
          state     │     │
                    ▼     ▼
            ┌──────────┐ ┌──────────────┐
            │Persistence│ │ Action Queue │
            │           │ │              │
            │sessions   │ │ async worker │
            │events     │ │ retries/DLQ  │
            │jobs       │ └───────┬──────┘
            └──────────┘         │
                                 ▼
                          External effects

The frontend is implemented under src/, while runtime services are under src/services and persistence is under src/store.
----
3. Runtime responsibilities
The runtime can be understood as five primary responsibilities.
3.1 HTTP/API boundary
server.ts is the main application boundary.
It exposes HTTP endpoints for:
•  health and readiness checks
•  conversational session input
•  administrative fact overrides
•  session reset
•  replay
•  persistence/database statistics
The HTTP layer is also responsible for concerns such as request validation, authentication for administrative operations, rate limiting, and error handling.
The API boundary should not contain the core workflow rules. Those rules belong in the deterministic services.
3.2 Input interpretation
Conversational input is converted into structured information before the workflow engine evaluates the next state.
The repository currently supports two interpretation paths:
1.  Gemini-based interpretation when GEMINI_API_KEY is configured.
2.  Deterministic heuristic parsing when the model is unavailable or no API key is configured.
The heuristic implementation can recognize intents such as:
•  REQUEST_BOOKING
•  CONFIRM
•  REJECT
•  CHITCHAT
•  PROVIDE_INFORMATION
and extracts booking facts such as:
•  date
•  time
•  party size
•  name
•  phone
The interpretation layer produces structured data. It does not itself decide the authoritative workflow state.
----
4. Booking facts and session state
A session contains the current workflow state together with accumulated booking facts and runtime metadata.
The current booking workflow uses facts including:
•  date
•  time
•  party_size
•  name
•  phone
The runtime evaluates these facts when deciding which clarification state is required.
A missing party size currently defaults to 2.
The distinction between facts and state is important:
Facts:
date = 2026-...
time = 19:00
party_size = 4
name = ...
phone = ...
State:
awaiting_confirmation
Facts describe what is known about the booking.
State describes what the workflow requires next.
----
5. Deterministic workflow engine
The workflow engine is implemented in:
src/services/stateMachine.ts
It contains the authoritative transition logic for the current booking workflow.
The workflow states are:
•  idle
•  awaiting_date
•  awaiting_time
•  awaiting_contact_information
•  awaiting_confirmation
•  completed
The transition logic evaluates:
current state
+
intent
+
merged facts
+
newly extracted facts
│
▼
next state
Current transition behavior
                 booking request
                       │
                       ▼
                    idle
                       │
                       ▼
             evaluate missing facts
                 │    │    │
      missing date   │    │
            │         │    │
            ▼         │    │
      awaiting_date   │    │
                      │    │
               missing time
                      │
                      ▼
               awaiting_time
                           │
                   missing contact
                           │
                           ▼
            awaiting_contact_information
                           │
                 all required facts
                           │
                           ▼
               awaiting_confirmation
                      │       │
                 confirm     reject
                      │       │
                      ▼       ▼
                 completed   idle

The exact transition implementation is in stateMachine.ts; it also generates the current deterministic conversational response for each state.
Architectural rule
The state machine is the authority for workflow transitions.
An LLM must not directly mutate the workflow state.
----
6. Fact reconciliation
Newly extracted facts are merged with facts already associated with the session before the next state is evaluated.
This allows a conversation such as:
User: "Book a table for four."
Facts:
party_size = 4
State:
awaiting_date
followed by:
User: "Tomorrow at seven."
New facts:
date = ...
time = 19:00
Merged facts:
party_size = 4
date = ...
time = 19:00
State:
awaiting_contact_information
Administrative fact overrides are also supported through the API.
Fact reconciliation is therefore part of the runtime's deterministic control path rather than being left entirely to the language model.
----
7. Persistence
Persistence is implemented in:
src/store/persistence.ts
The current repository uses a file-backed persistence implementation.
This is an important distinction from the older architecture specification.
The previous MASTER_SPEC.md describes SQLite/PostgreSQL-compatible relational collections. That is not the architecture that should be documented here unless and until such a persistence backend is actually implemented.
The persistence layer is responsible for maintaining runtime data such as:
•  sessions
•  session facts/state
•  events
•  action queue jobs
•  runtime statistics
The persistence implementation also supports versioning/concurrency-related behavior used by the runtime.
Architectural rule
Application services should use the persistence abstraction rather than directly managing serialized storage.
----
8. Event history and replay
Runtime activity is recorded as events associated with sessions.
Events provide a history of what happened during execution and are used by the replay functionality.
Replay re-executes recorded session information through the deterministic workflow logic so that state transitions can be inspected independently of the original conversational execution.
This makes the event history useful for:
•  debugging
•  diagnostics
•  workflow verification
•  auditing
•  investigating unexpected transitions
Replay should remain deterministic: the purpose is to reproduce workflow decisions rather than introduce new nondeterministic behavior.
----
9. Asynchronous actions
The asynchronous action worker is implemented in:
src/services/actionWorker.ts
Actions are separated from the synchronous state transition path.
Conceptually:
workflow transition
│
├── persist state
│
└── enqueue action
│
▼
background worker
│
┌──────┴──────┐
│             │
success        failure
│             │
▼             ▼
completed       retry
│
retry exhausted
│
▼
DLQ
This separation prevents external side effects from becoming part of the critical synchronous workflow transition.
The worker is responsible for processing queued actions, retry behavior, and failed-job handling.
----
10. Validation, authentication and rate limiting
Security and request-boundary concerns are implemented separately from the workflow engine.
Relevant services include:
src/services/validation.ts
src/services/auth.ts
src/services/rateLimiter.ts
The architectural boundary is:
HTTP request
│
▼
validation
│
▼
authentication / authorization where required
│
▼
rate limiting
│
▼
runtime operation
Administrative operations such as fact overrides and session resets require additional authorization.
These protections belong at the API boundary and should not be duplicated inside the state machine.
----
11. Frontend and telemetry dashboard
The frontend is implemented under:
src/
with the main application entry points including:
src/App.tsx
src/main.tsx
src/types.ts
The frontend provides the interactive runtime dashboard and conversational testing interface.
It consumes the HTTP API rather than becoming a second implementation of the workflow engine.
The browser should therefore be treated as a presentation and interaction layer.
The server remains authoritative for:
•  session state
•  fact state
•  workflow transitions
•  persistence
•  action processing
----
12. Testing architecture
The repository currently has four primary test areas:
tests/api.test.ts
tests/persistence.test.ts
tests/stateMachine.test.ts
tests/validation.test.ts
These correspond to the major runtime boundaries:
•  API
•  Persistence
•  Deterministic workflow
•  Validation
The state machine tests are particularly important because deterministic transition behavior is a core architectural invariant.
Changes to workflow states or transition rules should update these tests together with the implementation.
----
13. Architectural invariants
The following rules are more important than the names of individual modules.
Invariant 1 — Workflow state is deterministic
The next workflow state must be determined by explicit runtime logic.
Invariant 2 — LLM output is not authoritative state
Model output can provide structured intent/facts, but the runtime decides whether and how those inputs affect state.
Invariant 3 — External side effects are asynchronous
External work should be represented as actions rather than blocking the core state transition.
Invariant 4 — Session state is persisted
The runtime must not depend solely on process memory for the authoritative session state.
Invariant 5 — Runtime activity is observable
Important execution events should remain inspectable through persisted event history and diagnostics.
Invariant 6 — API boundaries validate input
Untrusted HTTP input must be validated before it reaches runtime operations.
Invariant 7 — Administrative operations are protected
Operations that can directly modify or reset runtime state require authorization.
----
14. Current implementation boundaries
The repository currently has these major code boundaries:
File	Responsibility
`server.ts`	API/application boundary
`src/services/stateMachine.ts`	deterministic workflow logic
`src/services/validation.ts`	request validation
`src/services/auth.ts`	administrative authorization
`src/services/rateLimiter.ts`	request throttling
`src/services/actionWorker.ts`	asynchronous action processing
`src/store/persistence.ts`	runtime persistence
`src/types.ts`	shared runtime types
`src/App.tsx`	frontend application
These boundaries should be preferred over introducing additional architectural layers without a concrete need.
----
15. What this document deliberately does not contain
This document describes the current architecture.
It does not contain:
•  a roadmap
•  a TODO list
•  implementation phases
•  completed work history
•  repository assessments
•  AI-generated repository metadata
•  speculative future technologies
•  historical architecture proposals
Those belong elsewhere.
Current work belongs in GitHub Issues.
Historical information belongs in Git history.
Future architecture should only be documented here once it becomes the actual implemented architecture.
----
16. Keeping this document current
ARCHITECTURE.md should be updated when a change modifies an architectural boundary or invariant.
Examples:
•  replacing the persistence backend
•  changing the workflow state model
•  introducing a new authoritative runtime service
•  changing how external actions are executed
•  changing the API/runtime boundary
•  changing the authority relationship between LLM output and runtime state
Routine implementation changes do not require an architecture update.
The goal is to keep this document small enough that it can realistically remain authoritative.
----
