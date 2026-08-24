import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import apiRouter from './routes/api.routes.js';
import { config } from './config.js';
import { browserStatus } from './infrastructure/browser-manager.js';
import { getCaptureQueueStats } from './services/screenshot.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function corsOptions() {
  if (!config.corsOrigin) return { origin: false };
  const allowed = new Set(config.corsOrigin.split(',').map((value) => value.trim()));
  return { origin(origin, callback) { callback(null, !origin || allowed.has(origin)); } };
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });
  app.use(cors(corsOptions()));
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '64kb' }));
  app.use(express.urlencoded({ extended: false, limit: '64kb' }));
  app.use(express.static(path.join(rootDir, 'public')));
  app.use('/storage/screenshots', express.static(path.join(rootDir, 'storage/screenshots'), { fallthrough: false }));
  if (config.exposeTestStatic) app.use('/test-static', express.static(path.join(rootDir, 'test')));
  app.use('/api', apiRouter);
  app.get('/health', (req, res) => res.json({ status: 'ok', browser: browserStatus(), queue: getCaptureQueueStats(), timestamp: new Date().toISOString() }));
  app.get('*', (req, res) => res.sendFile(path.join(rootDir, 'public', 'index.html')));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    console.error(error);
    return res.status(error.status || 500).json({ success: false, code: error.code || 'INTERNAL_ERROR', error: error.message || 'Internal server error' });
  });
  return app;
}
