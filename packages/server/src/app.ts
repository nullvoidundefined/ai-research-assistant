import { corsDevConfig } from 'app/config/corsConfig.js';
import { query } from 'app/db/pool/pool.js';
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
  app.listen(PORT, () => {
    logger.info({ port: String(PORT) }, 'Server started');
  });
}

export default app;
