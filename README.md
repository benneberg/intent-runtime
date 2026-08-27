# Intent Runtime

> A deterministic state machine execution kernel, continuous fact reconciliation engine, and visual telemetry dashboard for conversational AI receptionists.

[![CI](https:/benneberg/intent-runtime/actions/workflows/ci.yml/badge.svg)](https://github.com/benneberg/intent-runtime/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org/)

---

## ✨ Features

- **Deterministic State Machine:** Strict, auditable node matrix (`idle` → `awaiting_date` → `awaiting_time` → `awaiting_contact_information` → `awaiting_confirmation` → `completed`) eliminating LLM hallucination and out-of-order transitions.
- **Continuous Fact Reconciliation Engine:** Automatically extracts, merges, and validates conversational booking entities (`date`, `time`, `party_size`, `name`, `phone`) with full support for administrative live overrides.
- **Optimistic Concurrency & Session Persistence:** Version-tracked session store with automatic disk synchronization and conflict prevention (`409 Conflict`).
- **Asynchronous Action Worker & DLQ:** Decouples external side-effects (e.g., calendar booking, SMS dispatch) with exponential backoff retries and Dead-Letter Queue routing.
- **Immutable Event Ledger & Replay Engine:** Captures all transitions and input events for auditing, compliance, and instant side-by-side workflow replay.
- **Interactive Visual Dashboard:** Real-time state transition graph, telemetry logs, action queue monitor, and live dialogue testing console.

---

## Installation

Ensure you have **Node.js (>= 18.0.0)** installed.

```bash
# Clone the repository
git clone https://github.com/benneberg/intent-runtime.git
cd intent-runtime

# Install dependencies
npm install
```

---

## Quick Start

1. **Configure Environment:**
   ```bash
   cp .env.example .env
   ```
   *(Optional: Set `GEMINI_API_KEY` for LLM parsing; the runtime automatically falls back to deterministic heuristic parsing if omitted).*

2. **Start the Development Server:**
   ```bash
   npm run dev
   ```

3. Open **`http://localhost:3000`** in your browser to interact with the visual dashboard and receptionist console.

---

## Usage & API Reference

The Intent Runtime exposes RESTful HTTP endpoints for integration and administration:

### Health Checks
- `GET /api/health` — Basic service status.
- `GET /api/health/live` — Process liveness probe (PID and memory usage).
- `GET /api/health/ready` — Readiness probe (database readiness and Gemini client status).

### Conversational Session
- `POST /api/session/input` — Submit user dialogue to the active session.
  ```json
  {
    "session_id": "sess-default-1",
    "text": "I'd like to book a table for 4 guests tomorrow at 7pm",
    "request_id": "req-001"
  }
  ```

### Administrative & Diagnostics
- `POST /api/session/facts/override` — Manually override extracted session facts (requires `ADMIN_API_KEY` or dev authorization).
- `POST /api/session/replay` — Re-execute an event history through the state machine to audit deterministic state transitions.
- `POST /api/session/reset` — Reset a session back to the initial `idle` state.
- `GET /api/db/stats?page=1&limit=50` — Retrieve paginated session history, event logs, action queue jobs, and system metrics.

---

## Development

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Express server with Vite middleware on port 3000 |
| `npm test` | Runs the automated Vitest test suite across state machine, persistence, and validation |
| `npm run test:watch` | Runs Vitest in interactive watch mode |
| `npm run lint` | Performs TypeScript type-checking without emitting files (`tsc --noEmit`) |
| `npm run build` | Compiles frontend assets into `dist/` and bundles `server.ts` into `dist/server.cjs` |
| `npm start` | Launches the production-compiled CommonJS server |
| `npm run clean` | Cleans build artifacts and coverage directories |

---

## Configuration

Configuration is managed via environment variables defined in `.env.example`:

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | No | *None (uses heuristics)* | Google Gemini API key for natural language intent & entity parsing |
| `ADMIN_API_KEY` | No | *Dev Mode* | Secret token for securing administrative fact overrides and resets |
| `APP_URL` | No | `http://localhost:3000` | Base URL for runtime webhook and reverse-proxy resolution |

---

## Architecture

The system coordinates six primary runtime layers:

```text
[ User Dialogue / HTTP Client ]
             │
             ▼
    [ Input Validation & Rate Limiter ]
             │
             ▼
    [ Intent & Fact Extraction ] (Gemini LLM / Rule Heuristics)
             │
             ▼
    [ Fact Reconciliation Engine ] ◄── [ Admin Live Override ]
             │
             ▼
    [ Deterministic State Machine ] (Version Lock & Guards)
             │
      ┌──────┴──────────────────────────┐
      ▼                                 ▼
[ Immutable Event Store ]     [ Asynchronous Action Queue & DLQ ]
(Auditing & Replay Engine)    (Calendar Event / Notification Worker)
```

For complete technical specifications and transition matrices, see [MASTER_SPEC.md](./MASTER_SPEC.md) and [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) and [Code of Conduct](./CODE_OF_CONDUCT.md) before submitting pull requests.

---

## License

This project is licensed under the [MIT License](./LICENSE).
