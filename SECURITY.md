# Security Policy

## Supported Versions

We actively provide security patches for the following versions of **Intent Runtime**:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0.0 | :x:                |

## Reporting a Vulnerability

The Intent Runtime team takes security seriously. If you discover a security vulnerability in this project:

1. **Do NOT disclose the issue publicly** (such as in GitHub issues, pull requests, or public forums).
2. **Privately report the vulnerability** by opening a [GitHub Security Advisory](https://github.com/intent-runtime/intent-runtime/security/advisories) or emailing the maintainers directly.
3. Please include in your report:
   - A description of the vulnerability and its potential impact.
   - Step-by-step reproduction steps or a minimal proof of concept (PoC).
   - Any affected endpoints or runtime configurations.

## Response SLA

- **Initial Response:** Within 48 hours of receipt.
- **Triage & Status Update:** Within 5 business days.
- **Fix & Disclosure Timeline:** Coordinated disclosure typically occurs within 30 days of confirmed triage.

## Security Practices in Intent Runtime

- **API Secret Isolation:** All LLM and third-party API keys remain strictly server-side and are never transmitted to client bundles.
- **Optimistic Concurrency:** State mutations are protected by version-checked optimistic locks to prevent race conditions.
- **Input Validation:** Strict runtime schema validation (Zod) is enforced on all incoming conversational and administrative requests.
- **Rate Limiting:** Built-in sliding-window rate limiting mitigates denial-of-service attempts.
- **Administrative Protection:** Administrative override endpoints require authenticated bearer tokens.
