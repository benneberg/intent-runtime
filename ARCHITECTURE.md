schema:
  version: 1
  compatible_with:
    - CCC
  generated_by: Repository Bootstrap Prompt
  generated_at: 2026-08-25T07:51:38-07:00
  repository: react-example

architecture_style:
  value: "Event-Sourced Deterministic State Machine with Stateless LLM Integration"
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "MASTER_SPEC.md Section 1 - Core Architecture Pillars"
    - "server.ts processing pipeline writing to events store"
  notes: ""

major_components:
  value:
    - "1. Intent Parser: Decoupled intent determination via Gemini or heuristics"
    - "2. Fact Reconciliation Engine: Continuously merges facts with history and supports override endpoint"
    - "3. Session State Store: In-memory storage tracker for sessions and parameters"
    - "4. Deterministic State Machine: Structured transition guards and next-state selectors"
    - "5. Action Queue: Background asynchronous FIFO job runner for side-effects"
    - "6. Event Store: Immutable event ledger tracking every transaction step"
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "MASTER_SPEC.md Section 1"
    - "server.ts arrays: sessions, events, telemetry, actionQueue"
  notes: ""

responsibilities:
  value:
    - "Vite React Dashboard: Renders active state highlight on SVG map, dialogues, event logs, and override options"
    - "Express Application: Serves HTTP API endpoints, manages in-memory DB instances, and runs continuous scheduler loop"
    - "Gemini client: Provides stateless parsing context to map inputs into structured JSON"
    - "Background Worker: Simulates slow APIs with safe locks and transitions"
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "src/App.tsx frontend views"
    - "server.ts API handlers and processActionQueue interval"
  notes: ""

dependency_flow:
  value:
    - "React App.tsx -> HTTP APIs -> Express server.ts"
    - "Express server.ts -> GoogleGenAI SDK -> Gemini model"
    - "All TS source components -> types.ts"
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "Imports inside server.ts, App.tsx, types.ts"
  notes: ""

data_flow:
  value:
    - "1. User Input: typed in dashboard -> sent to /api/session/input -> server.ts pushes 'INPUT_RECEIVED' event."
    - "2. Analysis: Input text is sent to Gemini/simulation -> outputs structured intent + confidence + facts."
    - "3. Reconciliation: Extracted facts are merged with active session. /api/session/facts/override endpoint overrides facts directly."
    - "4. Transitions: Machine evaluates missing facts -> transitions state -> writes 'STATE_TRANSITION' event."
    - "5. Side-effects: If target state is met, pushes jobs to Action Queue."
    - "6. Worker: Scheduler checks Action Queue -> locks state to 'running' -> runs simulator -> resolves status."
    - "7. Client Sync: Dashboard polling fetches updated stats and rerenders the interface."
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "server.ts processing logic inside POST /api/session/input and processActionQueue"
  notes: ""

source_of_truth:
  value: "Volatile in-memory runtime arrays (sessions, events, telemetry, actionQueue) residing in the Node.js server process memory space."
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "server.ts variables initialized on lines 54-57"
  notes: "Does not persist to disk across process restarts."

entry_points:
  value:
    - "Frontend: /src/main.tsx (Vite SPA launcher)"
    - "Backend: /server.ts (Express API and asset service)"
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "package.json dev, build, and start scripts"
  notes: ""

external_systems:
  value:
    - "Google Gemini API (Accessed via @google/genai package)"
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "server.ts: new GoogleGenAI(...)"
  notes: "Falls back seamlessly to deterministic rule simulation if credentials are unset."

extension_points:
  value:
    - "State guards inside server.ts evaluateMissingFields"
    - "State enum cases in types.ts and server.ts processing pipeline"
    - "Action integration execution blocks inside processActionQueue"
    - "Database adapters to swap in-memory arrays for persistent database connectors"
  evidence_state: INFERRED
  confidence: HIGH
  evidence:
    - "Structure of evaluateMissingFields in server.ts"
    - "Express router design in server.ts"
  notes: ""

configuration:
  value:
    - "Environment file (.env) tracking GEMINI_API_KEY and APP_URL"
    - "Port 3000 configuration mapped in server.ts"
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "server.ts lines 20-23"
  notes: ""

constraints:
  value:
    - "Single port entry (Port 3000 only) enforced by container proxy layer"
    - "React 19 and Tailwind CSS v4 setup"
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "package.json dependencies"
  notes: ""

architecture_risks:
  value:
    - "Data Loss: Server restarts wipe all sessions, events, queue items, and history since no database engine is attached."
    - "Concurrency Races: In-memory arrays have no locking or database transactions, leading to potential corruption if concurrent requests arrive for the same session."
    - "Lack of Validation: Fact overrides bypass model confirmation, which might lead to inconsistent custom states if fields are filled with invalid data."
  evidence_state: INFERRED
  confidence: HIGH
  evidence:
    - "In-memory database implementation in server.ts"
  notes: ""

improvement_opportunities:
  value:
    - "1. Persist data: Implement a persistent database adapter using Firestore or Cloud SQL."
    - "2. Add schema validation: Use zod to validate overriden or extracted facts before applying transitions."
    - "3. Custom action triggers: Allow defining action integrations (like Slack, Webhooks) directly in the UI dashboard."
  evidence_state: INFERRED
  confidence: HIGH
  evidence:
    - "Current types in src/types.ts and server.ts"
  notes: ""

unknown_areas:
  value:
    - "Expected behavior of in-memory array search when event counts exceed several thousand records."
  evidence_state: OBSERVED
  confidence: MEDIUM
  evidence:
    - "No array slice limits or indexes are implemented on global database searches in server.ts"
  notes: ""
