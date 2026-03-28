import { isDevelopment } from 'app/config/env.js';
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  }),
});
