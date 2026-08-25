schema:
  version: 1
  compatible_with:
    - CCC
  generated_by: Repository Bootstrap Prompt
  generated_at: 2026-08-25T07:51:38-07:00
  repository: react-example

repository_summary:
  value: "The Intent Runtime is an interactive MVP full-stack dashboard and execution kernel for an AI Receptionist system. It demonstrates a deterministic state wrapper around stateless LLM entities, with live status visualization, replay audit engines, and manual overrides."
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "MASTER_SPEC.md"
    - "server.ts"
  notes: ""

technology_summary:
  value: "Full-stack application utilizing React 19, Vite 6, Tailwind CSS v4, Express 4, and the Google GenAI SDK. TypeScript is used across both frontend and backend."
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "package.json dependencies"
  notes: ""

architecture_summary:
  value: "Built as an event-sourced architecture with an in-memory session database, deterministic transition engines, and a background action worker simulator. Decoupled from conversational logic to prevent model hallucinations from affecting core reservation states."
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "ARCHITECTURE.md"
  notes: ""

coding_patterns:
  value:
    - "Lazy initialization of Google GenAI SDK Client to prevent container crashes when GEMINI_API_KEY is unset."
    - "Seamless fallback to deterministic rule heuristic parsing if Gemini is unconfigured."
    - "Symmetrical simulation logic used by both main runtime processor and the replay engine to find state discrepancies."
    - "Immutable event ledger appends on every system-wide trigger."
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "server.ts getGeminiClient initialization, input handler, and replay route"
  notes: ""

naming_patterns:
  value:
    - "camelCase for React states and components (e.g. isEditingFacts, editedFacts)."
    - "snake_case for API route inputs, payloads, types, and schema attributes (e.g. session_id, party_size, current_state)."
    - "UPPERCASE for event types (e.g. INPUT_RECEIVED, STATE_TRANSITION, FACTS_OVERRIDDEN) and action schemas."
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "src/types.ts"
    - "server.ts routes"
  notes: ""

important_conventions:
  value:
    - "Direct styling using Tailwind utility classes exclusively (no custom CSS or styled-components)."
    - "Icons imported exclusively from 'lucide-react'."
    - "Mock execution timeouts (1500ms) simulating slow network connections for background workers."
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "src/App.tsx styling and imports"
    - "server.ts setTimeout inside processActionQueue"
  notes: ""

critical_files:
  value:
    - "server.ts: backend server containing execution paths, scheduler, and fallback logic"
    - "src/App.tsx: main frontend SPA implementing the interactive dashboard, dialogues, map, and override edits"
    - "src/types.ts: schema definitions of session models, events, actions, and UI message items"
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "Workspace directory inspection"
  notes: ""

primary_entry_points:
  value:
    - "Backend Server: server.ts"
    - "Frontend Launcher: src/main.tsx"
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "package.json scripts"
  notes: ""

dangerous_areas:
  value:
    - "Volatile Memory Storage: Reboots of the server wipe all session data, queues, and logs instantly."
    - "Unvalidated Overrides: Direct mutating endpoint (/api/session/facts/override) accepts inputs without structural sanitization."
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "server.ts global state variables and override API route"
  notes: ""

files_likely_to_change:
  value:
    - "src/App.tsx: Adding UI features or layout tabs"
    - "server.ts: Adding backend capabilities, persistent database drivers, or schema validations"
    - "src/types.ts: Defining new states, event types, or action items"
  evidence_state: INFERRED
  confidence: HIGH
  evidence:
    - "App.tsx and server.ts development history"
  notes: ""

generated_files:
  value:
    - "/REPOSITORY_CLASSIFICATION.md"
    - "/REPOSITORY_CARD.md"
    - "/REPOSITORY.md"
    - "/ARCHITECTURE.md"
    - "/BOOTSTRAP_CONTEXT.md"
    - "/AUDIT.md"
    - "/ACTION_PLAN.md"
    - "/README.md"
    - "/BOOTSTRAP_METADATA.md"
    - "/PURPOSE.md"
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "Files created during bootstrap prompt execution"
  notes: ""

repository_gaps:
  value:
    - "Persistent databases (No disk writing or SQL integrations exist in the current MVP)."
    - "Real calendars or texting integrations (Uses slow worker timeouts to simulate side-effects instead)."
    - "User accounts and authentication security."
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "FUTURE_ARCHITECTURE.md"
    - "server.ts"
  notes: ""

known_unknowns:
  value:
    - "Performance scaling bottlenecks of global array filters as logs and events grow larger in runtime."
  evidence_state: INFERRED
  confidence: HIGH
  evidence:
    - "server.ts lacks indexing or log rotation strategies"
  notes: ""

overall_confidence:
  value: HIGH
  evidence_state: OBSERVED
  confidence: HIGH
  evidence: []
  notes: ""
