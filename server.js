import { createApp } from './src/app.js';
import { config } from './src/config.js';
import { closeBrowser } from './src/infrastructure/browser-manager.js';

const app = createApp();
const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 Screenshot Tool server running at http://0.0.0.0:${config.port}`);
  console.log(`🌐 API Endpoint: http://0.0.0.0:${config.port}/api/screenshot`);
  console.log(`====================================================`);
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down...`);
  server.close(async () => { await closeBrowser(); process.exit(0); });
  setTimeout(async () => { await closeBrowser(); process.exit(1); }, 10_000).unref();
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));
