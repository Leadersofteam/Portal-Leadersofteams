import { pino } from 'pino';

import type { AppConfig } from './config';

export function createLogger(config: Pick<AppConfig, 'LOG_LEVEL' | 'isProduction'>) {
  return pino({
    level: config.LOG_LEVEL,
    ...(config.isProduction
      ? {}
      : {
          transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss' } },
        }),
    redact: ['req.headers.cookie', 'req.headers.authorization'],
  });
}

export type Logger = ReturnType<typeof createLogger>;
