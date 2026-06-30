# Intent Runtime — AI Receptionist Kernel

An interactive full-stack playground, visual telemetry dashboard, and execution kernel for the **Intent Runtime** (AI Receptionist MVP).

The Intent Runtime is built around six permanent architectural pillars, shifting the focus from isolated business logic to a robust, deterministic state machine powered by stateless LLM reasoning.

---

## 🏗️ Core Architecture Pillars

1. **Intent Parser**: Translates raw conversational text or interactions into typed system intents.
2. **Fact Reconciliation Engine**: Processes input text to continuously merge and update key-value facts, preventing duplicate states or obsolete fields.
3. **Session State Store**: Maintains user sessions, current node locations, accumulated facts, and execution locks.
4. **Deterministic State Machine**: A strict node matrix driven by explicit transitions and security guards, removing ambiguity management from natural language prompts.
5. **Action Queue**: An asynchronous worker queue decoupling slow integration processes (like calendar synchronization) from the main user thread.
6. **Event Store**: An immutable ledger capturing all system-wide occurrences (`INPUT_RECEIVED`, `FACTS_EXTRACTED`, `INTENT_PARSED`, `STATE_TRANSITION`, etc.) for auditing and replay.

---

## 🛠️ Feature Highlights

* **Geometric Balance Design**: Built on a monochromatic high-contrast visual theme with sharp 90-degree corner radii, golden-ratio spaced component containers, and bright orange (`#FF5F1F`) interactive accents.
* **Prompt Version Tracking**: Deep traceability capturing `provider`, `model`, `prompt_version`, `latency_ms`, and `input`/`output` tokens for every model inference.
* **Idempotency Execution**: Strict deduplication checking via client-provided transition `request_id` keys to protect side-effects from repeat webhook deliveries.
* **Workflow Replay & State Auditing**: Real-time simulation testing that parses past sessions, emulates state rules side-by-side with historical logs, and highlights transition anomalies.
* **Interactive State Transition Map**: A balanced SVG visualization representing active states and connections using clean geometric circles and lines.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Secrets
Create a `.env` file in the root directory (based on `.env.example`):
```env
GEMINI_API_KEY="YOUR_GOOGLE_GEMINI_API_KEY"
APP_URL="http://localhost:3000"
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
npm start
```

---

## 📄 Documentation Manifest
* **`MASTER_SPEC.md`**: The authoritative build specification, detailing the relational schemas, state matrices, and validation rules.
* **`IMPLEMENTATION_PLAN.md`**: Phase-by-phase launch roadmap mapping milestones, success metrics, and platform monetization gates.
* **`FUTURE_ARCHITECTURE.md`**: Tracks deferred strategic abstractions (such as vector databases, ClickHouse analytical clusters, and Kubernetes) to keep speed-to-revenue prioritized.
