import { describe, it, expect } from "vitest";
import {
  evaluateMissingFields,
  computeNextState,
  generateBotReply,
  parseHeuristicIntentAndFacts,
} from "../src/services/stateMachine.js";
import { BookingFacts } from "../src/types.js";

describe("State Machine - evaluateMissingFields", () => {
  it("returns awaiting_date when date is missing", () => {
    const facts: BookingFacts = {};
    expect(evaluateMissingFields(facts)).toBe("awaiting_date");
  });

  it("returns awaiting_time when date is present but time is missing", () => {
    const facts: BookingFacts = { date: "2026-07-01" };
    expect(evaluateMissingFields(facts)).toBe("awaiting_time");
  });

  it("defaults party_size to 2 and returns awaiting_contact_information when name/phone are missing", () => {
    const facts: BookingFacts = { date: "2026-07-01", time: "19:00" };
    expect(evaluateMissingFields(facts)).toBe("awaiting_contact_information");
    expect(facts.party_size).toBe(2);
  });

  it("returns awaiting_confirmation when all required fields are present", () => {
    const facts: BookingFacts = {
      date: "2026-07-01",
      time: "19:00",
      party_size: 4,
      name: "Alice",
      phone: "555-123-4567",
    };
    expect(evaluateMissingFields(facts)).toBe("awaiting_confirmation");
  });
});

describe("State Machine - computeNextState transitions", () => {
  it("transitions from idle to awaiting_date upon REQUEST_BOOKING", () => {
    const next = computeNextState("idle", "REQUEST_BOOKING", {}, {});
    expect(next).toBe("awaiting_date");
  });

  it("transitions from idle directly to awaiting_time if date is extracted", () => {
    const next = computeNextState("idle", "REQUEST_BOOKING", { date: "2026-07-01" }, { date: "2026-07-01" });
    expect(next).toBe("awaiting_time");
  });

  it("transitions to completed on CONFIRM from awaiting_confirmation", () => {
    const facts: BookingFacts = {
      date: "2026-07-01",
      time: "19:00",
      party_size: 2,
      name: "Bob",
      phone: "555-987-6543",
    };
    const next = computeNextState("awaiting_confirmation", "CONFIRM", facts, {});
    expect(next).toBe("completed");
  });

  it("resets to idle on REJECT intent from any state", () => {
    const next = computeNextState("awaiting_confirmation", "REJECT", {}, {});
    expect(next).toBe("idle");
  });
});

describe("Heuristic Fact & Intent Parser", () => {
  it("extracts REQUEST_BOOKING, date, time, and party size accurately", () => {
    const res = parseHeuristicIntentAndFacts("Book a table for 4 people tomorrow at 7pm");
    expect(res.intent).toBe("REQUEST_BOOKING");
    expect(res.facts.date).toBe("2026-07-01");
    expect(res.facts.time).toBe("19:00");
    expect(res.facts.party_size).toBe(4);
  });

  it("extracts name and phone number accurately", () => {
    const res = parseHeuristicIntentAndFacts("My name is Jonathan and my phone is 555-890-1234");
    expect(res.facts.name).toBe("Jonathan");
    expect(res.facts.phone).toBe("555-890-1234");
  });

  it("identifies CONFIRM intent accurately", () => {
    const res = parseHeuristicIntentAndFacts("Yes, confirm the booking please");
    expect(res.intent).toBe("CONFIRM");
    expect(res.confidence).toBeGreaterThan(0.9);
  });
});

describe("Bot Response Generator", () => {
  it("generates appropriate prompt for awaiting_date", () => {
    const reply = generateBotReply("awaiting_date", {});
    expect(reply).toContain("Which date would you like to reserve?");
  });

  it("generates confirmation summary for awaiting_confirmation", () => {
    const reply = generateBotReply("awaiting_confirmation", {
      name: "Alice",
      phone: "555-0000",
      date: "2026-07-01",
      time: "20:00",
      party_size: 2,
    });
    expect(reply).toContain("Alice");
    expect(reply).toContain("2026-07-01");
    expect(reply).toContain("Confirm");
  });
});
