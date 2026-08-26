import { ActionQueueItem, ActionStatus } from "../types.js";
import { PersistenceStore } from "../store/persistence.js";
import { Logger } from "./logger.js";

export class ActionWorker {
  private static instance: ActionWorker;
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private isShuttingDown = false;
  private store: PersistenceStore;
  private activeJobsCount = 0;

  private constructor() {
    this.store = PersistenceStore.getInstance();
  }

  static getInstance(): ActionWorker {
    if (!ActionWorker.instance) {
      ActionWorker.instance = new ActionWorker();
    }
    return ActionWorker.instance;
  }

  start(intervalMs = 1000) {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.processQueue(), intervalMs);
    Logger.info("ActionWorker background scheduler started", { intervalMs });
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async gracefulShutdown(timeoutMs = 5000): Promise<void> {
    this.isShuttingDown = true;
    this.stop();
    Logger.info("ActionWorker draining in-flight jobs...", { activeJobsCount: this.activeJobsCount });

    const startTime = Date.now();
    while (this.activeJobsCount > 0 && Date.now() - startTime < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.store.flushSync();
    Logger.info("ActionWorker shutdown completed cleanly", {
      remainingJobs: this.activeJobsCount,
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.isShuttingDown) return;
    this.isProcessing = true;

    try {
      const actions = this.store.getActions();
      // Find pending actions or failed actions that are eligible for retry
      const pendingActions = actions.filter((a) => a.status === "pending");

      for (const action of pendingActions) {
        if (this.isShuttingDown) break;
        this.executeAction(action);
      }
    } catch (err) {
      Logger.error("Error during processQueue execution", { error: String(err) });
    } finally {
      this.isProcessing = false;
    }
  }

  private executeAction(action: ActionQueueItem) {
    this.activeJobsCount++;
    this.store.updateAction(action.action_id, (a) => {
      a.status = "running";
      a.updated_at = new Date().toISOString();
    });

    this.store.addEvent({
      event_id: this.store.generateUUID(),
      session_id: action.session_id,
      event_type: "ACTION_DISPATCHED",
      payload: {
        action_id: action.action_id,
        action_type: action.action_type,
        payload: action.payload,
        attempt: (action.retries || 0) + 1,
      },
      created_at: new Date().toISOString(),
    });

    // Simulate async execution with retry & DLQ support
    const delay = 1200;
    setTimeout(() => {
      try {
        // 95% simulated success rate
        const isSuccess = Math.random() < 0.95;

        if (isSuccess) {
          this.store.updateAction(action.action_id, (a) => {
            a.status = "completed";
            a.updated_at = new Date().toISOString();
          });

          this.store.addEvent({
            event_id: this.store.generateUUID(),
            session_id: action.session_id,
            event_type: "ACTION_COMPLETED",
            payload: {
              action_id: action.action_id,
              action_type: action.action_type,
              result: "Operation completed successfully",
            },
            created_at: new Date().toISOString(),
          });

          Logger.info("Action executed successfully", {
            action_id: action.action_id,
            action_type: action.action_type,
          });
        } else {
          // Failure flow
          const retries = (action.retries || 0) + 1;
          const maxRetries = action.max_retries || 3;
          const errorMsg = "Integration server returned 503 Service Unavailable";

          if (retries < maxRetries) {
            // Re-queue with backoff
            this.store.updateAction(action.action_id, (a) => {
              a.status = "pending";
              a.retries = retries;
              a.last_error = errorMsg;
              a.updated_at = new Date().toISOString();
            });

            this.store.addEvent({
              event_id: this.store.generateUUID(),
              session_id: action.session_id,
              event_type: "ACTION_RETRIED",
              payload: {
                action_id: action.action_id,
                action_type: action.action_type,
                retries,
                max_retries: maxRetries,
                error: errorMsg,
              },
              created_at: new Date().toISOString(),
            });

            Logger.warn("Action failed, retrying with backoff", {
              action_id: action.action_id,
              retries,
              maxRetries,
            });
          } else {
            // Move to Dead-Letter Queue
            this.store.updateAction(action.action_id, (a) => {
              a.status = "dead_letter";
              a.retries = retries;
              a.last_error = errorMsg;
              a.updated_at = new Date().toISOString();
            });

            this.store.addEvent({
              event_id: this.store.generateUUID(),
              session_id: action.session_id,
              event_type: "ACTION_DEAD_LETTER",
              payload: {
                action_id: action.action_id,
                action_type: action.action_type,
                retries,
                error: "Max retry limit reached. Routed to Dead-Letter Queue (DLQ)",
              },
              created_at: new Date().toISOString(),
            });

            Logger.error("Action permanently failed and routed to DLQ", {
              action_id: action.action_id,
              action_type: action.action_type,
            });
          }
        }
      } catch (err) {
        Logger.error("Unexpected error in action execution callback", { error: String(err) });
      } finally {
        this.activeJobsCount = Math.max(0, this.activeJobsCount - 1);
      }
    }, delay);
  }
}
