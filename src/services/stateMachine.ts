import { WorkflowState, BookingFacts } from "../types.js";

/**
 * Evaluates the required fields for booking and returns the next appropriate WorkflowState.
 */
export function evaluateMissingFields(facts: BookingFacts): WorkflowState {
  if (!facts.date) return "awaiting_date";
  if (!facts.time) return "awaiting_time";
  if (facts.party_size === undefined || facts.party_size === null) {
    facts.party_size = 2; // Default to 2 guests if omitted
  }
  if (!facts.name || !facts.phone) return "awaiting_contact_information";
  return "awaiting_confirmation";
}

/**
 * Computes deterministic transition given current state, intent, and facts.
 */
export function computeNextState(
  oldState: WorkflowState,
  intent: string,
  mergedFacts: BookingFacts,
  newlyExtracted: BookingFacts
): WorkflowState {
  if (intent === "REJECT") {
    return "idle";
  }

  switch (oldState) {
    case "idle":
      if (intent === "REQUEST_BOOKING" || Object.keys(newlyExtracted).length > 0) {
        return evaluateMissingFields(mergedFacts);
      }
      return "idle";

    case "awaiting_date":
      if (mergedFacts.date) {
        return evaluateMissingFields(mergedFacts);
      }
      return "awaiting_date";

    case "awaiting_time":
      if (mergedFacts.time) {
        return evaluateMissingFields(mergedFacts);
      }
      return "awaiting_time";

    case "awaiting_contact_information":
      if (mergedFacts.name || mergedFacts.phone) {
        return evaluateMissingFields(mergedFacts);
      }
      return "awaiting_contact_information";

    case "awaiting_confirmation":
      if (intent === "CONFIRM") {
        return "completed";
      } else if (intent === "PROVIDE_INFORMATION") {
        return evaluateMissingFields(mergedFacts);
      }
      return "awaiting_confirmation";

    case "completed":
      if (intent === "REQUEST_BOOKING") {
        return evaluateMissingFields(newlyExtracted);
      }
      return "completed";

    default:
      return "idle";
  }
}

/**
 * Formulates the conversational response text based on the active workflow state.
 */
export function generateBotReply(state: WorkflowState, facts: BookingFacts): string {
  switch (state) {
    case "idle":
      return "Hi, I am your virtual booking host! Would you like me to make a reservation for you today?";
    case "awaiting_date":
      return "I can definitely help book a table for you! Which date would you like to reserve?";
    case "awaiting_time":
      return `Perfect, got the date as ${facts.date || "your date"}. What time would you prefer for the dinner?`;
    case "awaiting_contact_information": {
      const missingList: string[] = [];
      if (!facts.name) missingList.push("name");
      if (!facts.phone) missingList.push("phone number");
      return `Great. Could you please provide your ${missingList.join(" and ")} so we can secure the booking under your details?`;
    }
    case "awaiting_confirmation":
      return `Awesome! Let me recap your table request:\n- **Name**: ${facts.name}\n- **Phone**: ${facts.phone}\n- **Date**: ${facts.date}\n- **Time**: ${facts.time}\n- **Guests**: ${facts.party_size || 2} guests\n\nDoes everything look correct? Please type **Confirm** to secure your spot.`;
    case "completed":
      return `Wonderful, your booking is confirmed! We have reserved a spot for ${facts.party_size || 2} on **${facts.date}** at **${facts.time}** under **${facts.name}**. A confirmation text has been dispatched to ${facts.phone}. See you soon!`;
  }
}

/**
 * Deterministic heuristic fallback parser for intents and facts when offline or no API key is set.
 */
export function parseHeuristicIntentAndFacts(text: string): {
  intent: string;
  confidence: number;
  facts: BookingFacts;
} {
  const textLower = text.toLowerCase();
  let intent = "OTHER";
  let confidence = 0.95;
  const facts: BookingFacts = {};

  if (/\b(yes|confirm|correct|perfect|sure|affirmative)\b/i.test(textLower)) {
    intent = "CONFIRM";
    confidence = 0.96;
  } else if (/\b(no|cancel|stop|reject|nevermind)\b/i.test(textLower)) {
    intent = "REJECT";
    confidence = 0.94;
  } else if (/\b(book|reserve|table|appointment)\b/i.test(textLower)) {
    intent = "REQUEST_BOOKING";
    confidence = 0.95;
  } else if (/\b(hello|hi|hey|greetings)\b/i.test(textLower)) {
    intent = "CHITCHAT";
    confidence = 0.9;
  } else {
    intent = "PROVIDE_INFORMATION";
    confidence = 0.85;
  }

  if (text.trim() === "") {
    confidence = 0.2;
  }

  // Date parsing
  if (textLower.includes("tomorrow")) {
    facts.date = "2026-07-01";
  } else if (textLower.includes("today")) {
    facts.date = "2026-06-30";
  } else {
    const dateMatch = text.match(/\b\d{4}-\d{2}-\d{2}\b/);
    if (dateMatch) facts.date = dateMatch[0];
  }

  // Time parsing
  const timeMatch = text.match(/\b([01]?\d|2[0-3]):[0-5]\d\b/);
  if (timeMatch) {
    facts.time = timeMatch[0];
  } else if (textLower.includes("7pm") || textLower.includes("7 pm")) {
    facts.time = "19:00";
  } else if (textLower.includes("8pm") || textLower.includes("8 pm")) {
    facts.time = "20:00";
  } else if (textLower.includes("6pm") || textLower.includes("6 pm")) {
    facts.time = "18:00";
  }

  // Party size
  const partyMatch =
    text.match(/\bfor\s+(\d+)\b/) ||
    text.match(/\bof\s+(\d+)\b/) ||
    text.match(/\b(\d+)\s+(people|guests|person)\b/);
  if (partyMatch) {
    facts.party_size = parseInt(partyMatch[1], 10);
  }

  // Phone
  const phoneMatch =
    text.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/) || text.match(/\b\d{10,11}\b/);
  if (phoneMatch) {
    facts.phone = phoneMatch[0];
  }

  // Name
  const nameMatch =
    text.match(/my name is ([a-zA-Z]+)/i) ||
    text.match(/name is ([a-zA-Z]+)/i) ||
    text.match(/under ([a-zA-Z]+)/i);
  if (nameMatch) {
    facts.name = nameMatch[1];
  }

  return { intent, confidence, facts };
}
