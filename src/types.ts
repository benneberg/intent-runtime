export type WorkflowState =
  | 'idle'
  | 'awaiting_date'
  | 'awaiting_time'
  | 'awaiting_contact_information'
  | 'awaiting_confirmation'
  | 'completed';

export interface BookingFacts {
  date?: string; // YYYY-MM-DD
  time?: string; // HH:MM
  party_size?: number;
  name?: string;
  phone?: string;
}

export interface RuntimeSession {
  session_id: string;
  current_state: WorkflowState;
  facts: BookingFacts;
  version: number; // Optimistic concurrency control
  created_at: string;
  updated_at: string;
}

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

export type ActionType =
  | 'CHECK_AVAILABILITY'
  | 'DISPATCH_CONFIRMATION'
  | 'CREATE_CALENDAR_EVENT'
  | 'DISPATCH_REMINDER';

export type ActionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'dead_letter';

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

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'system';
  text: string;
  timestamp: string;
}
