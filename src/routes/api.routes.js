import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  captureScreenshot,
  getHistory,
  deleteScreenshot,
  clearAllHistory,
} from '../services/screenshot.service.js';
import { config } from '../config.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = path.resolve(__dirname, '../../storage/screenshots');
const rateWindows = new Map();

function captureRateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  let window = rateWindows.get(key);
  if (!window || window.resetAt <= now) window = { count: 0, resetAt: now + config.captureRateWindowMs };
  window.count++;
  rateWindows.set(key, window);
  res.setHeader('RateLimit-Limit', config.captureRateLimit);
  res.setHeader('RateLimit-Remaining', Math.max(0, config.captureRateLimit - window.count));
  res.setHeader('RateLimit-Reset', Math.ceil(window.resetAt / 1000));
  if (rateWindows.size > 10_000) for (const [entryKey, entry] of rateWindows) if (entry.resetAt <= now) rateWindows.delete(entryKey);
  if (window.count > config.captureRateLimit) return res.status(429).json({ success: false, code: 'RATE_LIMITED', error: 'Too many capture requests. Please try again later.' });
  return next();
}

/**
 * POST /api/screenshot
 * Main screenshot capture endpoint (JSON response)
 */
router.post('/screenshot', captureRateLimit, async (req, res) => {
  try {
    const {
      url,
      width,
      height,
      format = 'png',
      quality = 90,
      fullPage = true,
      scale = 2,
      delay = 0,
      blockBanners = true,
      waitAnimations = true,
      colorScheme = 'no-preference',
      isMobile = false
    } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, error: 'Website URL is required' });
    }

    const result = await captureScreenshot({
      url,
      width: parseInt(width, 10),
      height: parseInt(height, 10),
      format,
      quality: parseInt(quality, 10),
      fullPage: fullPage === true || fullPage === 'true',
      scale: parseFloat(scale) || 2,
      delay: parseInt(delay, 10) || 0,
      blockBanners: blockBanners === true || blockBanners === 'true',
      waitAnimations: waitAnimations === true || waitAnimations === 'true',
      colorScheme,
      isMobile: isMobile === true || isMobile === 'true',
      ownerId: req.captureOwnerId
    });

    return res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Screenshot capture failed:', error);
    return res.status(error.status || 500).json({
      success: false,
      code: error.code || 'CAPTURE_FAILED',
      error: error.message || 'Failed to capture website screenshot'
    });
  }
});

/**
 * GET /api/screenshot/direct
 * Direct image endpoint (returns binary image stream directly)
 * e.g., /api/screenshot/direct?url=https://stripe.com&format=png&fullPage=true&scale=2
 */
router.get('/screenshot/direct', captureRateLimit, async (req, res) => {
  try {
    const {
      url,
      width = 1920,
      height = 1080,
      format = 'png',
      quality = 90,
      fullPage = 'true',
      scale = 2,
      delay = 0,
      blockBanners = 'true',
      waitAnimations = 'true',
      colorScheme = 'no-preference',
      isMobile = 'false'
    } = req.query;

    if (!url) {
      return res.status(400).send('Missing "url" parameter');
    }

    const result = await captureScreenshot({
      url,
      width: parseInt(width, 10),
      height: parseInt(height, 10),
      format,
      quality: parseInt(quality, 10),
      fullPage: fullPage === 'true',
      scale: parseFloat(scale) || 2,
      delay: parseInt(delay, 10) || 0,
      blockBanners: blockBanners === 'true',
      waitAnimations: waitAnimations === 'true',
      colorScheme,
      isMobile: isMobile === 'true'
      ,persist: false
    });

    const mimeMap = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp'
    };

    const contentType = mimeMap[result.data.format] || 'image/png';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', result.buffer.length);
    res.setHeader('Cache-Control', 'no-store');
    return res.end(result.buffer);
  } catch (error) {
    console.error('Direct capture failed:', error);
    return res.status(error.status || 500).send(`Failed to capture screenshot: ${error.message}`);
  }
});

/**
 * GET /api/history
 * List recent screenshots
 */
router.get('/history', (req, res) => {
  res.json({
    success: true,
    data: getHistory(req.captureOwnerId)
  });
});

/**
 * DELETE /api/history
 * Clear ALL history entries and delete all screenshot files from disk
 */
router.delete('/history', async (req, res) => {
  try {
    const result = await clearAllHistory(req.captureOwnerId);
    return res.json({ success: true, deleted: result.deleted });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * DELETE /api/history/:id
 * Delete a screenshot from history & disk
 */
router.delete('/history/:id', async (req, res) => {
  const { id } = req.params;
  const deleted = await deleteScreenshot(id, req.captureOwnerId);
  if (deleted) {
    return res.json({ success: true, message: 'Screenshot deleted' });
  }
  return res.status(404).json({ success: false, error: 'Screenshot not found' });
});

/**
 * GET /api/download/:filename
 * Trigger direct file download
 */
router.get('/download/:filename', (req, res, next) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(STORAGE_DIR, filename);
  res.download(filePath, filename, (error) => {
    if (!error) return;
    if (error.code === 'ENOENT') return res.status(404).send('File not found');
    return next(error);
  });
});

export default router;
