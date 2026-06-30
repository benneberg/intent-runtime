# Intent Runtime - Future Architecture

This document tracks strategic abstractions deferred until revenue target is achieved.

## Deferred Platforms & Tech Stack

The following components are **STRICTLY EXCLUDED** from the initial MVP to prevent premature engineering, high operations overhead, and reduced speed-to-revenue:

1. **Vector Databases (Milvus, Pinecone, pgvector)**: Delayed. The core LLM fact extractor works within the prompt context window for single-session reconciliation. Vector-based memory is unnecessary.
2. **Knowledge Graphs (Neo4j, GraphMemory)**: Delayed. State models are perfectly represented in standard structured tabular records and strict transition tables.
3. **DSL Guard Engine**: Delayed. Guards are implemented in clean, structured, native TypeScript files on the server rather than compiling a dynamic external domain-specific language.
4. **Kubernetes (K8s Orchestration)**: Delayed. The runtime runs as a serverless container on Cloud Run with near-zero cold-start latency.
5. **ClickHouse Cluster**: Delayed. Analytical telemetry is stored in traditional indexed relational logs.
6. **Multi-Tenancy Partitioning**: Delayed. Initial customers operate within a unified, high-performing workspace.

---

## Evolution Roadmap

```
                    ┌────────────────────────┐
                    │  Current MVP Runtime   │
                    │   (Single-Tenant PG)   │
                    └───────────┬────────────┘
                                │
                                ▼ (Revenue Validation)
                    ┌────────────────────────┐
                    │ Multi-tenant Isolation │
                    │   & Usage Rate Limits  │
                    └───────────┬────────────┘
                                │
                                ▼ (Scale Optimization)
                    ┌────────────────────────┐
                    │ ClickHouse Telemetry / │
                    │  Vector Memory Fibers  │
                    └────────────────────────┘
```
This ensures maximum developer agility, concentrating engineering effort strictly on the core engine value proposition.
