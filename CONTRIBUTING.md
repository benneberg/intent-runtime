# Contributing to Intent Runtime

Thank you for your interest in contributing to **Intent Runtime**! We welcome bug reports, feature proposals, architectural discussions, and code contributions.

---

## Code of Conduct

All contributors are expected to adhere to our [Code of Conduct](./CODE_OF_CONDUCT.md). Please treat others with respect and professionalism.

---

## Development Setup

### Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9+ (or equivalent Node package manager)

### Local Environment Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/intent-runtime/intent-runtime.git
   cd intent-runtime
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env to add your GEMINI_API_KEY (optional; fallback heuristic parsing is active by default)
   ```

4. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## Quality Checks & Testing

Before submitting a pull request, verify that all quality checks pass locally:

- **Run the test suite:**
  ```bash
  npm test
  ```
- **Type checking and linting:**
  ```bash
  npm run lint
  ```
- **Verify production build:**
  ```bash
  npm run build
  ```

---

## Pull Request Guidelines

1. **Branch Naming:** Use clear branch names like `fix/concurrency-lock`, `feat/calendar-connector`, `docs/readme-update`.
2. **Atomic Commits:** Keep commits logical and focused on a single change with descriptive commit messages.
3. **Tests Required:** When introducing a new feature or fixing a bug, include corresponding unit or integration tests under `tests/`.
4. **Deterministic Architecture:** Changes to state machine logic in `src/services/stateMachine.ts` must maintain strict deterministic node transitions and adhere to the guidelines in `MASTER_SPEC.md`.
5. **No Breaking Changes Without Discussion:** Open an issue or RFC before proposing major architectural shifts.

---

## Reporting Issues

- **Bug Reports:** Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md). Please provide minimal reproduction steps, expected vs. actual behavior, and relevant logs.
- **Feature Requests:** Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md) to describe the problem and proposed solution.
- **Security Vulnerabilities:** Follow the instructions in [SECURITY.md](./SECURITY.md).
