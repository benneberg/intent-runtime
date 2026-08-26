import fs from "fs";
import path from "path";
import {
  RuntimeSession,
  RuntimeEvent,
  PromptTelemetry,
  ActionQueueItem,
  PaginationMetadata,
} from "../types.js";
import { Logger } from "../services/logger.js";

export interface DatabaseState {
  version: number;
  sessions: RuntimeSession[];
  events: RuntimeEvent[];
  telemetry: PromptTelemetry[];
  actionQueue: ActionQueueItem[];
}

export class PersistenceStore {
  private static instance: PersistenceStore;
  private filePath: string;
  private state: DatabaseState;
  private saveDebounceTimer: NodeJS.Timeout | null = null;
  private maxEventHistory = 2000;
  private maxTelemetryHistory = 1000;

  private constructor() {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (err) {
        Logger.error("Failed to create data directory", { error: String(err) });
      }
    }
    this.filePath = path.join(dataDir, "runtime_store.json");
    this.state = this.loadFromDisk();
    this.ensureSeed();
  }

  static getInstance(): PersistenceStore {
    if (!PersistenceStore.instance) {
      PersistenceStore.instance = new PersistenceStore();
    }
    return PersistenceStore.instance;
  }

  private loadFromDisk(): DatabaseState {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        const parsed = JSON.parse(raw);
        Logger.info("Loaded persistent database from disk", {
          sessionsCount: parsed.sessions?.length || 0,
          eventsCount: parsed.events?.length || 0,
        });
        return {
          version: parsed.version || 1,
          sessions: (parsed.sessions || []).map((s: any) => ({
            ...s,
            version: s.version ?? 1,
          })),
          events: parsed.events || [],
          telemetry: parsed.telemetry || [],
          actionQueue: parsed.actionQueue || [],
        };
      }
    } catch (e) {
      Logger.error("Failed to parse persistent store from disk, initializing fresh store", {
        error: String(e),
      });
    }

    return {
      version: 1,
      sessions: [],
      events: [],
      telemetry: [],
      actionQueue: [],
    };
  }

  private ensureSeed() {
    if (this.state.sessions.length === 0) {
      const defaultSessionId = "demo-session-id-123456789";
      const now = new Date().toISOString();

      this.state.sessions.push({
        session_id: defaultSessionId,
        current_state: "idle",
        facts: {},
        version: 1,
        created_at: now,
        updated_at: now,
      });

      this.state.events.push({
        event_id: this.generateUUID(),
        session_id: defaultSessionId,
        event_type: "STATE_TRANSITION",
        payload: { from: "none", to: "idle", reason: "Session initialized" },
        created_at: now,
      });

      this.scheduleSave();
    }
  }

  generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private scheduleSave() {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    this.saveDebounceTimer = setTimeout(() => {
      this.flushSync();
    }, 500);
  }

  flushSync() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), "utf-8");
      Logger.debug("State saved to disk successfully", { filePath: this.filePath });
    } catch (err) {
      Logger.error("Failed to write persistence file to disk", { error: String(err) });
    }
  }

  // --- Sessions Operations ---

  getSession(sessionId: string): RuntimeSession | undefined {
    return this.state.sessions.find((s) => s.session_id === sessionId);
  }

  getOrCreateSession(sessionId: string): RuntimeSession {
    let session = this.getSession(sessionId);
    if (!session) {
      const now = new Date().toISOString();
      session = {
        session_id: sessionId,
        current_state: "idle",
        facts: {},
        version: 1,
        created_at: now,
        updated_at: now,
      };
      this.state.sessions.push(session);
      this.scheduleSave();
    }
    return session;
  }

  updateSession(
    sessionId: string,
    updater: (session: RuntimeSession) => void,
    expectedVersion?: number
  ): { success: boolean; session?: RuntimeSession; error?: string } {
    const session = this.getSession(sessionId);
    if (!session) {
      return { success: false, error: "Session not found" };
    }

    // Optimistic Concurrency Control Check
    if (expectedVersion !== undefined && session.version !== expectedVersion) {
      return {
        success: false,
        error: `Concurrency conflict: session version is ${session.version}, expected ${expectedVersion}`,
      };
    }

    updater(session);
    session.version = (session.version || 0) + 1;
    session.updated_at = new Date().toISOString();
    this.scheduleSave();
    return { success: true, session };
  }

  resetSession(sessionId: string): RuntimeSession {
    const now = new Date().toISOString();
    this.state.sessions = this.state.sessions.filter((s) => s.session_id !== sessionId);
    this.state.events = this.state.events.filter((e) => e.session_id !== sessionId);
    this.state.actionQueue = this.state.actionQueue.filter((a) => a.session_id !== sessionId);

    const newSession: RuntimeSession = {
      session_id: sessionId,
      current_state: "idle",
      facts: {},
      version: 1,
      created_at: now,
      updated_at: now,
    };
    this.state.sessions.push(newSession);

    this.addEvent({
      event_id: this.generateUUID(),
      session_id: sessionId,
      event_type: "STATE_TRANSITION",
      payload: { from: "none", to: "idle", reason: "Session reset by user" },
      created_at: now,
    });

    this.scheduleSave();
    return newSession;
  }

  // --- Events Operations ---

  addEvent(event: RuntimeEvent): RuntimeEvent {
    this.state.events.push(event);
    if (this.state.events.length > this.maxEventHistory) {
      this.state.events = this.state.events.slice(-this.maxEventHistory);
    }
    this.scheduleSave();
    return event;
  }

  findEvent(predicate: (e: RuntimeEvent) => boolean): RuntimeEvent | undefined {
    return this.state.events.find(predicate);
  }

  getSessionEvents(sessionId: string): RuntimeEvent[] {
    return this.state.events
      .filter((e) => e.session_id === sessionId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  // --- Telemetry Operations ---

  addTelemetry(item: PromptTelemetry): PromptTelemetry {
    this.state.telemetry.push(item);
    if (this.state.telemetry.length > this.maxTelemetryHistory) {
      this.state.telemetry = this.state.telemetry.slice(-this.maxTelemetryHistory);
    }
    this.scheduleSave();
    return item;
  }

  // --- Action Queue Operations ---

  addAction(action: ActionQueueItem): ActionQueueItem {
    this.state.actionQueue.push(action);
    this.scheduleSave();
    return action;
  }

  getActions(): ActionQueueItem[] {
    return this.state.actionQueue;
  }

  updateAction(actionId: string, updater: (action: ActionQueueItem) => void) {
    const action = this.state.actionQueue.find((a) => a.action_id === actionId);
    if (action) {
      updater(action);
      action.updated_at = new Date().toISOString();
      this.scheduleSave();
    }
  }

  // --- Stats and Paginated Queries ---

  getStats(query?: { page?: number; limit?: number; session_id?: string }) {
    const page = query?.page || 1;
    const limit = query?.limit || 50;
    const sessionId = query?.session_id;

    let filteredEvents = this.state.events;
    let filteredTelemetry = this.state.telemetry;
    let filteredActions = this.state.actionQueue;

    if (sessionId) {
      filteredEvents = filteredEvents.filter((e) => e.session_id === sessionId);
      filteredActions = filteredActions.filter((a) => a.session_id === sessionId);
    }

    const sortedEvents = [...filteredEvents].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const sortedTelemetry = [...filteredTelemetry].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const sortedActions = [...filteredActions].sort((a, b) => b.created_at.localeCompare(a.created_at));

    const offset = (page - 1) * limit;
    const paginatedEvents = sortedEvents.slice(offset, offset + limit);

    const pagination: PaginationMetadata = {
      page,
      limit,
      total: sortedEvents.length,
      has_more: offset + limit < sortedEvents.length,
    };

    return {
      sessions: this.state.sessions,
      events: paginatedEvents,
      telemetry: sortedTelemetry.slice(0, 100),
      actionQueue: sortedActions.slice(0, 100),
      pagination,
    };
  }
}
