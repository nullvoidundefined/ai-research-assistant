import { redis } from 'app/config/redis.js';
import { Queue } from 'bullmq';

export const sourceIngestQueue = new Queue('source-ingest', {
  connection: redis,
});
export const conversationTitleQueue = new Queue('conversation-title', {
  connection: redis,
});
