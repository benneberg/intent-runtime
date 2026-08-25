schema:
  version: 1
  compatible_with:
    - CCC
  generated_by: Repository Bootstrap Prompt
  generated_at: 2026-08-25T07:51:38-07:00
  repository: react-example

overview:
  value: "The Intent Runtime is a full-stack developer playground and execution kernel for an AI Receptionist system. It establishes a deterministic structure that wraps stateless LLM completions in formal state machines and event-sourced auditing logs."
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "MASTER_SPEC.md"
    - "server.ts"
    - "src/App.tsx"
  notes: ""

purpose:
  value: "To demonstrate and validate an AI orchestration pattern where the LLM behaves strictly as a stateless text parsing engine, while state machines, side-effect queues, and audit ledgers are handled natively by a secure, deterministic TypeScript runtime."
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "MASTER_SPEC.md Section 2 (Runtime Philosophy)"
  notes: ""

scope:
  value: "Covers the Core Kernel (Phase 0) and the primary product target, the AI Booking Receptionist (Phase 1). This includes conversational inputs, entity/fact extraction, intent parsing, deterministic transitions, automated background side-effects, immutable telemetry ledger, simulation tools, and real-time debugger controls."
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "IMPLEMENTATION_PLAN.md"
  notes: ""

capabilities:
  value:
    - "Intelligent Intent Parsing (REQUEST_BOOKING, PROVIDE_INFORMATION, CONFIRM, REJECT, CHITCHAT, OTHER)"
    - "Continuous Fact Reconciliation and merging (name, phone, date, time, party_size)"
    - "Idempotent processing via client-provided request keys"
    - "Asynchronous side-effect execution through a background Action Queue worker"
    - "Full-fidelity session audits using an immutable Event Store ledger"
    - "Real-time state and transition visualization with interactive SVGs"
    - "Dynamic facts override for simulation and manual testing"
    - "Fidelity discrepancy detection using replay state machine simulation"
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "server.ts API endpoints and helpers"
    - "src/App.tsx visual panels"
  notes: ""

verified_features:
  value:
    - "Main Dialogue Interaction Playground: allows conversing with the receptionist"
    - "Interactive State Transition Map: renders nodes and highlights the active state in real-time"
    - "Fact Reconciliation Engine widget: shows extracted fields and supports editing and overrides"
    - "Action Queue Monitor: lists pending, running, and completed jobs"
    - "Immutable Event Store log: lists historical system events"
    - "Prompt Telemetry Dashboard: shows latency, token usage, and provider"
    - "Workflow Replay Tool: performs side-by-side historical simulation of past sessions to flag errors"
    - "Idempotency Protection: rejects duplicate requests with matching request_id"
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "src/App.tsx components and buttons"
    - "server.ts route definitions"
  notes: ""

inferred_features:
  value:
    - "Local developer configuration overrides via .env file"
    - "Mock calendars and simulated messaging systems"
  evidence_state: INFERRED
  confidence: HIGH
  evidence:
    - "server.ts uses process.env.GEMINI_API_KEY and process.env.APP_URL"
    - "DISPATCH_CONFIRMATION and CREATE_CALENDAR_EVENT actions simulate external integrations using setTimeout delays"
  notes: ""

future_indicators:
  value:
    - "Production-grade database migration to PostgreSQL or Cloud Spanner"
    - "Multi-tenancy isolation and tenant limits"
    - "Analytical logging using ClickHouse or similar clusters"
    - "Vector storage memory fibers"
    - "Public API interfaces with usage metering"
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "FUTURE_ARCHITECTURE.md Deferred Platforms"
    - "IMPLEMENTATION_PLAN.md Phase 3 and 4 plans"
  notes: ""

technology_stack:
  value:
    - "Frontend Library: React 19 (package.json)"
    - "Frontend Bundler: Vite 6 (package.json)"
    - "Styling: Tailwind CSS 4 with @tailwindcss/vite integration (package.json, vite.config.ts)"
    - "Backend: Express 4 with tsx runtime (package.json, server.ts)"
    - "AI Engine: @google/genai SDK (package.json, server.ts)"
    - "Icons: lucide-react (package.json)"
    - "Animations: motion (package.json)"
    - "Bundler (Production Backend): esbuild (package.json)"
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "package.json dependencies and devDependencies"
  notes: ""

repository_structure:
  value:
    - "/package.json: Project configuration and dependency manifest"
    - "/tsconfig.json: TypeScript compiler configuration"
    - "/vite.config.ts: Vite configuration with Tailwind CSS plugins"
    - "/server.ts: Custom Express server and background worker simulation"
    - "/metadata.json: Platform specifications and capabilities"
    - "/MASTER_SPEC.md: Technical build design specification"
    - "/IMPLEMENTATION_PLAN.md: Multi-phase product roadmap"
    - "/FUTURE_ARCHITECTURE.md: Deferred architectural scope log"
    - "/src/main.tsx: Client entrypoint"
    - "/src/App.tsx: Main dashboard UI component"
    - "/src/index.css: Tailwind import stylesheet"
    - "/src/types.ts: Core TypeScript interface definitions"
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "Physical folder structures and files present in workspace"
  notes: ""

configuration:
  value:
    - "Environment variables loaded via dotenv from .env file"
    - "GEMINI_API_KEY: credentials for the server-side Gemini client (server.ts)"
    - "APP_URL: URL used for webhooks or self-reference"
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - ".env.example contents"
    - "server.ts load logic"
  notes: ""

build_process:
  value:
    - "Runs 'vite build' to compile static client assets into /dist"
    - "Bundles /server.ts using esbuild to produce a CommonJS output file at /dist/server.cjs"
    - "Command: npm run build"
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "package.json scripts.build definition"
  notes: ""

deployment:
  value: "Runs in serverless containers on Google Cloud Run. Port 3000 is used as ingress, routed through an nginx reverse proxy."
  evidence_state: INFERRED
  confidence: HIGH
  evidence:
    - "FUTURE_ARCHITECTURE.md describes deployment to Cloud Run"
    - "Environment runtime constraints"
  notes: ""

repository_boundaries:
  value:
    - "No persistent database drivers (PostgreSQL/SQLite) included in MVP; all state is stored in volatile server-side memory arrays."
    - "No user registration, authentication, or token exchange mechanisms implemented."
    - "Conversational capability is restricted strictly to the AI booking receptionist scenario."
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "server.ts in-memory lists"
    - "MASTER_SPEC.md Section 4 target application description"
  notes: ""

known_unknowns:
  value:
    - "Exact rate limits of the fallback simulation engine vs Gemini model capacity limits."
    - "How concurrent sessions or lock contentions are resolved in multi-tenant environments."
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "FUTURE_ARCHITECTURE.md outlines deferred multi-tenant scaling"
  notes: ""

confidence_summary:
  value: "HIGH. The codebase is self-contained, fully documented with local specs, runs on single-command builds, and matches the observed execution behavior."
  evidence_state: OBSERVED
  confidence: HIGH
  evidence: []
  notes: ""
