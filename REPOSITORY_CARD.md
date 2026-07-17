schema:
 version: 1
 compatible_with:
   - CCC
 generated_by: Repository Bootstrap Prompt
 generated_at: 2026-07-17T01:39:42-07:00
 repository: react-example

name:
 value: Intent Runtime
 evidence_state: OBSERVED
 confidence: HIGH
 evidence:
   - "metadata.json field 'name'"
   - "MASTER_SPEC.md title"
 notes: ""

short_description:
 value: "An interactive playground, visualization dashboard, and execution kernel for the Intent Runtime AI receptionist."
 evidence_state: OBSERVED
 confidence: HIGH
 evidence:
   - "metadata.json field 'description'"
 notes: ""

category:
 value: AI Developer Tools
 evidence_state: INFERRED
 confidence: HIGH
 evidence:
   - "MASTER_SPEC.md describes Core Architecture Pillars of Intent Runtime"
   - "Playground, dashboard, and execution kernel features"
 notes: ""

repository_type:
 value: WEB_APP
 evidence_state: OBSERVED
 confidence: HIGH
 evidence:
   - "React single-page application and custom Express API server"
 notes: "Also serves as a full-stack SERVICE."

repository_status:
 value: ACTIVE
 evidence_state: OBSERVED
 confidence: HIGH
 evidence:
   - "Successful build pipeline"
   - "Active development on the codebase"
 notes: ""

complexity:
 value: MODERATE
 evidence_state: OBSERVED
 confidence: HIGH
 evidence:
   - "Multi-panel UI layout"
   - "Custom replay parser, event sourcing, action queue worker simulation"
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
   - "vite.config.ts configuration"
 notes: ""

problem_solved:
 value: "Provides a structured, deterministic runtime container for stateless LLMs to safely handle reservation state transitions and factual entity extraction without risk of API-level hallucinations or invalid state jumps."
 evidence_state: OBSERVED
 confidence: HIGH
 evidence:
   - "MASTER_SPEC.md Section 2 - Runtime Philosophy: 'LLMs as Stateless Reasoning Engines'"
   - "Deterministic Transitions logic"
 notes: ""

target_audience:
 value: "AI System Engineers, AI Product Architects, and Developers designing complex conversational receptionists or business agents."
 evidence_state: INFERRED
 confidence: HIGH
 evidence:
   - "MASTER_SPEC.md goals and architectural pillars"
   - "Diagnostic panels, telemetry, event logs, replay dashboard in App.tsx"
 notes: ""

primary_users:
 value: "Developers and auditors testing conversational logic, monitoring AI prompt performance, or auditing discrepancies via replay step simulations."
 evidence_state: INFERRED
 confidence: HIGH
 evidence:
   - "App.tsx visual panels: Dialogue Trace, Event Store Log, Telemetry, Replay"
 notes: ""

unique_characteristics:
 value:
   - "6-pillar architecture structure"
   - "Deterministic state transitions decoupled from conversational reasoning"
   - "Immutable event ledger that supports state replays"
   - "Monochromatic high-contrast dark visual theme with bright orange (#FF5F1F) accents"
   - "Live interactive SVG state transition diagram"
   - "Editable Fact Reconciliation panel with manual overrides for debugging"
 evidence_state: OBSERVED
 confidence: HIGH
 evidence:
   - "MASTER_SPEC.md architecture description"
   - "src/App.tsx visual layout"
   - "server.ts manual override endpoint and events array push"
 notes: ""

primary_entry_points:
 value:
   - server.ts
   - src/main.tsx
   - src/App.tsx
 evidence_state: OBSERVED
 confidence: HIGH
 evidence:
   - "package.json dev, build, and start scripts"
   - "index.html imports src/main.tsx"
 notes: ""

current_state:
 value: "Fully operational Phase 0 and 1 MVP containing the execution kernel, live playground interface, telemetry logs, interactive transition mapping, action dispatcher simulation, and manual override capabilities."
 evidence_state: OBSERVED
 confidence: HIGH
 evidence:
   - "IMPLEMENTATION_PLAN.md Phase 0 and 1 specifications"
   - "Active code implementation of these features in server.ts and App.tsx"
 notes: ""

key_risks:
 value:
   - "In-memory database simulation resets session data on node restart"
   - "Lack of native multi-tenancy in prototype"
   - "Network latency or potential rate limits during external Gemini client execution (mitigated by simulation fallback)"
 evidence_state: OBSERVED
 confidence: HIGH
 evidence:
   - "FUTURE_ARCHITECTURE.md deferral list (Vector databases, Kubernetes, multi-tenancy)"
   - "server.ts getGeminiClient fallback heuristic mode"
 notes: ""

overall_confidence:
 value: HIGH
 evidence_state: OBSERVED
 confidence: HIGH
 evidence:
   - "Verified through direct code inspections and successful workspace lints/compiles"
 notes: ""
