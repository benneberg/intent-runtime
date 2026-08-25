schema:
  version: 1
  compatible_with:
    - CCC
  generated_by: Repository Bootstrap Prompt
  generated_at: 2026-08-25T07:51:38-07:00
  repository: react-example

actions:
  - title: "Input validation for override endpoints"
    description: "Add validation guards inside /api/session/facts/override to verify date formatting (YYYY-MM-DD), time formatting (HH:MM), and sanitize input strings."
    priority: "IMMEDIATE"
    expected_benefit: "Ensures manual facts overridden in debugging do not crash or corrupt the state machine engine."
    difficulty: "EASY"
    evidence:
      - "server.ts lines handling /api/session/facts/override"
    confidence: "HIGH"

  - title: "Secure administrative endpoints"
    description: "Add a token authorization check before executing state reset or manual overrides."
    priority: "HIGH_PRIORITY"
    expected_benefit: "Protects public live endpoints from unauthorized resets or state modifications."
    difficulty: "EASY"
    evidence:
      - "server.ts administrative endpoints"
    confidence: "HIGH"

  - title: "Implement Durable Database Persistence"
    description: "Swap in-memory array logs with a persistent storage mechanism using Firestore or PostgreSQL to survive server restarts."
    priority: "HIGH_PRIORITY"
    expected_benefit: "Preserves active booking sessions, immutable event stores, and telemetry records reliably."
    difficulty: "MEDIUM"
    evidence:
      - "server.ts volatile memory arrays"
    confidence: "HIGH"

  - title: "Create automated unit tests"
    description: "Install vitest and create test suites verifying state transition outputs from evaluateMissingFields based on different fact sets."
    priority: "MEDIUM_PRIORITY"
    expected_benefit: "Ensures future updates to reservation state paths don't introduce regressions."
    difficulty: "MEDIUM"
    evidence:
      - "package.json dependencies"
    confidence: "HIGH"

  - title: "API Pagination"
    description: "Paginate the /api/db/stats endpoint to return bounded slices of events and telemetry records."
    priority: "QUICK_WINS"
    expected_benefit: "Decreases HTTP response payloads and minimizes memory consumption."
    difficulty: "EASY"
    evidence:
      - "server.ts /api/db/stats endpoint"
    confidence: "HIGH"

  - title: "Configure real webhook or calendar integrations"
    description: "Replace mock background worker setTimeout blocks with actual integrations (e.g. Google Calendar API or SMS dispatchers)."
    priority: "LOW_PRIORITY"
    expected_benefit: "Transforms the prototype into an integrated reservation utility."
    difficulty: "HARD"
    evidence:
      - "server.ts background queue simulation"
    confidence: "MEDIUM"

  - title: "Build multi-tenant isolation and usage limits"
    description: "Add client workspace keys and API rate limiting capabilities to support multi-tenant usage."
    priority: "LONG_TERM"
    expected_benefit: "Enables multi-tenant SaaS scaling."
    difficulty: "HARD"
    evidence:
      - "FUTURE_ARCHITECTURE.md evolutionary roadmap"
    confidence: "HIGH"
