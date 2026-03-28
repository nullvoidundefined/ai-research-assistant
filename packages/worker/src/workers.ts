import { redis } from 'app/config/redis.js';
import { processSourceIngest } from 'app/processors/source-ingestor.js';
import { generateConversationTitle } from 'app/processors/title-generator.js';
import { logger } from 'app/utils/logger.js';
import { Worker } from 'bullmq';

const sourceIngestWorker = new Worker(
  'source-ingest',
  async (job) => {
    logger.info(
      { jobId: job.id, data: job.data },
      'Processing source-ingest job',
    );
    await processSourceIngest(job.data);
  },
  {
    connection: redis,
    concurrency: 3,
  },
);

const conversationTitleWorker = new Worker(
  'conversation-title',
  async (job) => {
    logger.info(
      { jobId: job.id, data: job.data },
      'Processing conversation-title job',
    );
    await generateConversationTitle(job.data);
  },
  {
    connection: redis,
    concurrency: 5,
  },
);

sourceIngestWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'source-ingest job completed');
});

sourceIngestWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'source-ingest job failed');
});

conversationTitleWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'conversation-title job completed');
});

conversationTitleWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'conversation-title job failed');
});

logger.info('Worker started, listening for jobs');

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down workers');
  await sourceIngestWorker.close();
  await conversationTitleWorker.close();
  process.exit(0);
});
