import {
  conversationTitleQueue,
  sourceIngestQueue,
} from 'app/config/bullmq.js';
import { corsDevConfig } from 'app/config/corsConfig.js';
import { redis } from 'app/config/redis.js';
import pool, { query } from 'app/db/pool/pool.js';
import { getPublicCollection } from 'app/handlers/collections/collections.js';
import { errorHandler } from 'app/middleware/errorHandler/errorHandler.js';
import { notFoundHandler } from 'app/middleware/notFoundHandler/notFoundHandler.js';
import { requestLogger } from 'app/middleware/requestLogger/requestLogger.js';
import authRouter from 'app/routes/auth.js';
import chatRouter from 'app/routes/chat.js';
import collectionsRouter from 'app/routes/collections.js';
import conversationsRouter from 'app/routes/conversations.js';
import sourcesRouter from 'app/routes/sources.js';
import tagsRouter from 'app/routes/tags.js';
import { logger } from 'app/utils/logs/logger.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import type { Server } from 'node:http';

function validateEnv(): void {
  const required = [
    'DATABASE_URL',
    'SESSION_SECRET',
    'ANTHROPIC_API_KEY',
    'VOYAGE_API_KEY',
  ];
  if (process.env.NODE_ENV === 'production') {
    required.push(
      'CORS_ORIGIN',
      'REDIS_URL',
      'CLOUDFLARE_ACCOUNT_ID',
      'CLOUDFLARE_R2_BUCKET',
      'CLOUDFLARE_R2_ACCESS_KEY_ID',
      'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
    );
  }
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    logger.error({ missing }, 'Missing required environment variables');
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(helmet());
app.use(cors(corsDevConfig));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    name: 'sid',
    secret: process.env.SESSION_SECRET ?? 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);
app.use(requestLogger);

// 30-second request timeout — exempt SSE streaming endpoints
app.use((req, res, next) => {
  if (
    req.headers.accept === 'text/event-stream' ||
    req.path.includes('/stream') ||
    req.path.includes('/chat')
  ) {
    return next();
  }
  req.setTimeout(30_000);
  res.setTimeout(30_000);
  next();
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/health/ready', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.status(200).json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'disconnected' });
  }
});

app.use('/auth', authRouter);
app.use('/sources', sourcesRouter);
app.use('/tags', tagsRouter);
app.use('/collections', collectionsRouter);
app.get('/collections/public/:token', getPublicCollection);
app.use('/chat', chatRouter);
app.use('/conversations', conversationsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export function startServer() {
  validateEnv();

  const server: Server = app.listen(PORT, () => {
    logger.info({ port: String(PORT) }, 'Server started');
  });

  async function gracefulShutdown(signal: string) {
    logger.info({ signal }, 'Received shutdown signal, closing gracefully');

    server.close(() => {
      logger.info('HTTP server closed');
    });

    try {
      await sourceIngestQueue.close();
      await conversationTitleQueue.close();
      logger.info('BullMQ queues closed');
    } catch (err) {
      logger.error({ err }, 'Error closing BullMQ queues');
    }

    try {
      await redis.quit();
      logger.info('Redis connection closed');
    } catch (err) {
      logger.error({ err }, 'Error closing Redis connection');
    }

    try {
      await pool.end();
      logger.info('Database pool drained');
    } catch (err) {
      logger.error({ err }, 'Error draining database pool');
    }

    process.exit(0);
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

export { app };
export default app;
