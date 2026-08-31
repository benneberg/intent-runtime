# Intent Runtime

> A deterministic state machine execution kernel, continuous fact reconciliation engine, and visual telemetry dashboard for conversational AI receptionists.

[![CI](https://github.com/benneberg/intent-runtime/actions/workflows/ci.yml/badge.svg)](https://github.com/benneberg/intent-runtime/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org/)

---
A deterministic execution runtime for conversational booking workflows.
Intent Runtime turns conversational input into structured booking facts, evaluates a deterministic workflow, persists session state and events, and dispatches asynchronous actions.
The key architectural principle is:
LLM output may provide intent and facts, but deterministic runtime code remains authoritative for workflow state and side effects.
What it does
•  Deterministic workflow — Moves sessions through an explicit booking state machine instead of allowing an LLM to decide workflow transitions.
•  Fact extraction and reconciliation — Extracts booking information such as date, time, party size, name, and phone, then merges it with the current session facts.
•  LLM with deterministic fallback — Uses Gemini for natural-language interpretation when configured, with deterministic heuristic parsing available without an API key.
•  Persistent sessions — Stores session state, events, and queued actions using the runtime persistence layer.
•  Event history and replay — Records runtime events and supports replaying session history through the deterministic workflow.
•  Asynchronous actions — Processes external side effects through a background action worker with retries and failed-job handling.
•  Protected administration — Provides authenticated administrative operations for fact overrides and session resets.
•  Visual dashboard — Includes a browser-based interface for interacting with sessions and inspecting runtime behavior.
Current workflow
The booking workflow uses the following states:
idle
│
▼
awaiting_date
│
▼
awaiting_time
│
▼
awaiting_contact_information
│
▼
awaiting_confirmation
│
├── confirm ──► completed
│
└── reject  ──► idle
The runtime may skip intermediate states when the required information is already available.
For the complete implementation architecture, see ARCHITECTURE.md ./ARCHITECTURE.md.
Installation
Requires Node.js 18 or later.
git clone https://github.com/benneberg/intent-runtime.git
cd intent-runtime
npm install

Quick start
Copy the example environment configuration:
cp .env.example .env

GEMINI_API_KEY is optional. Without it, the runtime uses deterministic heuristic parsing.
Start the development server:
npm run dev

Then open:
http://localhost:3000

API
The runtime exposes a REST API.
Health
GET /api/health
GET /api/health/live
GET /api/health/ready

Conversational sessions
POST /api/session/input

Example:
{
  "session_id": "sess-default-1",
  "text": "I'd like to book a table for 4 guests tomorrow at 7pm",
  "request_id": "req-001"
}

Administration and diagnostics
POST /api/session/facts/override
POST /api/session/replay
POST /api/session/reset
GET  /api/db/stats?page=1&limit=50

Administrative operations are protected by the configured authorization mechanism.
Configuration
Configuration is provided through environment variables.
Variable	Required	Description
`GEMINI_API_KEY`	No	Gemini API key used for natural-language intent and fact extraction
`ADMIN_API_KEY`	No	Authorization token for administrative session operations
`APP_URL`	No	Application base URL; defaults to `http://localhost:3000`
See .env.example for the available configuration.
Development
Command	Description
`npm run dev`	Start the development server
`npm test`	Run the test suite
`npm run test:watch`	Run tests in watch mode
`npm run lint`	Run TypeScript type checking
`npm run build`	Build the frontend and production server
`npm start`	Start the production build
`npm run clean`	Remove build and coverage artifacts
Project structure
The main runtime boundaries are:
File	Responsibility
`server.ts`	HTTP/API application boundary
`src/services/stateMachine.ts`	deterministic workflow logic
`src/services/validation.ts`	request validation
`src/services/auth.ts`	administrative authorization
`src/services/rateLimiter.ts`	request throttling
`src/services/actionWorker.ts`	asynchronous action processing
`src/store/persistence.ts`	runtime persistence
`src/types.ts`	shared runtime types
`src/App.tsx`	browser application
See ARCHITECTURE.md ./ARCHITECTURE.md for how these components interact.
Design principles
•  Deterministic state transitions — The workflow state is controlled by explicit runtime logic.
•  LLMs are not the authority — Language models can interpret conversational input and propose structured facts. They do not directly control workflow transitions.
•  State and side effects are separated — The runtime determines state synchronously and represents external work as asynchronous actions.
•  Runtime state is observable — Session events and diagnostics make workflow behavior inspectable and replayable.
•  Security belongs at the boundary — Untrusted API input is validated, and administrative operations are protected separately from normal conversational operations.
Testing
The test suite covers the main runtime boundaries:
tests/api.test.ts
tests/persistence.test.ts
tests/stateMachine.test.ts
tests/validation.test.ts

Changes to workflow behavior should normally include corresponding state-machine tests.
Contributing
Contributions are welcome.
See CONTRIBUTING.md ./CONTRIBUTING.md and CODE_OF_CONDUCT.md ./CODE_OF_CONDUCT.md before submitting changes.
License
Intent Runtime is licensed under the MIT License ./LICENSE.


