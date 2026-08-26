import { describe, it, expect } from "vitest";
import { PersistenceStore } from "../src/store/persistence.js";
import { evaluateMissingFields, computeNextState, parseHeuristicIntentAndFacts } from "../src/services/stateMachine.js";
import { sessionInputSchema, factsOverrideSchema } from "../src/services/validation.js";

describe("API & Flow Integration Tests", () => {
  const store = PersistenceStore.getInstance();

  it("handles a complete booking lifecycle end-to-end", () => {
    const sessionId = `integ-sess-${Date.now()}`;
    const session = store.getOrCreateSession(sessionId);
    expect(session.current_state).toBe("idle");

    // Turn 1: User requests booking for 4 people tomorrow
    const input1 = "I would like to book a table for 4 guests tomorrow";
    const parsed1 = parseHeuristicIntentAndFacts(input1);
    expect(parsed1.intent).toBe("REQUEST_BOOKING");
    expect(parsed1.facts.party_size).toBe(4);
    expect(parsed1.facts.date).toBe("2026-07-01");

    store.updateSession(sessionId, (s) => {
      s.facts = { ...s.facts, ...parsed1.facts };
      s.current_state = computeNextState(s.current_state, parsed1.intent, s.facts, parsed1.facts);
    });

    const s1 = store.getSession(sessionId)!;
    expect(s1.current_state).toBe("awaiting_time");

    // Turn 2: User provides time 7pm
    const input2 = "7pm works best for us";
    const parsed2 = parseHeuristicIntentAndFacts(input2);
    expect(parsed2.facts.time).toBe("19:00");

    store.updateSession(sessionId, (s) => {
      s.facts = { ...s.facts, ...parsed2.facts };
      s.current_state = computeNextState(s.current_state, parsed2.intent, s.facts, parsed2.facts);
    });

    const s2 = store.getSession(sessionId)!;
    expect(s2.current_state).toBe("awaiting_contact_information");

    // Turn 3: User provides contact info
    const input3 = "My name is Sarah Connor and phone is 555-432-1098";
    const parsed3 = parseHeuristicIntentAndFacts(input3);
    expect(parsed3.facts.name).toBe("Sarah");
    expect(parsed3.facts.phone).toBe("555-432-1098");

    store.updateSession(sessionId, (s) => {
      s.facts = { ...s.facts, ...parsed3.facts };
      s.current_state = computeNextState(s.current_state, parsed3.intent, s.facts, parsed3.facts);
    });

    const s3 = store.getSession(sessionId)!;
    expect(s3.current_state).toBe("awaiting_confirmation");

    // Turn 4: Confirmation
    const input4 = "Yes, please confirm this table";
    const parsed4 = parseHeuristicIntentAndFacts(input4);
    expect(parsed4.intent).toBe("CONFIRM");

    store.updateSession(sessionId, (s) => {
      s.current_state = computeNextState(s.current_state, parsed4.intent, s.facts, parsed4.facts);
    });

    const s4 = store.getSession(sessionId)!;
    expect(s4.current_state).toBe("completed");
    expect(s4.facts.party_size).toBe(4);
    expect(s4.facts.date).toBe("2026-07-01");
    expect(s4.facts.time).toBe("19:00");
  });

  it("validates input schemas correctly preventing invalid payloads", () => {
    const invalidPayload = { session_id: "", text: "" };
    const res = sessionInputSchema.safeParse(invalidPayload);
    expect(res.success).toBe(false);
  });

  it("handles fact overrides and re-evaluates state machine", () => {
    const sessionId = `override-sess-${Date.now()}`;
    const session = store.getOrCreateSession(sessionId);

    // Initial state: idle
    expect(session.current_state).toBe("idle");

    // Override with partial facts
    const override = {
      session_id: sessionId,
      facts: {
        date: "2026-07-04",
        time: "20:00",
      },
    };
    expect(factsOverrideSchema.safeParse(override).success).toBe(true);

    store.updateSession(sessionId, (s) => {
      s.facts = { ...s.facts, ...override.facts };
      s.current_state = evaluateMissingFields(s.facts);
    });

    const updated = store.getSession(sessionId)!;
    expect(updated.facts.date).toBe("2026-07-04");
    expect(updated.facts.time).toBe("20:00");
    expect(updated.current_state).toBe("awaiting_contact_information");
  });
});
