import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import apiRouter from './routes/api.routes.js';
import { config } from './config.js';
import { browserStatus, getBrowser } from './infrastructure/browser-manager.js';
import { checkStorageReady, getCaptureQueueStats } from './services/screenshot.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function corsOptions() {
  if (!config.corsOrigin) return { origin: false };
  const allowed = new Set(config.corsOrigin.split(',').map((value) => value.trim()));
  return { origin(origin, callback) { callback(null, !origin || allowed.has(origin)); } };
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function hasValidBasicCredentials(header, username = config.appUsername, password = config.appPassword) {
  if (!username || !password) return true;
  if (!header?.startsWith('Basic ')) return false;
  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    if (separator < 0) return false;
    return safeEqual(decoded.slice(0, separator), username) && safeEqual(decoded.slice(separator + 1), password);
  } catch { return false; }
}

function optionalBasicAuth(req, res, next) {
  if (hasValidBasicCredentials(req.headers.authorization)) return next();
  res.setHeader('WWW-Authenticate', 'Basic realm="Zoe Screenshot", charset="UTF-8"');
  return res.status(401).send('Authentication required');
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (process.env.NODE_ENV === 'production') app.set('trust proxy', config.trustProxyHops);
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });
  app.use(cors(corsOptions()));
  const productionLog = ':remote-addr [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":user-agent" :response-time ms';
  app.use(morgan(process.env.NODE_ENV === 'production' ? productionLog : 'dev'));
  app.use(express.json({ limit: '64kb' }));
  app.use(express.urlencoded({ extended: false, limit: '64kb' }));
  app.get('/health', (req, res) => res.json({ status: 'ok', queue: getCaptureQueueStats(), timestamp: new Date().toISOString() }));
  app.get('/ready', async (req, res) => {
    try {
      await Promise.all([getBrowser(), checkStorageReady()]);
      return res.json({ status: 'ready', browser: browserStatus(), queue: getCaptureQueueStats(), timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('Readiness check failed:', error);
      return res.status(503).json({ status: 'not_ready', error: 'Browser or storage is unavailable' });
    }
  });
  app.use(optionalBasicAuth);
  app.use(express.static(path.join(rootDir, 'public')));
  app.use('/storage/screenshots', express.static(path.join(rootDir, 'storage/screenshots'), { fallthrough: false }));
  if (config.exposeTestStatic) app.use('/test-static', express.static(path.join(rootDir, 'test')));
  app.use('/api', apiRouter);
  app.get('*', (req, res) => res.sendFile(path.join(rootDir, 'public', 'index.html')));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    console.error(error);
    return res.status(error.status || 500).json({ success: false, code: error.code || 'INTERNAL_ERROR', error: error.message || 'Internal server error' });
  });
  return app;
}
