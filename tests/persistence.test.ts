import { describe, it, expect, beforeEach } from "vitest";
import { PersistenceStore } from "../src/store/persistence.js";

describe("Persistence Store & Optimistic Concurrency", () => {
  let store: PersistenceStore;

  beforeEach(() => {
    store = PersistenceStore.getInstance();
  });

  it("creates and retrieves a new session", () => {
    const testId = `test-sess-${Date.now()}`;
    const session = store.getOrCreateSession(testId);
    expect(session.session_id).toBe(testId);
    expect(session.version).toBe(1);
    expect(session.current_state).toBe("idle");
  });

  it("increments version on update", () => {
    const testId = `test-sess-${Date.now()}`;
    store.getOrCreateSession(testId);

    const update1 = store.updateSession(testId, (s) => {
      s.facts.date = "2026-07-01";
    });
    expect(update1.success).toBe(true);
    expect(update1.session?.version).toBe(2);

    const update2 = store.updateSession(testId, (s) => {
      s.facts.time = "19:00";
    });
    expect(update2.success).toBe(true);
    expect(update2.session?.version).toBe(3);
  });

  it("enforces optimistic locking when expectedVersion mismatches", () => {
    const testId = `test-sess-${Date.now()}`;
    const session = store.getOrCreateSession(testId);
    const initialVersion = session.version;

    // Simulate concurrent modification by advancing version
    store.updateSession(testId, (s) => {
      s.facts.party_size = 4;
    });

    // Try to update with stale expectedVersion
    const conflictedUpdate = store.updateSession(
      testId,
      (s) => {
        s.facts.name = "Late Modifier";
      },
      initialVersion
    );

    expect(conflictedUpdate.success).toBe(false);
    expect(conflictedUpdate.error).toContain("Concurrency conflict");
  });

  it("records events and returns paginated results", () => {
    const testId = `test-sess-${Date.now()}`;
    store.getOrCreateSession(testId);

    for (let i = 0; i < 5; i++) {
      store.addEvent({
        event_id: store.generateUUID(),
        session_id: testId,
        event_type: "INPUT_RECEIVED",
        payload: { text: `Test message ${i}` },
        created_at: new Date().toISOString(),
      });
    }

    const stats = store.getStats({ page: 1, limit: 3, session_id: testId });
    expect(stats.events.length).toBe(3);
    expect(stats.pagination.total).toBe(5);
    expect(stats.pagination.has_more).toBe(true);
  });
});
