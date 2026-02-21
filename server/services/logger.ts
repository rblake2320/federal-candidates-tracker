const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type LogLevel = keyof typeof LOG_LEVELS;

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: string, msg: string, ...args: unknown[]): string {
  const extra = args.length > 0
    ? ' ' + args.map(a => (a instanceof Error ? a.stack || a.message : JSON.stringify(a))).join(' ')
    : '';
  return `[${formatTimestamp()}] ${level.toUpperCase().padEnd(5)} ${msg}${extra}`;
}

export const logger = {
  debug(msg: string, ...args: unknown[]) {
    if (shouldLog('debug')) console.debug(formatMessage('debug', msg, ...args));
  },
  info(msg: string, ...args: unknown[]) {
    if (shouldLog('info')) console.info(formatMessage('info', msg, ...args));
  },
  warn(msg: string, ...args: unknown[]) {
    if (shouldLog('warn')) console.warn(formatMessage('warn', msg, ...args));
  },
  error(msg: string, ...args: unknown[]) {
    if (shouldLog('error')) console.error(formatMessage('error', msg, ...args));
  },
};