import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { logger } from './services/logger.js';
import { healthCheck, closePool } from './services/database.js';
import { rateLimit } from './middleware/rateLimit.js';
import { authRouter } from './routes/auth.js';
import { profilesRouter } from './routes/profiles.js';
import { candidatesRouter } from './routes/candidates.js';
import { electionsRouter } from './routes/elections.js';
import { statsRouter } from './routes/stats.js';
import { statesRouter } from './routes/states.js';
import { exportRouter } from './routes/export.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// ── Global Middleware ──────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 60 * 60 * 1000, max: 500 }));

// ── Health Check ───────────────────────────────────────────
app.get('/health', async (_req, res) => {
  const dbOk = await healthCheck();
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    database: dbOk ? 'connected' : 'disconnected',
  });
});

// ── API Routes ─────────────────────────────────────────────
app.use('/api/v1/auth', authRouter);
app.use('/api/v1', profilesRouter);
app.use('/api/v1/candidates', candidatesRouter);
app.use('/api/v1/elections', electionsRouter);
app.use('/api/v1/stats', statsRouter);
app.use('/api/v1/states', statesRouter);
app.use('/api/v1/data/export', exportRouter);

// ── 404 Handler ────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Error Handler ──────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start Server ───────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`🏛️  Election Tracker API running on port ${PORT}`);
});

// Graceful shutdown
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, async () => {
    logger.info(`${signal} received — shutting down...`);
    server.close(() => {
      closePool().then(() => {
        logger.info('Server stopped');
        process.exit(0);
      });
    });
  });
}

export default app;