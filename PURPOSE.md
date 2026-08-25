# Product Purpose & Strategy — Intent Runtime

## Product Summary

The **Intent Runtime** is an execution kernel and developer dashboard designed for conversational AI receptionists (e.g., table booking and appointment scheduling). It decouples non-deterministic natural language reasoning (LLM) from deterministic state transitions, event auditing, and external side-effect execution.

Evidence:
* `metadata.json`: Name "Intent Runtime", Description "An interactive playground, visualization dashboard, and execution kernel for the Intent Runtime AI receptionist."
* `MASTER_SPEC.md`: "The Intent Runtime is built around six permanent architectural pillars, shifting the focus from isolated conversational logic to a robust, deterministic state machine powered by stateless LLM reasoning."

---

## Problem Statement

Stateless Large Language Models (LLMs) used directly in business workflows are prone to hallucinations, state skipping, or triggering unauthorized side-effects when tasked with managing complex multi-turn conversational transactions.

Evidence:
* `MASTER_SPEC.md` Section 2: "LLMs as Stateless Reasoning Engines: The LLM is strictly used as an analytical translation layer... It does not manage state, decide the active node directly, or execute arbitrary side-effects without state machine validation."

---

## Target Audience

AI System Engineers, AI Product Architects, and Developers designing, debugging, and auditing conversational booking and receptionist agents.

Evidence:
* `MASTER_SPEC.md` Sections 1 & 3: Details developer workflows, state machine transition matrices, telemetry monitors, and replay tools for diagnostic debugging.
* `src/App.tsx`: Multi-panel developer dashboard featuring raw telemetry traces, SVG state graphs, and live fact override controls.

---

## Value Proposition

1. **Deterministic Guarantees**: Natural language inputs are classified into structured intents and reconciled facts; transitions only occur when strict schema guards are satisfied.
2. **Auditability & Replayability**: Every transaction step is recorded to an immutable Event Store ledger, enabling point-in-time state machine replay and discrepancy detection.
3. **Decoupled Side-Effects**: Asynchronous background workers handle third-party integrations (e.g., calendar booking, SMS dispatch) with retry logic and idempotency keys, insulating conversational latency from external API slowness.
4. **Developer-in-the-Loop Debugging**: Live SVG state transition mapping and direct fact reconciliation overrides allow real-time diagnostic testing and scenario simulation.

Evidence:
* `MASTER_SPEC.md` Section 1 (Core Architecture Pillars)
* `server.ts` routes and processing logic

---

## Feature Registry

### Verified Features (Directly Executing in Codebase)

* **Dialogue Interaction Playground**: Conversational UI panel to test user inputs against the runtime (`src/App.tsx`).
* **Deterministic Transition Engine**: Evaluates state transitions (`idle` -> `awaiting_date` -> `awaiting_time` -> `awaiting_contact_information` -> `awaiting_confirmation` -> `completed`) with missing field guards (`server.ts`).
* **Fact Reconciliation Engine & Manual Overrides**: Displays extracted booking facts (`name`, `phone`, `date`, `time`, `party_size`) with an interactive editing modal and API endpoint (`POST /api/session/facts/override` in `server.ts` and `src/App.tsx`).
* **Interactive State Transition Map**: Real-time SVG visualization showing the active node and animated transition paths (`src/App.tsx`).
* **Immutable Event Store Viewer**: Chronological log of system events (`INPUT_RECEIVED`, `FACTS_EXTRACTED`, `INTENT_PARSED`, `STATE_TRANSITION`, `FACTS_OVERRIDDEN`, `ACTIONS_QUEUED`) (`src/App.tsx`, `server.ts`).
* **Action Queue Monitor**: Visual inspector for asynchronous side-effects (`DISPATCH_CONFIRMATION`, `CREATE_CALENDAR_EVENT`) tracking `pending`, `running`, and `completed` statuses (`src/App.tsx`, `server.ts`).
* **Prompt Telemetry Panel**: Metrics tracker logging latency, token consumption, and model provider (`src/App.tsx`, `server.ts`).
* **Workflow Replay & Discrepancy Detection**: Replay simulator comparing recorded historical events against state machine logic to flag execution anomalies (`POST /api/replay` in `server.ts`, `src/App.tsx`).
* **Idempotency Protection**: Rejection of duplicate client requests sharing identical `request_id` (`server.ts`).

### Inferred Features (Simulated with Rule-Based Fallbacks / Partially Implemented)

* **Heuristic Intent & Fact Fallback**: If `GEMINI_API_KEY` is not provided, uses deterministic regex and keyword extractors to simulate model responses without crashing (`server.ts`).
* **Simulated External Side-Effects**: Action queue worker simulates external calendar creation and SMS dispatch via `setTimeout` delays rather than real third-party API calls (`server.ts`).

### Future Features (Unimplemented Backlog / TODOs)

* **Persistent Database Adapters**: Migration from in-memory arrays to persistent cloud storage (Firestore / PostgreSQL / Cloud Spanner) (`FUTURE_ARCHITECTURE.md`).
* **Multi-Tenant Isolation**: Workspace tenancy, API keys, and rate limiters (`FUTURE_ARCHITECTURE.md`).
* **External Integration Connectors**: Live Twilio SMS and Google Calendar API dispatchers (`FUTURE_ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`).
* **Vector Store Long-Term Memory**: Retrieval-augmented memory for historical customer preferences across distinct sessions (`FUTURE_ARCHITECTURE.md`).
