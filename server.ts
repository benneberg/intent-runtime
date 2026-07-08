import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { 
  WorkflowState, 
  BookingFacts, 
  RuntimeSession, 
  RuntimeEvent, 
  PromptTelemetry, 
  ActionQueueItem,
  ChatMessage,
  RuntimeEventType,
  ActionType,
  ActionStatus
} from "./src/types.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client Lazily & Safely
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      try {
        aiClient = new GoogleGenAI({
          apiKey: key,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });
        console.log("Gemini Client initialized successfully on server-side.");
      } catch (e) {
        console.error("Failed to initialize Gemini Client:", e);
      }
    } else {
      console.log("No valid GEMINI_API_KEY found. Operating in deterministic/simulation mode.");
    }
  }
  return aiClient;
}

// In-Memory Database Stores (Simulating Relational Tables)
let sessions: RuntimeSession[] = [];
let events: RuntimeEvent[] = [];
let telemetry: PromptTelemetry[] = [];
let actionQueue: ActionQueueItem[] = [];

// Helper to generate UUIDs
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Seed Initial Data if empty
function ensureSeed() {
  if (sessions.length === 0) {
    const defaultSessionId = "demo-session-id-123456789";
    const now = new Date().toISOString();
    
    sessions.push({
      session_id: defaultSessionId,
      current_state: "idle",
      facts: {},
      created_at: now,
      updated_at: now
    });

    events.push({
      event_id: generateUUID(),
      session_id: defaultSessionId,
      event_type: "STATE_TRANSITION",
      payload: { from: "none", to: "idle", reason: "Session initialized" },
      created_at: now
    });
  }
}

ensureSeed();

// Background Action Queue Worker Simulation
function processActionQueue() {
  const pendingActions = actionQueue.filter(a => a.status === 'pending');
  
  pendingActions.forEach(action => {
    // Lock the action to running
    action.status = 'running';
    action.updated_at = new Date().toISOString();
    
    events.push({
      event_id: generateUUID(),
      session_id: action.session_id,
      event_type: "ACTION_DISPATCHED",
      payload: { action_id: action.action_id, action_type: action.action_type, payload: action.payload },
      created_at: new Date().toISOString()
    });

    // Simulate async execution delay (e.g. 1.2 seconds)
    setTimeout(() => {
      const isSuccess = Math.random() < 0.95; // 95% success rate
      action.status = isSuccess ? 'completed' : 'failed';
      action.updated_at = new Date().toISOString();

      events.push({
        event_id: generateUUID(),
        session_id: action.session_id,
        event_type: isSuccess ? "ACTION_COMPLETED" : "ACTION_FAILED",
        payload: { 
          action_id: action.action_id, 
          action_type: action.action_type,
          result: isSuccess ? "Operation completed successfully" : "Integration server returned 503 Service Unavailable"
        },
        created_at: new Date().toISOString()
      });

      console.log(`Action ${action.action_type} (${action.action_id}) completed with status: ${action.status}`);
    }, 1500);
  });
}

// Continuous check for background actions
setInterval(processActionQueue, 1000);

// API Endpoints for UI

// 1. Get entire database / application stats (to render in dashboard)
app.get("/api/db/stats", (req, res) => {
  res.json({
    sessions,
    events: [...events].sort((a,b) => b.created_at.localeCompare(a.created_at)),
    telemetry: [...telemetry].sort((a,b) => b.created_at.localeCompare(a.created_at)),
    actionQueue: [...actionQueue].sort((a,b) => b.created_at.localeCompare(a.created_at))
  });
});

// 2. Start or reset a session
app.post("/api/session/reset", (req, res) => {
  const { session_id } = req.body;
  const targetId = session_id || generateUUID();
  const now = new Date().toISOString();

  // Remove existing if matching
  sessions = sessions.filter(s => s.session_id !== targetId);
  events = events.filter(e => e.session_id !== targetId);
  actionQueue = actionQueue.filter(a => a.session_id !== targetId);

  const newSession: RuntimeSession = {
    session_id: targetId,
    current_state: "idle",
    facts: {},
    created_at: now,
    updated_at: now
  };

  sessions.push(newSession);

  events.push({
    event_id: generateUUID(),
    session_id: targetId,
    event_type: "STATE_TRANSITION",
    payload: { from: "none", to: "idle", reason: "Session reset by user" },
    created_at: now
  });

  res.json({ status: "ok", session: newSession });
});

// 3. Main processing endpoint for user conversational input (The Intent Runtime core flow)
app.post("/api/session/input", async (req, res) => {
  const { session_id, text, request_id } = req.body;
  
  if (!session_id || !text) {
    return res.status(400).json({ error: "session_id and text are required fields" });
  }

  // Idempotency check: request_id unique validation
  if (request_id) {
    const existingEvent = events.find(e => e.event_type === "INPUT_RECEIVED" && e.payload.request_id === request_id);
    if (existingEvent) {
      console.log(`Duplicate Request Detected! Returning stored results for idempotency key: ${request_id}`);
      const session = sessions.find(s => s.session_id === session_id);
      return res.json({ 
        status: "ok", 
        warning: "Idempotent duplicate request resolved", 
        session,
        events: events.filter(e => e.session_id === session_id)
      });
    }
  }

  // Retrieve current session
  let session = sessions.find(s => s.session_id === session_id);
  if (!session) {
    const now = new Date().toISOString();
    session = {
      session_id,
      current_state: "idle",
      facts: {},
      created_at: now,
      updated_at: now
    };
    sessions.push(session);
  }

  const startTime = Date.now();
  const nowStr = new Date().toISOString();

  // Step A: Log Input Event
  events.push({
    event_id: generateUUID(),
    session_id,
    event_type: "INPUT_RECEIVED",
    payload: { text, request_id: request_id || null },
    created_at: nowStr
  });

  // Step B: Intent Parsing and Fact Extraction via Gemini or simulation
  const client = getGeminiClient();
  let intent = "OTHER";
  let confidence = 0.95;
  let extractedFacts: BookingFacts = {};
  let isSimulated = true;
  let inputTokens = 0;
  let outputTokens = 0;
  let modelUsed = "deterministic_rule_engine";

  if (client) {
    try {
      modelUsed = "gemini-3.5-flash";
      console.log(`Running analysis using Gemini model: ${modelUsed}`);
      const systemInstruction = `
        You are the parser and fact reconciliation module of an Intent Runtime for an AI Booking Receptionist at a premium restaurant.
        Your job is to read user input and output a strict JSON structure containing the extracted intent, your confidence level, and facts.
        
        The possible user intents are:
        - "REQUEST_BOOKING": Expresses intent to book or reserve a table/slot.
        - "PROVIDE_INFORMATION": User supplies details like date, time, party size, name, or phone.
        - "CONFIRM": User verifies, approves, or says yes to confirmation summaries.
        - "REJECT": User cancels, rejects, or says no to suggestions.
        - "CHITCHAT": Friendly banter, greetings, or off-topic queries.
        - "OTHER": Ambiguous or default state.

        The facts you should extract are:
        - "date": Date in YYYY-MM-DD format (if user says "tomorrow" or relative days, use relative to current local date: 2026-06-30).
        - "time": Time in 24-hour HH:MM format.
        - "party_size": Integer number of guests.
        - "name": Customer's name.
        - "phone": Customer's phone number.

        Only return facts that are explicitly mentioned or can be directly inferred from the text. DO NOT invent facts.
        If a user says "book a table for 3 people tomorrow evening", facts would be:
        { "party_size": 3, "date": "2026-07-01" } (since today is 2026-06-30)

        Format your entire output strictly as a JSON object matching this schema:
        {
          "intent": "REQUEST_BOOKING" | "PROVIDE_INFORMATION" | "CONFIRM" | "REJECT" | "CHITCHAT" | "OTHER",
          "confidence": number, // A confidence score between 0.0 and 1.0 representing accuracy of the parsed intent
          "facts": {
            "date": string | null,
            "time": string | null,
            "party_size": number | null,
            "name": string | null,
            "phone": string | null
          },
          "reasoning": "Brief explanation of how the intent and facts were parsed"
        }
      `;

      const response = await client.models.generateContent({
        model: modelUsed,
        contents: `Current Date Context: 2026-06-30 (Tuesday)\nUser Input: "${text}"`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              intent: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              facts: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING },
                  time: { type: Type.STRING },
                  party_size: { type: Type.INTEGER },
                  name: { type: Type.STRING },
                  phone: { type: Type.STRING }
                }
              },
              reasoning: { type: Type.STRING }
            },
            required: ["intent", "confidence", "facts"]
          }
        }
      });

      const textOutput = response.text?.trim() || "{}";
      const parsed = JSON.parse(textOutput);
      intent = parsed.intent || "OTHER";
      confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.98;
      
      // Filter out null/undefined values from facts
      if (parsed.facts) {
        Object.keys(parsed.facts).forEach(k => {
          if (parsed.facts[k] !== null && parsed.facts[k] !== undefined) {
            (extractedFacts as any)[k] = parsed.facts[k];
          }
        });
      }
      isSimulated = false;

      // Approximate token usage since mock counts or simple estimates are sufficient
      inputTokens = Math.floor(systemInstruction.length / 4) + Math.floor(text.length / 4);
      outputTokens = Math.floor(textOutput.length / 4);

    } catch (e) {
      console.error("Gemini invocation failed, falling back to rule-based engine:", e);
    }
  }

  // Backup Deterministic Rule-Based parsing (Used if no API key or in case of failures)
  if (isSimulated) {
    const textLower = text.toLowerCase();
    
    // Simple intent heuristics
    if (textLower.includes("book") || textLower.includes("reserve") || textLower.includes("table") || textLower.includes("appointment")) {
      intent = "REQUEST_BOOKING";
      confidence = 0.95;
    } else if (textLower.includes("yes") || textLower.includes("confirm") || textLower.includes("correct") || textLower.includes("perfect") || textLower.includes("sure")) {
      intent = "CONFIRM";
      confidence = 0.96;
    } else if (textLower.includes("no") || textLower.includes("cancel") || textLower.includes("stop") || textLower.includes("reject")) {
      intent = "REJECT";
      confidence = 0.94;
    } else if (textLower.includes("hello") || textLower.includes("hi") || textLower.includes("hey") || textLower.includes("greetings")) {
      intent = "CHITCHAT";
      confidence = 0.90;
    } else {
      intent = "PROVIDE_INFORMATION";
      confidence = 0.85;
    }

    if (text.trim() === "") {
      confidence = 0.20;
    }

    // Heuristics for facts extraction
    // Dates like YYYY-MM-DD or words like tomorrow, today
    if (textLower.includes("tomorrow")) {
      extractedFacts.date = "2026-07-01"; // Relative to June 30, 2026
    } else if (textLower.includes("today")) {
      extractedFacts.date = "2026-06-30";
    } else {
      const dateMatch = text.match(/\b\d{4}-\d{2}-\d{2}\b/);
      if (dateMatch) extractedFacts.date = dateMatch[0];
    }

    // Time matching HH:MM or simple hours
    const timeMatch = text.match(/\b([01]?\d|2[0-3]):[0-5]\d\b/);
    if (timeMatch) {
      extractedFacts.time = timeMatch[0];
    } else if (textLower.includes("7pm") || textLower.includes("7 pm")) {
      extractedFacts.time = "19:00";
    } else if (textLower.includes("8pm") || textLower.includes("8 pm")) {
      extractedFacts.time = "20:00";
    } else if (textLower.includes("6pm") || textLower.includes("6 pm")) {
      extractedFacts.time = "18:00";
    }

    // Party size matching "for X", "party of X", "X guests", "X people"
    const partyMatch = text.match(/\bfor\s+(\d+)\b/) || text.match(/\bof\s+(\d+)\b/) || text.match(/\b(\d+)\s+(people|guests|person)\b/);
    if (partyMatch) {
      extractedFacts.party_size = parseInt(partyMatch[1], 10);
    }

    // Phone matching digits
    const phoneMatch = text.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/) || text.match(/\b\d{10,11}\b/);
    if (phoneMatch) {
      extractedFacts.phone = phoneMatch[0];
    }

    // Name matching e.g. "my name is X" or "I am X" or "under X"
    const nameMatch = text.match(/my name is ([a-zA-Z]+)/i) || text.match(/name is ([a-zA-Z]+)/i) || text.match(/under ([a-zA-Z]+)/i);
    if (nameMatch) {
      extractedFacts.name = nameMatch[1];
    }

    inputTokens = 210;
    outputTokens = 90;
  }

  const latency = Date.now() - startTime;

  // Step C: Log Telemetry & Events
  const telemetryId = generateUUID();
  const prompt_version = "v1.0.4-MVP";
  telemetry.push({
    id: telemetryId,
    provider: isSimulated ? "internal" : "google",
    model: modelUsed,
    prompt_version,
    latency_ms: latency,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    created_at: new Date().toISOString()
  });

  events.push({
    event_id: generateUUID(),
    session_id,
    event_type: "INTENT_PARSED",
    payload: { intent, confidence, prompt_version },
    telemetry_metadata: {
      provider: isSimulated ? "internal" : "google",
      model: modelUsed,
      prompt_version,
      latency_ms: latency,
      input_tokens: inputTokens,
      output_tokens: outputTokens
    },
    created_at: new Date().toISOString()
  });

  // Reconcile and merge extracted facts into current facts store
  const previousFacts = { ...session.facts };
  const mergedFacts = { ...session.facts, ...extractedFacts };
  
  // Detect Anomaly (e.g. negative party size, table too large)
  if (mergedFacts.party_size && mergedFacts.party_size <= 0) {
    events.push({
      event_id: generateUUID(),
      session_id,
      event_type: "ANOMALY_DETECTED",
      payload: { field: "party_size", value: mergedFacts.party_size, error: "Party size must be a positive integer" },
      created_at: new Date().toISOString()
    });
    // Revert party size
    delete mergedFacts.party_size;
  }

  session.facts = mergedFacts;

  events.push({
    event_id: generateUUID(),
    session_id,
    event_type: "FACTS_EXTRACTED",
    payload: { newly_extracted: extractedFacts, merged_state: mergedFacts },
    created_at: new Date().toISOString()
  });

  // Step D: Evaluate State Machine Transitions Deterministically
  const oldState = session.current_state;
  let nextState = oldState;

  // State Transition Engine Logic
  if (intent === "REJECT") {
    nextState = "idle";
    session.facts = {}; // Reset facts
  } else {
    switch (oldState) {
      case "idle":
        if (intent === "REQUEST_BOOKING" || Object.keys(extractedFacts).length > 0) {
          nextState = evaluateMissingFields(mergedFacts);
        }
        break;
      
      case "awaiting_date":
        if (mergedFacts.date) {
          nextState = evaluateMissingFields(mergedFacts);
        }
        break;

      case "awaiting_time":
        if (mergedFacts.time) {
          nextState = evaluateMissingFields(mergedFacts);
        }
        break;

      case "awaiting_contact_information":
        if (mergedFacts.name || mergedFacts.phone) {
          nextState = evaluateMissingFields(mergedFacts);
        }
        break;

      case "awaiting_confirmation":
        if (intent === "CONFIRM") {
          nextState = "completed";
        } else if (intent === "PROVIDE_INFORMATION") {
          nextState = evaluateMissingFields(mergedFacts);
        }
        break;

      case "completed":
        if (intent === "REQUEST_BOOKING") {
          session.facts = { ...extractedFacts };
          nextState = evaluateMissingFields(session.facts);
        }
        break;
    }
  }

  session.current_state = nextState;
  session.updated_at = new Date().toISOString();

  // Log state transition if changed
  if (oldState !== nextState) {
    events.push({
      event_id: generateUUID(),
      session_id,
      event_type: "STATE_TRANSITION",
      payload: { from: oldState, to: nextState, trigger_intent: intent },
      created_at: new Date().toISOString()
    });

    // Trigger Side-Effect Actions asynchronously based on states
    if (nextState === "completed") {
      // 1. Create Calendar Event Job
      actionQueue.push({
        action_id: generateUUID(),
        session_id,
        action_type: "CREATE_CALENDAR_EVENT",
        payload: { date: mergedFacts.date, time: mergedFacts.time, summary: `Booking for ${mergedFacts.name || "Guest"} - ${mergedFacts.party_size || 2} persons` },
        status: "pending",
        idempotency_key: generateUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // 2. Dispatch Booking Confirmation Notification
      actionQueue.push({
        action_id: generateUUID(),
        session_id,
        action_type: "DISPATCH_CONFIRMATION",
        payload: { name: mergedFacts.name, phone: mergedFacts.phone, details: `${mergedFacts.date} at ${mergedFacts.time} (${mergedFacts.party_size} guests)` },
        status: "pending",
        idempotency_key: generateUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } else if (mergedFacts.date && mergedFacts.time && (oldState === "awaiting_date" || oldState === "awaiting_time" || oldState === "idle")) {
      // Dispatch live booking availability check
      actionQueue.push({
        action_id: generateUUID(),
        session_id,
        action_type: "CHECK_AVAILABILITY",
        payload: { date: mergedFacts.date, time: mergedFacts.time },
        status: "pending",
        idempotency_key: generateUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }

  // Step E: Formulate Conversation Reply
  let botReply = "";
  switch (nextState) {
    case "idle":
      botReply = "Hi, I am your virtual booking host! Would you like me to make a reservation for you today?";
      break;
    case "awaiting_date":
      botReply = "I can definitely help book a table for you! Which date would you like to reserve?";
      break;
    case "awaiting_time":
      botReply = `Perfect, got the date as ${mergedFacts.date}. What time would you prefer for the dinner?`;
      break;
    case "awaiting_contact_information":
      let missingList = [];
      if (!mergedFacts.name) missingList.push("name");
      if (!mergedFacts.phone) missingList.push("phone number");
      botReply = `Great. Could you please provide your ${missingList.join(" and ")} so we can secure the booking under your details?`;
      break;
    case "awaiting_confirmation":
      botReply = `Awesome! Let me recap your table request:\n- **Name**: ${mergedFacts.name}\n- **Phone**: ${mergedFacts.phone}\n- **Date**: ${mergedFacts.date}\n- **Time**: ${mergedFacts.time}\n- **Guests**: ${mergedFacts.party_size || 2} guests\n\nDoes everything look correct? Please type **Confirm** to secure your spot.`;
      break;
    case "completed":
      botReply = `Wonderful, your booking is confirmed! We have reserved a spot for ${mergedFacts.party_size || 2} on **${mergedFacts.date}** at **${mergedFacts.time}** under **${mergedFacts.name}**. A confirmation text has been dispatched to ${mergedFacts.phone}. See you soon!`;
      break;
  }

  res.json({
    status: "ok",
    session,
    reply: botReply,
    intent,
    confidence,
    extractedFacts
  });
});

// 4. Workflow Replay Engine (Reconstruct past sessions step-by-step to audit discrepancies)
app.post("/api/session/replay", (req, res) => {
  const { session_id } = req.body;
  if (!session_id) {
    return res.status(400).json({ error: "session_id is required" });
  }

  // Get historical events for this session, sorted by chronological creation
  const sessionEvents = events
    .filter(e => e.session_id === session_id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  
  let currentState: WorkflowState = "idle";
  let currentFacts: BookingFacts = {};
  const steps: any[] = [];
  
  // Find all INPUT_RECEIVED events
  const inputs = sessionEvents.filter(e => e.event_type === "INPUT_RECEIVED");
  
  inputs.forEach((inputEvent, index) => {
    const inputText = inputEvent.payload.text;
    const inputTime = inputEvent.created_at;
    
    // Slice events window for the current turn
    const currentInputIdx = sessionEvents.indexOf(inputEvent);
    const nextInputEvent = inputs[index + 1];
    const nextInputIdx = nextInputEvent ? sessionEvents.indexOf(nextInputEvent) : sessionEvents.length;
    
    const turnEvents = sessionEvents.slice(currentInputIdx + 1, nextInputIdx);
    
    const factsEvent = turnEvents.find(e => e.event_type === "FACTS_EXTRACTED");
    const intentEvent = turnEvents.find(e => e.event_type === "INTENT_PARSED");
    const transitionEvent = turnEvents.find(e => e.event_type === "STATE_TRANSITION");
    
    const newlyExtracted = factsEvent?.payload?.newly_extracted || {};
    const historicalMerged = factsEvent?.payload?.merged_state || {};
    const historicalNextState = transitionEvent?.payload?.to || currentState;
    const intent = intentEvent?.payload?.intent || "OTHER";
    
    const simulatedOldState = currentState;
    const simulatedFacts = { ...currentFacts, ...newlyExtracted };
    
    // Apply state transition simulation rules
    let simulatedNextState = simulatedOldState;
    if (intent === "REJECT") {
      simulatedNextState = "idle";
      currentFacts = {};
    } else {
      switch (simulatedOldState) {
        case "idle":
          if (intent === "REQUEST_BOOKING" || Object.keys(newlyExtracted).length > 0) {
            simulatedNextState = evaluateMissingFields(simulatedFacts);
          }
          break;
        case "awaiting_date":
          if (simulatedFacts.date) {
            simulatedNextState = evaluateMissingFields(simulatedFacts);
          }
          break;
        case "awaiting_time":
          if (simulatedFacts.time) {
            simulatedNextState = evaluateMissingFields(simulatedFacts);
          }
          break;
        case "awaiting_contact_information":
          if (simulatedFacts.name || simulatedFacts.phone) {
            simulatedNextState = evaluateMissingFields(simulatedFacts);
          }
          break;
        case "awaiting_confirmation":
          if (intent === "CONFIRM") {
            simulatedNextState = "completed";
          } else if (intent === "PROVIDE_INFORMATION") {
            simulatedNextState = evaluateMissingFields(simulatedFacts);
          }
          break;
        case "completed":
          if (intent === "REQUEST_BOOKING") {
            simulatedNextState = evaluateMissingFields(newlyExtracted);
          }
          break;
      }
    }
    
    const discrepancy = simulatedNextState !== historicalNextState;
    
    steps.push({
      input_text: inputText,
      timestamp: inputTime,
      intent,
      newly_extracted: newlyExtracted,
      simulated_facts: { ...simulatedFacts },
      historical_facts: historicalMerged,
      simulated_state: simulatedNextState,
      historical_state: historicalNextState,
      discrepancy
    });
    
    currentState = simulatedNextState;
    currentFacts = simulatedFacts;
  });
  
  res.json({
    session_id,
    replayed_steps: steps,
    final_reconstructed_state: currentState,
    final_reconstructed_facts: currentFacts,
    total_steps: steps.length,
    has_discrepancies: steps.some(s => s.discrepancy)
  });
});

// Helper to determine the next state based on missing fields
function evaluateMissingFields(facts: BookingFacts): WorkflowState {
  if (!facts.date) return "awaiting_date";
  if (!facts.time) return "awaiting_time";
  if (!facts.party_size) {
    // Default to party size of 2, but we can ask or assume
    facts.party_size = 2; 
  }
  if (!facts.name || !facts.phone) return "awaiting_contact_information";
  return "awaiting_confirmation";
}


// Integrate Vite as Middleware or serve static built folders

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Intent Runtime listening on http://localhost:${PORT}`);
  });
}

startServer();
