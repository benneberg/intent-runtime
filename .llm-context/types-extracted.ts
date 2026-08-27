// Auto-extracted TypeScript type definitions
// Generated: 2026-08-27 19:02 UTC
// Types annotated with 'used in:' show cross-file import relationships.


// -- src/services/logger.ts --
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface LogPayload {
  level: LogLevel;
  timestamp: string;
  message: string;
  context?: Record<string, any>;
  session_id?: string;
  trace_id?: string;
}


// -- src/store/persistence.ts --
export interface DatabaseState {
  version: number;
  sessions: RuntimeSession[];
  events: RuntimeEvent[];
  telemetry: PromptTelemetry[];
  actionQueue: ActionQueueItem[];
}


// -- src/types.ts --
export type WorkflowState =
  | 'idle'
  | 'awaiting_date'
  | 'awaiting_time'
  | 'awaiting_contact_information'
  | 'awaiting_confirmation'
  | 'completed';
// used in: server.ts, src/App.tsx, src/services/stateMachine.ts

export interface BookingFacts {
  date?: string; // YYYY-MM-DD
  time?: string; // HH:MM
  party_size?: number;
  name?: string;
  phone?: string;
}
// used in: server.ts, src/App.tsx, src/services/stateMachine.ts

export interface RuntimeSession {
  session_id: string;
  current_state: WorkflowState;
  facts: BookingFacts;
  version: number; // Optimistic concurrency control
  created_at: string;
  updated_at: string;
}
// used in: server.ts, src/App.tsx, src/store/persistence.ts

export type RuntimeEventType =
  | 'INPUT_RECEIVED'
  | 'FACTS_EXTRACTED'
  | 'INTENT_PARSED'
  | 'STATE_TRANSITION'
  | 'ACTION_DISPATCHED'
  | 'ACTION_COMPLETED'
  | 'ACTION_FAILED'
  | 'ACTION_RETRIED'
  | 'ACTION_DEAD_LETTER'
  | 'ANOMALY_DETECTED'
  | 'FACTS_OVERRIDDEN';

export interface RuntimeEvent {
  event_id: string;
  session_id: string;
  event_type: RuntimeEventType;
  payload: Record<string, any>;
  telemetry_metadata?: {
    provider: string;
    model: string;
    prompt_version: string;
    latency_ms: number;
    input_tokens: number;
    output_tokens: number;
  };
  created_at: string;
}
// used in: server.ts, src/App.tsx, src/store/persistence.ts

export interface PromptTelemetry {
  id: string;
  provider: string;
  model: string;
  prompt_version: string;
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  created_at: string;
}
// used in: server.ts, src/App.tsx, src/store/persistence.ts

export type ActionType =
  | 'CHECK_AVAILABILITY'
  | 'DISPATCH_CONFIRMATION'
  | 'CREATE_CALENDAR_EVENT'
  | 'DISPATCH_REMINDER';

export type ActionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'dead_letter';
// used in: src/services/actionWorker.ts

export interface ActionQueueItem {
  action_id: string;
  session_id: string;
  action_type: ActionType;
  payload: Record<string, any>;
  status: ActionStatus;
  idempotency_key: string;
  retries: number;
  max_retries: number;
  last_error?: string;
  created_at: string;
  updated_at: string;
}
// used in: server.ts, src/App.tsx, src/services/actionWorker.ts, src/store/persistence.ts

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}
// used in: src/store/persistence.ts

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'system';
  text: string;
  timestamp: string;
}
// used in: src/App.tsx
