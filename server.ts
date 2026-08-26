import express, { Request, Response } from "express";
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
} from "./src/types.js";
import { PersistenceStore } from "./src/store/persistence.js";
import { Logger } from "./src/services/logger.js";
import { ActionWorker } from "./src/services/actionWorker.js";
import { adminAuthMiddleware } from "./src/services/auth.js";
import { createRateLimiter } from "./src/services/rateLimiter.js";
import {
  sessionInputSchema,
  factsOverrideSchema,
  sessionResetSchema,
  sessionReplaySchema,
  paginationQuerySchema,
} from "./src/services/validation.js";
import {
  evaluateMissingFields,
  computeNextState,
  generateBotReply,
  parseHeuristicIntentAndFacts,
} from "./src/services/stateMachine.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Security & Parsing Middlewares
app.use(express.json({ limit: "1mb" }));

// Standard Security & CORS Headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Key, X-Request-ID");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// Request Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    if (!req.path.startsWith("/assets") && !req.path.startsWith("/@")) {
      Logger.debug("HTTP Request", {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration_ms: Date.now() - start,
      });
    }
  });
  next();
});

// Rate limiting on conversational input endpoints
const conversationalRateLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 60, // 60 requests per minute per IP
});

// Initialize Persistence Store & Action Worker
const store = PersistenceStore.getInstance();
const actionWorker = ActionWorker.getInstance();
actionWorker.start(1000);

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
        Logger.info("Gemini Client initialized successfully on server-side");
      } catch (e) {
        Logger.error("Failed to initialize Gemini Client", { error: String(e) });
      }
    } else {
      Logger.info("No valid GEMINI_API_KEY found. Operating in deterministic/simulation mode");
    }
  }
  return aiClient;
}

// --- Health Probes & Monitoring Endpoints ---

// 1. Basic Health Check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
  });
});

// 2. Liveness Probe (checks container process is responsive)
app.get("/api/health/live", (req: Request, res: Response) => {
  res.json({
    status: "alive",
    pid: process.pid,
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  });
});

// 3. Readiness Probe (checks dependencies & store readiness)
app.get("/api/health/ready", (req: Request, res: Response) => {
  const stats = store.getStats({ limit: 1 });
  res.json({
    status: "ready",
    store_ready: true,
    gemini_client_configured: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY",
    active_sessions: stats.sessions.length,
    timestamp: new Date().toISOString(),
  });
});

// --- API Endpoints ---

// 1. Get database statistics & paginated audit logs
app.get("/api/db/stats", (req: Request, res: Response) => {
  const queryResult = paginationQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    return res.status(400).json({ error: "Invalid query parameters", details: queryResult.error.format() });
  }

  const { page, limit, session_id } = queryResult.data;
  const stats = store.getStats({ page, limit, session_id });
  res.json(stats);
});

// 2. Reset a session (Protected with Admin Auth)
app.post("/api/session/reset", adminAuthMiddleware, (req: Request, res: Response) => {
  const validation = sessionResetSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: "Validation failed", details: validation.error.format() });
  }

  const targetId = validation.data.session_id || store.generateUUID();
  const session = store.resetSession(targetId);

  Logger.info("Session reset by client", { session_id: targetId });
  res.json({ status: "ok", session });
});

// 3. Main processing endpoint for user conversational input (The Intent Runtime core flow)
app.post("/api/session/input", conversationalRateLimiter, async (req: Request, res: Response) => {
  const validation = sessionInputSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: validation.error.format(),
    });
  }

  const { session_id, text, request_id } = validation.data;

  // Idempotency check: request_id unique validation
  if (request_id) {
    const existingEvent = store.findEvent(
      (e) => e.event_type === "INPUT_RECEIVED" && e.payload.request_id === request_id
    );
    if (existingEvent) {
      Logger.info("Duplicate request resolved via idempotency key", { request_id, session_id });
      const session = store.getSession(session_id);
      return res.json({
        status: "ok",
        warning: "Idempotent duplicate request resolved",
        session,
        events: store.getSessionEvents(session_id),
      });
    }
  }

  // Retrieve or create current session
  let session = store.getOrCreateSession(session_id);
  const startTime = Date.now();
  const nowStr = new Date().toISOString();

  // Step A: Log Input Event
  store.addEvent({
    event_id: store.generateUUID(),
    session_id,
    event_type: "INPUT_RECEIVED",
    payload: { text, request_id: request_id || null },
    created_at: nowStr,
  });

  // Step B: Intent Parsing and Fact Extraction via Gemini or Heuristic simulation
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
      Logger.debug("Running analysis via Gemini model", { modelUsed, session_id });
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
        Format your entire output strictly as a JSON object matching this schema:
        {
          "intent": "REQUEST_BOOKING" | "PROVIDE_INFORMATION" | "CONFIRM" | "REJECT" | "CHITCHAT" | "OTHER",
          "confidence": number,
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
                  phone: { type: Type.STRING },
                },
              },
              reasoning: { type: Type.STRING },
            },
            required: ["intent", "confidence", "facts"],
          },
        },
      });

      const textOutput = response.text?.trim() || "{}";
      const parsed = JSON.parse(textOutput);
      intent = parsed.intent || "OTHER";
      confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.98;

      if (parsed.facts) {
        Object.keys(parsed.facts).forEach((k) => {
          if (parsed.facts[k] !== null && parsed.facts[k] !== undefined) {
            (extractedFacts as any)[k] = parsed.facts[k];
          }
        });
      }
      isSimulated = false;

      inputTokens = Math.floor(systemInstruction.length / 4) + Math.floor(text.length / 4);
      outputTokens = Math.floor(textOutput.length / 4);
    } catch (e) {
      Logger.error("Gemini invocation failed, falling back to rule-based engine", { error: String(e) });
    }
  }

  // Backup Deterministic Rule-Based parsing (Used if no API key or in case of failures)
  if (isSimulated) {
    const heuristic = parseHeuristicIntentAndFacts(text);
    intent = heuristic.intent;
    confidence = heuristic.confidence;
    extractedFacts = heuristic.facts;
    inputTokens = 210;
    outputTokens = 90;
  }

  const latency = Date.now() - startTime;

  // Step C: Log Telemetry & Events
  const telemetryId = store.generateUUID();
  const prompt_version = "v1.0.4-MVP";
  store.addTelemetry({
    id: telemetryId,
    provider: isSimulated ? "internal" : "google",
    model: modelUsed,
    prompt_version,
    latency_ms: latency,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    created_at: new Date().toISOString(),
  });

  store.addEvent({
    event_id: store.generateUUID(),
    session_id,
    event_type: "INTENT_PARSED",
    payload: { intent, confidence, prompt_version },
    telemetry_metadata: {
      provider: isSimulated ? "internal" : "google",
      model: modelUsed,
      prompt_version,
      latency_ms: latency,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    },
    created_at: new Date().toISOString(),
  });

  // Reconcile and merge extracted facts into current facts store
  const mergedFacts = { ...session.facts, ...extractedFacts };

  // Detect Anomaly (e.g. negative party size, zero party size)
  if (mergedFacts.party_size && mergedFacts.party_size <= 0) {
    store.addEvent({
      event_id: store.generateUUID(),
      session_id,
      event_type: "ANOMALY_DETECTED",
      payload: { field: "party_size", value: mergedFacts.party_size, error: "Party size must be a positive integer" },
      created_at: new Date().toISOString(),
    });
    delete mergedFacts.party_size;
  }

  // Update session atomically with version bump
  store.updateSession(session_id, (s) => {
    s.facts = mergedFacts;
  });

  store.addEvent({
    event_id: store.generateUUID(),
    session_id,
    event_type: "FACTS_EXTRACTED",
    payload: { newly_extracted: extractedFacts, merged_state: mergedFacts },
    created_at: new Date().toISOString(),
  });

  // Step D: Evaluate State Machine Transitions Deterministically
  const oldState = session.current_state;
  const nextState = computeNextState(oldState, intent, mergedFacts, extractedFacts);

  if (intent === "REJECT") {
    store.updateSession(session_id, (s) => {
      s.facts = {};
      s.current_state = "idle";
    });
  } else {
    store.updateSession(session_id, (s) => {
      s.current_state = nextState;
    });
  }

  // Reload latest session
  session = store.getSession(session_id)!;

  // Log state transition if changed
  if (oldState !== nextState) {
    store.addEvent({
      event_id: store.generateUUID(),
      session_id,
      event_type: "STATE_TRANSITION",
      payload: { from: oldState, to: nextState, trigger_intent: intent },
      created_at: new Date().toISOString(),
    });

    // Trigger Side-Effect Actions asynchronously based on states
    if (nextState === "completed") {
      // 1. Create Calendar Event Job
      store.addAction({
        action_id: store.generateUUID(),
        session_id,
        action_type: "CREATE_CALENDAR_EVENT",
        payload: {
          date: mergedFacts.date,
          time: mergedFacts.time,
          summary: `Booking for ${mergedFacts.name || "Guest"} - ${mergedFacts.party_size || 2} persons`,
        },
        status: "pending",
        idempotency_key: store.generateUUID(),
        retries: 0,
        max_retries: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // 2. Dispatch Booking Confirmation Notification
      store.addAction({
        action_id: store.generateUUID(),
        session_id,
        action_type: "DISPATCH_CONFIRMATION",
        payload: {
          name: mergedFacts.name,
          phone: mergedFacts.phone,
          details: `${mergedFacts.date} at ${mergedFacts.time} (${mergedFacts.party_size} guests)`,
        },
        status: "pending",
        idempotency_key: store.generateUUID(),
        retries: 0,
        max_retries: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } else if (
      mergedFacts.date &&
      mergedFacts.time &&
      (oldState === "awaiting_date" || oldState === "awaiting_time" || oldState === "idle")
    ) {
      // Dispatch live booking availability check
      store.addAction({
        action_id: store.generateUUID(),
        session_id,
        action_type: "CHECK_AVAILABILITY",
        payload: { date: mergedFacts.date, time: mergedFacts.time },
        status: "pending",
        idempotency_key: store.generateUUID(),
        retries: 0,
        max_retries: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  // Step E: Formulate Conversation Reply
  const botReply = generateBotReply(nextState, mergedFacts);

  res.json({
    status: "ok",
    session,
    reply: botReply,
    intent,
    confidence,
    extractedFacts,
  });
});

// 4. Manual override of session facts with strict schema validation and optimistic concurrency
app.post("/api/session/facts/override", adminAuthMiddleware, (req: Request, res: Response) => {
  const validation = factsOverrideSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: "Validation failed for override facts",
      details: validation.error.format(),
    });
  }

  const { session_id, facts, expected_version } = validation.data;
  const session = store.getSession(session_id);
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  const previousFacts = { ...session.facts };
  const updatedFacts = { ...session.facts };

  if (facts.name !== undefined) {
    updatedFacts.name = facts.name === "" || facts.name === null ? undefined : facts.name;
  }
  if (facts.phone !== undefined) {
    updatedFacts.phone = facts.phone === "" || facts.phone === null ? undefined : facts.phone;
  }
  if (facts.date !== undefined) {
    updatedFacts.date = facts.date === "" || facts.date === null ? undefined : facts.date;
  }
  if (facts.time !== undefined) {
    updatedFacts.time = facts.time === "" || facts.time === null ? undefined : facts.time;
  }
  if (facts.party_size !== undefined) {
    if (facts.party_size === "" || facts.party_size === null) {
      updatedFacts.party_size = undefined;
    } else {
      updatedFacts.party_size = Number(facts.party_size);
    }
  }

  const oldState = session.current_state;
  const nextState = evaluateMissingFields(updatedFacts);

  const updateResult = store.updateSession(
    session_id,
    (s) => {
      s.facts = updatedFacts;
      s.current_state = nextState;
    },
    expected_version
  );

  if (!updateResult.success) {
    return res.status(409).json({ error: updateResult.error });
  }

  const nowStr = new Date().toISOString();
  store.addEvent({
    event_id: store.generateUUID(),
    session_id,
    event_type: "FACTS_OVERRIDDEN",
    payload: {
      previous_facts: previousFacts,
      overridden_facts: updatedFacts,
      state_transition: { from: oldState, to: nextState },
    },
    created_at: nowStr,
  });

  if (oldState !== nextState) {
    store.addEvent({
      event_id: store.generateUUID(),
      session_id,
      event_type: "STATE_TRANSITION",
      payload: { from: oldState, to: nextState, trigger_intent: "MANUAL_OVERRIDE" },
      created_at: nowStr,
    });
  }

  Logger.info("Facts manually overridden for session", { session_id, nextState });
  res.json({ status: "ok", session: updateResult.session });
});

// 5. Workflow Replay Engine (Reconstruct past sessions step-by-step to audit discrepancies)
app.post("/api/session/replay", (req: Request, res: Response) => {
  const validation = sessionReplaySchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: "Validation failed", details: validation.error.format() });
  }

  const { session_id } = validation.data;
  const sessionEvents = store.getSessionEvents(session_id);

  let currentState: WorkflowState = "idle";
  let currentFacts: BookingFacts = {};
  const steps: any[] = [];

  const inputs = sessionEvents.filter((e) => e.event_type === "INPUT_RECEIVED");

  inputs.forEach((inputEvent, index) => {
    const inputText = inputEvent.payload.text;
    const inputTime = inputEvent.created_at;

    const currentInputIdx = sessionEvents.indexOf(inputEvent);
    const nextInputEvent = inputs[index + 1];
    const nextInputIdx = nextInputEvent ? sessionEvents.indexOf(nextInputEvent) : sessionEvents.length;

    const turnEvents = sessionEvents.slice(currentInputIdx + 1, nextInputIdx);

    const factsEvent = turnEvents.find((e) => e.event_type === "FACTS_EXTRACTED");
    const intentEvent = turnEvents.find((e) => e.event_type === "INTENT_PARSED");
    const transitionEvent = turnEvents.find((e) => e.event_type === "STATE_TRANSITION");

    const newlyExtracted = factsEvent?.payload?.newly_extracted || {};
    const historicalMerged = factsEvent?.payload?.merged_state || {};
    const historicalNextState = transitionEvent?.payload?.to || currentState;
    const intent = intentEvent?.payload?.intent || "OTHER";

    const simulatedOldState = currentState;
    const simulatedFacts = { ...currentFacts, ...newlyExtracted };
    const simulatedNextState = computeNextState(simulatedOldState, intent, simulatedFacts, newlyExtracted);

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
      discrepancy,
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
    has_discrepancies: steps.some((s) => s.discrepancy),
  });
});

// --- Server Lifecycle & Vite Middleware Integration ---

let serverInstance: any = null;

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

  serverInstance = app.listen(PORT, "0.0.0.0", () => {
    Logger.info(`Intent Runtime listening on http://localhost:${PORT}`);
  });
}

// Graceful Shutdown Handler
async function handleShutdown(signal: string) {
  Logger.info(`Received ${signal}. Initiating graceful shutdown...`);
  if (serverInstance) {
    serverInstance.close(async () => {
      Logger.info("HTTP server closed.");
      await actionWorker.gracefulShutdown(3000);
      store.flushSync();
      Logger.info("Graceful shutdown complete.");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));

startServer();
