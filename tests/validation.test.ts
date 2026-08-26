import { describe, it, expect } from "vitest";
import {
  sessionInputSchema,
  bookingFactsSchema,
  factsOverrideSchema,
  sessionReplaySchema,
  paginationQuerySchema,
} from "../src/services/validation.js";

describe("Validation Schemas - sessionInputSchema", () => {
  it("accepts valid input", () => {
    const valid = {
      session_id: "test-sess-1",
      text: "I want to book a table for tomorrow",
      request_id: "req-123",
    };
    const result = sessionInputSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects empty text", () => {
    const invalid = { session_id: "test-sess-1", text: "" };
    const result = sessionInputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects missing session_id", () => {
    const invalid = { text: "Hello" };
    const result = sessionInputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("Validation Schemas - bookingFactsSchema", () => {
  it("validates valid dates and times in standard format", () => {
    const validFacts = {
      date: "2026-08-15",
      time: "18:30",
      party_size: 6,
      name: "Marcus",
      phone: "+1-555-123-4567",
    };
    const result = bookingFactsSchema.safeParse(validFacts);
    expect(result.success).toBe(true);
  });

  it("rejects invalid date formats", () => {
    const invalidFacts = { date: "15-08-2026" }; // Non-ISO
    const result = bookingFactsSchema.safeParse(invalidFacts);
    expect(result.success).toBe(false);
  });

  it("rejects invalid time formats", () => {
    const invalidFacts = { time: "25:00" }; // Invalid hour
    const result = bookingFactsSchema.safeParse(invalidFacts);
    expect(result.success).toBe(false);
  });

  it("rejects party sizes above 50 or below 1", () => {
    expect(bookingFactsSchema.safeParse({ party_size: 0 }).success).toBe(false);
    expect(bookingFactsSchema.safeParse({ party_size: 51 }).success).toBe(false);
    expect(bookingFactsSchema.safeParse({ party_size: 4 }).success).toBe(true);
  });
});

describe("Validation Schemas - factsOverrideSchema", () => {
  it("validates override with expected_version", () => {
    const override = {
      session_id: "sess-999",
      expected_version: 3,
      facts: { date: "2026-07-01", time: "19:00" },
    };
    const result = factsOverrideSchema.safeParse(override);
    expect(result.success).toBe(true);
  });
});

describe("Validation Schemas - paginationQuerySchema", () => {
  it("applies defaults for page and limit", () => {
    const parsed = paginationQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(50);
  });

  it("caps max limit at 200", () => {
    const invalid = paginationQuerySchema.safeParse({ limit: 500 });
    expect(invalid.success).toBe(false);
  });
});
