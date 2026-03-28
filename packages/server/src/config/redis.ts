import { logger } from 'app/utils/logs/logger.js';
import Redis from 'ioredis';

export const redis = new Redis(
  process.env.REDIS_URL ?? 'redis://localhost:6379',
  {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  },
);

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error({ err }, 'Redis error'));
