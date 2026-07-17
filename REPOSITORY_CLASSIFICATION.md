schema:
 version: 1
 compatible_with:
   - CCC
 generated_by: Repository Bootstrap Prompt
 generated_at: 2026-07-17T01:39:42-07:00
 repository: react-example

repository_type:
 value: WEB_APP
 evidence_state: OBSERVED
 confidence: HIGH
 evidence:
   - "src/App.tsx containing full-stack playground and dashboard"
   - "package.json dependencies: express, react, @google/genai"
 notes: "The repository is a full-stack web application containing a custom Express server with Vite React frontend."

repository_status:
 value: ACTIVE
 evidence_state: OBSERVED
 confidence: HIGH
 evidence:
   - "Recent edits in server.ts and src/App.tsx in 2026"
   - "Active development of 'Fact Reconciliation Engine' override features"
 notes: ""

complexity:
 value: MODERATE
 evidence_state: OBSERVED
 confidence: HIGH
 evidence:
   - "Vite + React single-page frontend with multiple dashboard panels"
   - "Express server with custom transition engine, in-memory database simulation, replay engine, and lazy Gemini client initialization"
 notes: ""

primary_language:
 value: TypeScript
 evidence_state: OBSERVED
 confidence: HIGH
 evidence:
   - "package.json devDependencies containing typescript"
   - "tsconfig.json file present in root"
   - "*.ts and *.tsx files"
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
   - "src/index.css using Tailwind"
   - "dist/server.cjs in CJS format"
 notes: ""

primary_framework:
 value: React
 evidence_state: OBSERVED
 confidence: HIGH
 evidence:
   - "package.json dependencies: react, react-dom"
   - "vite.config.ts uses @tailwindcss/vite and @vitejs/plugin-react"
 notes: "Also uses Express for backend routing and server-side logic."

build_system:
 value: Vite
 evidence_state: OBSERVED
 confidence: HIGH
 evidence:
   - "package.json script build: 'vite build && esbuild server.ts --bundle...'"
   - "vite.config.ts in root"
 notes: "Uses Vite for frontend build, and esbuild for bundling the server file."

package_manager:
 value: npm
 evidence_state: INFERRED
 confidence: HIGH
 evidence:
   - "package.json in root"
   - "bun.lock indicates bun has been used, but build tools and execution environments default to npm/node scripts"
 notes: ""

test_framework:
 value: UNSET
 evidence_state: UNSET
 confidence: NONE
 evidence: []
 notes: "No test framework dependencies found in package.json."

workspace_or_single_repository:
 value: Single Repository
 evidence_state: OBSERVED
 confidence: HIGH
 evidence:
   - "No workspace configuration in package.json"
   - "Single package.json at root governing all dependencies and scripts"
 notes: ""

repository_maturity:
 value: PROTOTYPE
 evidence_state: OBSERVED
 confidence: HIGH
 evidence:
   - "MASTER_SPEC.md and IMPLEMENTATION_PLAN.md describe this as the AI Receptionist MVP"
   - "Uses in-memory lists (sessions, events, actionQueue) for database tables"
 notes: "A highly-polished prototype / MVP showing proof-of-concept for the Intent Runtime."

overall_confidence:
 value: HIGH
 evidence_state: OBSERVED
 confidence: HIGH
 evidence:
   - "Complete code views of server.ts, src/App.tsx, and src/types.ts"
   - "Successful build and lint execution results in workspace history"
 notes: ""

evidence_summary:
 value:
   - "package.json containing scripts, dependencies, devDependencies"
   - "MASTER_SPEC.md detailing the core pillars and database schemas"
   - "IMPLEMENTATION_PLAN.md outlining phases and goals"
   - "FUTURE_ARCHITECTURE.md outlining deferred platform elements"
   - "server.ts implementing the actual processing pipeline, replay engine, and manual overrides"
   - "src/App.tsx implementing the playground interface, interactive SVG transition map, and logs view"
 evidence_state: OBSERVED
 confidence: HIGH
 evidence: []
 notes: ""

unknown_areas:
 value:
   - "Exact production Cloud Run deployment pipeline details (beyond standard container setup)"
   - "Production-ready persistent database credentials and configuration"
 evidence_state: OBSERVED
 confidence: HIGH
 evidence:
   - "FUTURE_ARCHITECTURE.md outlines deferred elements (vector databases, multi-tenancy)"
 notes: ""
