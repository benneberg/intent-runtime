schema:
  version: 1
  compatible_with:
    - CCC
  generated_by: Repository Bootstrap Prompt
  generated_at: 2026-08-25T07:51:38-07:00
  repository: react-example

repository_type:
  value: WEB_APP
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "src/App.tsx containing full-stack playground and dashboard"
    - "package.json dependencies: express, react, @google/genai"
  notes: "The repository is a full-stack web application containing an Express server with a Vite React frontend."

repository_status:
  value: ACTIVE
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "Active code updates in server.ts and src/App.tsx"
    - "Active implementation of fact reconciliation manual overrides"
  notes: ""

complexity:
  value: MODERATE
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "Vite + React single-page frontend with state machines, telemetry visualization, and SVG transition diagrams"
    - "Express server with custom transition engine, in-memory state store, replay engine, action queue scheduler, and lazy Gemini client initialization"
  notes: ""

primary_language:
  value: TypeScript
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "package.json devDependencies containing typescript"
    - "tsconfig.json present in root"
    - "*.ts and *.tsx source files across server and client"
  notes: ""

secondary_languages:
  value:
    - HTML
    - CSS
    - JavaScript
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "index.html in root"
    - "src/index.css using Tailwind CSS"
    - "Compiled outputs in CommonJS (.cjs)"
  notes: ""

primary_framework:
  value: React
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "package.json dependencies: react, react-dom"
    - "vite.config.ts uses @tailwindcss/vite and @vitejs/plugin-react"
  notes: "Express is used for the backend server."

build_system:
  value: Vite
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "package.json build script: 'vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs'"
    - "vite.config.ts in root"
  notes: "Uses Vite for frontend compilation and esbuild for bundling the server."

package_manager:
  value: npm
  evidence_state: INFERRED
  confidence: HIGH
  evidence:
    - "package.json in root"
    - "bun.lock is present, but standard scripts run npm/node commands"
  notes: ""

test_framework:
  value: UNSET
  evidence_state: UNSET
  confidence: NONE
  evidence: []
  notes: "No test framework dependencies or scripts found in package.json."

workspace_or_single_repository:
  value: Single Repository
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "No workspaces array in package.json"
    - "Single root package.json"
  notes: ""

repository_maturity:
  value: PROTOTYPE
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "MASTER_SPEC.md and IMPLEMENTATION_PLAN.md describe this as the AI Receptionist MVP"
    - "Uses in-memory volatile data arrays (sessions, events, actionQueue) rather than persistent databases"
  notes: ""

overall_confidence:
  value: HIGH
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "Direct observation of all project files, configuration, and dependencies"
    - "Successful execution of build and lint steps"
  notes: ""

evidence_summary:
  value:
    - "package.json defining scripts, dependencies, devDependencies"
    - "MASTER_SPEC.md detailing architecture pillars and state machine specs"
    - "IMPLEMENTATION_PLAN.md tracking development phases"
    - "FUTURE_ARCHITECTURE.md logging deferred platform elements"
    - "server.ts providing API endpoints, state transition logic, and action queue scheduler"
    - "src/App.tsx providing UI dashboard, chat interface, SVG state diagram, and override controls"
  evidence_state: OBSERVED
  confidence: HIGH
  evidence: []
  notes: ""

unknown_areas:
  value:
    - "Production database credentials and configuration"
    - "Production CI/CD deployment pipeline configuration outside container ingress"
  evidence_state: OBSERVED
  confidence: HIGH
  evidence:
    - "FUTURE_ARCHITECTURE.md outlines deferred items"
  notes: ""
