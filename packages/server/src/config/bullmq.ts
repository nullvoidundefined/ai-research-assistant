import { Queue } from "bullmq";
import { redis } from "app/config/redis.js";

export const sourceIngestQueue = new Queue("source-ingest", { connection: redis });
export const conversationTitleQueue = new Queue("conversation-title", { connection: redis });
