function intEnv(name, fallback, min = 1) {
  const value = Number.parseInt(process.env[name], 10);
  return Number.isFinite(value) && value >= min ? value : fallback;
}

export const config = Object.freeze({
  port: intEnv('PORT', 3000),
  captureConcurrency: intEnv('CAPTURE_CONCURRENCY', 2),
  captureQueueLimit: intEnv('CAPTURE_QUEUE_LIMIT', 20),
  maxOutputPixels: intEnv('MAX_OUTPUT_PIXELS', 100_000_000),
  maxPageHeight: intEnv('MAX_PAGE_HEIGHT', 30_000),
  maxScreenshotBytes: intEnv('MAX_SCREENSHOT_BYTES', 50 * 1024 * 1024),
  navigationTimeoutMs: intEnv('NAVIGATION_TIMEOUT_MS', 30_000),
  historyLimit: intEnv('HISTORY_LIMIT', 30),
  captureRateLimit: intEnv('CAPTURE_RATE_LIMIT', 30),
  captureRateWindowMs: intEnv('CAPTURE_RATE_WINDOW_MS', 60_000),
  corsOrigin: process.env.CORS_ORIGIN || '',
  trustProxyHops: intEnv('TRUST_PROXY_HOPS', 1),
  appUsername: process.env.APP_USERNAME || '',
  appPassword: process.env.APP_PASSWORD || '',
  allowPrivateNetwork: process.env.ALLOW_PRIVATE_NETWORK === 'true',
  exposeTestStatic: process.env.EXPOSE_TEST_STATIC === 'true'
});
