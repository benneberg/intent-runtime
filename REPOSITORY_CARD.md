schema:
  version: 1
  compatible_with:
    - CCC
  generated_by: Repository Bootstrap Prompt
  generated_at: 2026-08-25T07:51:38-07:00
  repository: react-example

name:
  value: Intent Runtime
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "metadata.json name field"
    - "MASTER_SPEC.md header"
  notes: ""

short_description:
  value: "An interactive playground, visualization dashboard, and execution kernel for the Intent Runtime AI receptionist."
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "metadata.json description field"
  notes: ""

category:
  value: AI Developer Tools
  evidence_state: INFERRED
  confidence: HIGH
  evidence:
    - "MASTER_SPEC.md Section 1 - Core Architecture Pillars of Intent Runtime"
    - "Playground, dashboard, telemetry, and execution kernel features"
  notes: ""

repository_type:
  value: WEB_APP
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "React single-page application with Express backend API server"
  notes: ""

repository_status:
  value: ACTIVE
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "Successful build and lint execution"
    - "Active repository development"
  notes: ""

complexity:
  value: MODERATE
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "Multi-panel dashboard interface"
    - "Deterministic state machine, replay engine, event sourcing, action queue worker simulation"
  notes: ""

primary_technologies:
  value:
    - TypeScript
    - React 19
    - Express 4
    - Vite 6
    - Tailwind CSS 4
    - "@google/genai SDK"
    - Motion (motion/react)
    - Lucide Icons
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "package.json dependencies"
    - "vite.config.ts"
  notes: ""

problem_solved:
  value: "Wraps stateless LLM reasoning within a deterministic state machine and immutable event ledger to prevent conversational AI hallucinations from causing invalid state transitions or unverified side-effects during booking workflows."
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "MASTER_SPEC.md Section 2 (Runtime Philosophy)"
  notes: ""

target_audience:
  value: "AI System Engineers, AI Product Architects, and Developers building and auditing conversational agent state machines."
  evidence_state: INFERRED
  confidence: HIGH
  evidence:
    - "MASTER_SPEC.md architectural pillars"
    - "Diagnostic tools, telemetry views, event logs, replay dashboard in src/App.tsx"
  notes: ""

primary_users:
  value: "Developers and auditors testing conversational logic, monitoring AI prompt performance, inspecting state transitions, or auditing historical dialogues via replay simulation."
  evidence_state: INFERRED
  confidence: HIGH
  evidence:
    - "App.tsx visual panels: Dialogue Trace, Event Store Log, Telemetry, Replay"
  notes: ""

unique_characteristics:
  value:
    - "6-pillar architecture structure"
    - "Deterministic state transitions decoupled from conversational reasoning"
    - "Immutable event ledger that supports state replays and discrepancy detection"
    - "Live interactive SVG state transition diagram"
    - "Editable Fact Reconciliation panel with manual overrides for debugging"
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "MASTER_SPEC.md architecture description"
    - "src/App.tsx visual layout"
    - "server.ts manual override and replay endpoints"
  notes: ""

primary_entry_points:
  value:
    - server.ts
    - src/main.tsx
    - src/App.tsx
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "package.json scripts"
    - "index.html imports src/main.tsx"
  notes: ""

current_state:
  value: "Operational Phase 0 and Phase 1 MVP containing the execution kernel, live playground interface, telemetry logs, interactive SVG transition map, action dispatcher simulation, and manual fact override capabilities."
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "IMPLEMENTATION_PLAN.md Phase 0 and 1 specifications"
    - "Implementation of features in server.ts and src/App.tsx"
  notes: ""

key_risks:
  value:
    - "Volatile in-memory database simulation destroys session data upon server restart"
    - "Absence of multi-tenancy isolation in prototype"
    - "External Gemini API rate limits or latency (mitigated by deterministic heuristic fallback)"
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "FUTURE_ARCHITECTURE.md deferral list"
    - "server.ts in-memory arrays and getGeminiClient fallback"
  notes: ""

overall_confidence:
  value: HIGH
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "Complete code inspection and verified successful compilation"
  notes: ""
