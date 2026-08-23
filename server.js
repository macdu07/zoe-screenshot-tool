import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './src/routes/api.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/storage/screenshots', express.static(path.join(__dirname, 'storage/screenshots')));
app.use('/test-static', express.static(path.join(__dirname, 'test')));

// API Routes
app.use('/api', apiRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Screenshot Tool server running at http://localhost:${PORT}`);
  console.log(`🌐 API Endpoint: http://localhost:${PORT}/api/screenshot`);
  console.log(`📷 Direct API:   http://localhost:${PORT}/api/screenshot/direct?url=https://github.com`);
  console.log(`====================================================`);
});
