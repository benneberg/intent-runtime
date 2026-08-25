# Intent Runtime — AI Receptionist Kernel

An interactive full-stack playground, visual telemetry dashboard, and execution kernel for the **Intent Runtime** (AI Receptionist MVP).

The Intent Runtime wraps stateless LLM reasoning in a deterministic state machine, continuous fact reconciliation engine, asynchronous action queue, and immutable event ledger.

---

## Overview

The Intent Runtime is structured around six core pillars:

1. **Intent Parser**: Translates raw conversational text into typed system intents.
2. **Fact Reconciliation Engine**: Processes input text to continuously merge and update key-value facts, preventing duplicate states or obsolete fields. Supports live manual overrides for debugging.
3. **Session State Store**: Maintains user sessions, current node locations, accumulated facts, and execution locks.
4. **Deterministic State Machine**: A strict node matrix driven by explicit transitions and security guards, removing ambiguity management from natural language prompts.
5. **Action Queue**: An asynchronous worker queue decoupling slow integration processes (like calendar synchronization) from the main user thread.
6. **Event Store**: An immutable ledger capturing all system-wide occurrences (`INPUT_RECEIVED`, `FACTS_EXTRACTED`, `INTENT_PARSED`, `STATE_TRANSITION`, `FACTS_OVERRIDDEN`, etc.) for auditing and replay.

The primary application target validating this runtime is the **AI Receptionist** (Restaurant / Office Booking Agent).

---

## Requirements

* Node.js (v18+ recommended)
* npm (package manager)

---

## Installation

To install project dependencies from `package.json`:

```bash
npm install
```

---

## Configuration

Create a `.env` file in the root directory (based on `.env.example`):

```env
GEMINI_API_KEY="YOUR_GOOGLE_GEMINI_API_KEY"
APP_URL="http://localhost:3000"
```

If `GEMINI_API_KEY` is omitted or unconfigured, the application falls back automatically to internal deterministic rule heuristic parsing for intent and fact extraction.

---

## Usage

### 1. Run Development Server
To boot the full-stack development application (Express API server + Vite client assets via middleware):

```bash
npm run dev
```

The dev server binds to host `0.0.0.0` and port `3000`.

### 2. Playground Controls
* **Dialogue Interaction**: Conversational window to submit prompts to the AI Receptionist.
* **Interactive State Transition Map**: Real-time visual SVG displaying current nodes (`idle`, `awaiting_date`, `awaiting_time`, `awaiting_contact_information`, `awaiting_confirmation`, `completed`).
* **Fact Reconciliation Engine Overrides**: Click the **Override** button on the Fact Reconciliation Engine widget to manually edit extracted facts (`name`, `phone`, `date`, `time`, `party_size`) for debugging and simulation.
* **Workflow Replay**: Perform an instant side-by-side simulation audit of past session logs to detect behavior discrepancies.

---

## Testing

UNSET

*Note: No automated test frameworks or unit test scripts are currently configured in `package.json`.*

---

## Build

To compile static client assets and bundle the server for production deployment:

```bash
npm run build
```

This runs:
1. `vite build` - Compiles frontend assets into `dist/`
2. `esbuild server.ts` - Bundles the backend server into `dist/server.cjs`

To start the production-built bundle:

```bash
npm start
```

---

## Deployment

The application is configured to run in serverless containers on **Google Cloud Run**.

* Ingress Port: **3000**
* Execution Command: `node dist/server.cjs`

---

## Repository Structure

* **`package.json`**: Manages scripts and project package dependencies.
* **`vite.config.ts`**: Vite bundle configurations with Tailwind CSS plugins.
* **`server.ts`**: Express backend application, Gemini SDK integrations, in-memory DB arrays, action worker simulation, and facts override API.
* **`metadata.json`**: App identity metadata and capabilities array.
* **`tsconfig.json`**: TypeScript compiler targets.
* **`MASTER_SPEC.md`**: Technical specification detailing schemas, transition matrix, and pillars.
* **`IMPLEMENTATION_PLAN.md`**: Multi-phase roadmap for platform development and product monetization.
* **`FUTURE_ARCHITECTURE.md`**: Log of deferred capabilities (vector databases, K8s, analytics clusters).
* **`src/`**
  * **`main.tsx`**: React client entry file.
  * **`App.tsx`**: Single-page visualization dashboard, chat interfaces, and debug overrides.
  * **`types.ts`**: Common typescript interfaces for sessions, actions, telemetry, and event schemas.
  * **`index.css`**: Tailwind imports stylesheet.
