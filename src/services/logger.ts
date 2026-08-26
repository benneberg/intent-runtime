export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface LogPayload {
  level: LogLevel;
  timestamp: string;
  message: string;
  context?: Record<string, any>;
  session_id?: string;
  trace_id?: string;
}

export class Logger {
  private static format(level: LogLevel, message: string, context?: Record<string, any>, session_id?: string, trace_id?: string): string {
    const entry: LogPayload = {
      level,
      timestamp: new Date().toISOString(),
      message,
      ...(session_id ? { session_id } : {}),
      ...(trace_id ? { trace_id } : {}),
      ...(context ? { context } : {}),
    };
    return JSON.stringify(entry);
  }

  static info(message: string, context?: Record<string, any>, session_id?: string, trace_id?: string) {
    console.log(this.format('INFO', message, context, session_id, trace_id));
  }

  static warn(message: string, context?: Record<string, any>, session_id?: string, trace_id?: string) {
    console.warn(this.format('WARN', message, context, session_id, trace_id));
  }

  static error(message: string, context?: Record<string, any>, session_id?: string, trace_id?: string) {
    console.error(this.format('ERROR', message, context, session_id, trace_id));
  }

  static debug(message: string, context?: Record<string, any>, session_id?: string, trace_id?: string) {
    if (process.env.DEBUG === 'true' || process.env.NODE_ENV !== 'production') {
      console.debug(this.format('DEBUG', message, context, session_id, trace_id));
    }
  }
}
