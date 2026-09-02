// Logger centralizzato: in sviluppo stampa su console in modo leggibile,
// in produzione invia (o potrà inviare) a un provider esterno tipo Sentry.
// Sostituisce i vari console.error/warn/log sparsi nelle Server Action.

type LogContext = Record<string, unknown>;

const isProd = process.env.NODE_ENV === 'production';

function format(level: string, message: string, context?: LogContext) {
  const timestamp = new Date().toISOString();
  return { timestamp, level, message, ...(context ? { context } : {}) };
}

function reportToProvider(_entry: ReturnType<typeof format>) {
  // Hook per un provider di error tracking in produzione, es. Sentry:
  //
  // import * as Sentry from '@sentry/nextjs';
  // if (_entry.level === 'error') {
  //   Sentry.captureMessage(_entry.message, { level: 'error', extra: _entry.context });
  // }
}

export const logger = {
  info(message: string, context?: LogContext) {
    const entry = format('info', message, context);
    if (!isProd) {
      console.log(`[INFO] ${entry.timestamp} - ${message}`, context ?? '');
    } else {
      reportToProvider(entry);
    }
  },

  warn(message: string, context?: LogContext) {
    const entry = format('warn', message, context);
    if (!isProd) {
      console.warn(`[WARN] ${entry.timestamp} - ${message}`, context ?? '');
    } else {
      reportToProvider(entry);
    }
  },

  error(message: string, error?: unknown, context?: LogContext) {
    const errorInfo =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error;
    const entry = format('error', message, { ...(context ?? {}), error: errorInfo });
    if (!isProd) {
      console.error(`[ERROR] ${entry.timestamp} - ${message}`, errorInfo ?? '', context ?? '');
    } else {
      reportToProvider(entry);
    }
  },
};
