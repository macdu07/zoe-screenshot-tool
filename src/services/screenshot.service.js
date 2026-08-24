import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { config } from '../config.js';
import { ResourceLimitError, UpstreamError } from '../errors.js';
import { getBrowser } from '../infrastructure/browser-manager.js';
import { CaptureQueue } from '../infrastructure/capture-queue.js';
import { FileScreenshotRepository } from '../infrastructure/screenshot-repository.js';
import { assertSafeUrl, normalizeHttpUrl } from '../infrastructure/url-policy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = path.resolve(__dirname, '../../storage/screenshots');
const HISTORY_FILE = path.resolve(__dirname, '../../storage/history.json');

const repository = new FileScreenshotRepository({ storageDir: STORAGE_DIR, historyFile: HISTORY_FILE, limit: config.historyLimit });
await repository.init();
const captureQueue = new CaptureQueue({ concurrency: config.captureConcurrency, maxPending: config.captureQueueLimit });

/**
 * Clean & normalize URL
 */
export function normalizeUrl(inputUrl) {
  return normalizeHttpUrl(inputUrl);
}

/**
 * Advanced Scroll & Animation Preparation Engine
 * Ensures scroll-triggered entrance animations (AOS, WOW, Framer Motion, GSAP, Webflow, Tailwind, IntersectionObserver)
 * and lazy-loaded assets are fully triggered, animated, and locked into their visible state.
 */
async function preparePageForCapture(page, options = {}) {
  const { fullPage = true, delay = 0, waitAnimations = true } = options;

  // 1. Wait for web fonts to load
  try {
    await page.evaluate(() => document.fonts ? document.fonts.ready : Promise.resolve());
  } catch {}

  if (fullPage || waitAnimations) {
    // 2. Perform progressive sweep scroll to trigger IntersectionObservers & lazy loads
    await page.evaluate(async () => {
      const getScrollHeight = () => Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.body.clientHeight,
        document.documentElement.clientHeight
      );

      const viewportHeight = window.innerHeight || 800;
      let currentPosition = 0;
      const maxScrollHeight = getScrollHeight();
      const stepDistance = Math.max(Math.floor(viewportHeight * 0.75), 300);

      // Scroll step-by-step to bottom
      while (currentPosition < maxScrollHeight) {
        currentPosition += stepDistance;
        window.scrollTo(0, currentPosition);
        window.dispatchEvent(new Event('scroll', { bubbles: true }));
        window.dispatchEvent(new Event('resize', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 80));
      }

      // Final scroll to absolute bottom
      window.scrollTo(0, getScrollHeight());
      window.dispatchEvent(new Event('scroll', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 150));
    });

    // 3. Force-reveal and lock entrance animation elements, text splitters, and un-blur all staggered words
    await page.evaluate(() => {
      // (a) Trigger common animation libraries
      // AOS (Animate on Scroll)
      document.querySelectorAll('[data-aos]').forEach((el) => {
        el.classList.add('aos-animate');
        el.style.opacity = '1';
        el.style.transform = 'none';
        el.style.visibility = 'visible';
        el.style.filter = 'none';
      });

      // WOW.js / ScrollReveal
      document.querySelectorAll('.wow, .animated, [data-sr-id]').forEach((el) => {
        el.style.visibility = 'visible';
        el.style.opacity = '1';
        el.style.transform = 'none';
        el.style.filter = 'none';
      });

      // Sal.js
      document.querySelectorAll('[data-sal]').forEach((el) => {
        el.classList.add('sal-animate');
        el.style.opacity = '1';
        el.style.filter = 'none';
      });

      // Custom in-view / revealed / animate-on-scroll classes
      document.querySelectorAll('.animate-on-scroll, .scroll-trigger, .in-view, .revealed, .is-visible, .fade-in').forEach((el) => {
        el.classList.add('in-view', 'revealed', 'is-visible', 'active', 'aos-animate');
        el.style.opacity = '1';
        el.style.transform = 'none';
        el.style.visibility = 'visible';
        el.style.filter = 'none';
      });

      // (b) Advance GSAP Timelines and ScrollTriggers to 100% completed state if present
      try {
        if (window.gsap && window.gsap.globalTimeline) {
          window.gsap.globalTimeline.progress(1);
        }
        if (window.ScrollTrigger && typeof window.ScrollTrigger.getAll === 'function') {
          window.ScrollTrigger.getAll().forEach((st) => {
            try {
              if (typeof st.progress === 'function') {
                st.progress(1);
              }
            } catch (e) {}
          });
        }
      } catch (e) {}

      // (c) Un-blur and reveal all staggered text spans (SplitText, SplitType, Framer Motion, Webflow text reveals)
      const textTargets = document.querySelectorAll(`
        h1, h2, h3, h4, h5, h6, p, blockquote,
        h1 *, h2 *, h3 *, h4 *, h5 *, h6 *, p *,
        .word, .char, .line, .letter,
        [data-char], [data-word], [data-line],
        [class*="char"], [class*="word"], [class*="split"], [class*="letter"],
        [data-split], [data-splitting], .split-item, .splitting,
        span[style*="opacity"], span[style*="blur"], span[style*="filter"], span[style*="transform"],
        div[style*="opacity"], div[style*="blur"], div[style*="filter"]
      `);

      textTargets.forEach((el) => {
        // Strip any blur filter
        if (el.style.filter && el.style.filter.includes('blur')) {
          el.style.filter = 'none';
        }
        // Force full opacity on text
        if (el.style.opacity && parseFloat(el.style.opacity) < 1) {
          el.style.opacity = '1';
        }
        // Clear transforms that might be halfway through sliding in
        if (el.style.transform && (el.style.transform.includes('translate') || el.style.transform.includes('matrix'))) {
          el.style.transform = 'none';
        }
        // Remove clip-path text reveals
        if (el.style.clipPath) {
          el.style.clipPath = 'none';
        }
      });

      // (d) Force lazy-loaded images & iframes to resolve
      document.querySelectorAll('img[data-src], img[data-srcset], img[loading="lazy"]').forEach((img) => {
        if (img.dataset.src && !img.src) {
          img.src = img.dataset.src;
        }
        if (img.dataset.srcset && !img.srcset) {
          img.srcset = img.dataset.srcset;
        }
        img.loading = 'eager';
        if (img.decode) {
          img.decode().catch(() => {});
        }
      });

      // (e) Fast-forward active Web Animations API instances to completed state
      if (typeof document.getAnimations === 'function') {
        try {
          document.getAnimations().forEach((anim) => {
            try {
              if (anim.finish) {
                anim.finish();
              }
            } catch (e) {
              // Ignore infinite looping animations that cannot be finished
            }
          });
        } catch (e) {}
      }

      // (f) Scroll back to top
      window.scrollTo(0, 0);
      window.dispatchEvent(new Event('scroll', { bubbles: true }));
    });

    // 4. Inject global CSS override to ensure all animated elements and text remain 100% sharp and visible
    await page.addStyleTag({
      content: `
        /* Force entrance animated elements and text to stay sharp, un-blurred, and 100% visible */
        [data-aos], [data-sal], .wow, .animate-on-scroll, .fade-in, .scroll-reveal,
        h1, h2, h3, h4, h5, h6, p,
        h1 *, h2 *, h3 *, h4 *, h5 *, h6 *, p *,
        .word, .char, .line, .letter,
        [data-char], [data-word], [data-line],
        [class*="char"], [class*="word"], [class*="split"], [class*="letter"],
        [data-split], [data-splitting], .split-item, .splitting {
          filter: none !important;
          opacity: 1 !important;
          visibility: visible !important;
          transform: none !important;
          clip-path: none !important;
          -webkit-mask: none !important;
          mask: none !important;
          transition-delay: 0s !important;
          animation-delay: 0s !important;
          animation-duration: 0.001s !important;
          transition-duration: 0.001s !important;
        }

        /* Disable sticky/fixed headers from covering entire page during full capture if needed */
        html {
          scroll-behavior: auto !important;
        }
      `
    }).catch(() => {});

    // Stabilization pause for paint cycle
    await new Promise((r) => setTimeout(r, 600));
  }

  // 5. Additional user-configured delay
  if (delay > 0) {
    await new Promise((r) => setTimeout(r, delay));
  }
}

/**
 * Inject style to hide cookie banners, modals, and sticky ads
 */
const BANNER_KILLER_CSS = `
  /* Common Cookie Consent and GDPR Banners */
  #onetrust-consent-sdk,
  #onetrust-banner-sdk,
  .onetrust-pc-dark,
  #CybotCookiebotDialog,
  #CybotCookiebotDialogBodyUnderlay,
  .cc-banner,
  .cc-window,
  .cookie-banner,
  .cookie-consent,
  .cookie-notice,
  #cookie-law-info-bar,
  #cookie-law-info-again,
  .qc-cmp-ui-container,
  .qc-cmp2-container,
  .gdpr-banner,
  .gdpr-consent,
  [id*="cookie-notice"],
  [id*="cookie-consent"],
  [class*="cookie-notice"],
  [class*="cookie-consent"],
  [id*="sp_message_container"],
  [id*="usercentrics-root"],
  #cmpbox,
  #cmpbox2,
  .app-cookie-banner,
  .evidon-banner,
  .optanon-alert-box-wrapper,
  /* Common Newsletter / Popup Overlays */
  .ReactModalPortal,
  .modal-backdrop,
  div[class*="overlay"][class*="backdrop"],
  /* Hide standard scrollbars for clean render */
  ::-webkit-scrollbar {
    display: none !important;
  }
`;

/**
 * Take a website screenshot with high resolution and customizable settings
 */
export function captureScreenshot(options = {}) {
  return captureQueue.add(() => performCapture(options));
}

async function performCapture(options = {}) {
  const startTime = Date.now();

  const url = await assertSafeUrl(options.url, { allowPrivate: config.allowPrivateNetwork });
  const width = Math.min(Math.max(parseInt(options.width, 10) || 1920, 320), 3840);
  const height = Math.min(Math.max(parseInt(options.height, 10) || 1080, 240), 2160);
  const fullPage = options.fullPage !== false && options.fullPage !== 'false';
  const format = ['jpeg', 'jpg', 'webp'].includes((options.format || '').toLowerCase())
    ? options.format.toLowerCase() === 'jpg' ? 'jpeg' : options.format.toLowerCase()
    : 'png';
  const quality = format === 'png' ? undefined : Math.min(Math.max(parseInt(options.quality, 10) || 90, 10), 100);
  const scale = Math.min(Math.max(parseFloat(options.scale) || 2, 1), 3); // Default 2x for Retina
  const delay = Math.min(Math.max(parseInt(options.delay, 10) || 0, 0), 10000);
  const blockBanners = options.blockBanners !== false && options.blockBanners !== 'false';
  const waitAnimations = options.waitAnimations !== false && options.waitAnimations !== 'false';
  const colorScheme = ['dark', 'light'].includes(options.colorScheme) ? options.colorScheme : 'no-preference';
  const isMobile = options.isMobile === true || options.isMobile === 'true';
  const persist = options.persist !== false;
  const ownerId = options.ownerId;

  const browser = await getBrowser();
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  try {
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
      const requestUrl = request.url();
      if (/^(data|blob|about):/i.test(requestUrl)) return request.continue().catch(() => {});
      if (!/^https?:/i.test(requestUrl)) return request.abort('blockedbyclient').catch(() => {});
      try {
        await assertSafeUrl(requestUrl, { allowPrivate: config.allowPrivateNetwork });
        await request.continue();
      } catch {
        await request.abort('blockedbyclient').catch(() => {});
      }
    });

    // Set realistic User Agent
    const desktopUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
    const mobileUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1';
    await page.setUserAgent(isMobile ? mobileUA : desktopUA);

    // Set viewport with Retina scale factor
    await page.setViewport({
      width,
      height,
      deviceScaleFactor: scale,
      isMobile,
      hasTouch: isMobile
    });

    // Set color scheme preference
    if (colorScheme !== 'no-preference') {
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: colorScheme }]);
    }

    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
      'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
      'Sec-Ch-Ua-Mobile': isMobile ? '?1' : '?0',
      'Sec-Ch-Ua-Platform': isMobile ? '"iOS"' : '"macOS"'
    });

    // Navigate to page
    let navigationResponse;
    try {
      navigationResponse = await page.goto(url, {
        waitUntil: ['domcontentloaded', 'networkidle2'],
        timeout: config.navigationTimeoutMs
      });
    } catch (firstError) {
      // Fallback navigation with domcontentloaded if networkidle2 times out on dynamic sites
      if (!page.isClosed()) {
        try {
          navigationResponse = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: Math.min(config.navigationTimeoutMs, 10_000) });
        } catch (secondError) {
          const timeout = /timeout/i.test(`${firstError.message} ${secondError.message}`);
          throw new UpstreamError(timeout ? 'Target website did not load before the timeout' : 'Could not load target website', { timeout, cause: secondError });
        }
      }
    }
    if (!navigationResponse) throw new UpstreamError('Target website did not return a response');
    if (navigationResponse.status() >= 400) throw new UpstreamError(`Target website returned HTTP ${navigationResponse.status()}`);

    // Block ads, cookie notices and banners if enabled
    if (blockBanners) {
      try {
        await page.addStyleTag({ content: BANNER_KILLER_CSS });
      } catch {
        // Ignore style injection errors
      }
    }

    // Prepare page: sweep scroll, trigger & reveal entrance animations, load lazy assets
    await preparePageForCapture(page, {
      fullPage,
      delay,
      waitAnimations
    });

    // Calculate actual dimensions rendered
    const dimensions = await page.evaluate(() => ({
      scrollWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth, window.innerWidth),
      scrollHeight: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, window.innerHeight)
    }));

    const effectiveWidth = Math.round((fullPage ? dimensions.scrollWidth : width) * scale);
    const effectiveHeight = Math.round((fullPage ? dimensions.scrollHeight : height) * scale);
    if (dimensions.scrollHeight > config.maxPageHeight) throw new ResourceLimitError(`Page height exceeds the ${config.maxPageHeight}px limit`);
    if (effectiveWidth * effectiveHeight > config.maxOutputPixels) throw new ResourceLimitError('Rendered screenshot exceeds the configured pixel limit');

    // WebP specification has a hard limit of 16,383 x 16,383 px in Chromium/libwebp
    let finalFormat = format;
    if (finalFormat === 'webp' && (effectiveHeight > 16383 || effectiveWidth > 16383)) {
      console.warn(`Dimensions (${effectiveWidth}x${effectiveHeight}) exceed WebP limit of 16383px. Auto-fallback to JPEG.`);
      finalFormat = 'jpeg';
    }

    // Capture screenshot buffer
    const screenshotOptions = {
      type: finalFormat,
      fullPage
    };
    if (finalFormat === 'jpeg' || finalFormat === 'webp') {
      screenshotOptions.quality = quality;
    }

    const buffer = await page.screenshot(screenshotOptions);
    if (buffer.length > config.maxScreenshotBytes) throw new ResourceLimitError('Screenshot exceeds the configured file-size limit');

    // Save to disk
    const id = crypto.randomBytes(12).toString('hex');
    const fileExtension = finalFormat === 'jpeg' ? 'jpg' : finalFormat;
    const filename = `screenshot-${id}.${fileExtension}`;
    if (persist) await repository.saveFile(filename, buffer);

    const durationMs = Date.now() - startTime;
    const sizeBytes = buffer.length;
    const sizeFormatted = formatBytes(sizeBytes);

    const result = {
      id,
      url,
      filename,
      width: fullPage ? dimensions.scrollWidth : width,
      height: fullPage ? dimensions.scrollHeight : height,
      effectiveWidth,
      effectiveHeight,
      scale,
      format: fileExtension,
      quality: finalFormat === 'png' ? 100 : quality,
      fullPage,
      sizeBytes,
      sizeFormatted,
      durationMs,
      timestamp: new Date().toISOString(),
      downloadUrl: persist ? `/api/download/${filename}` : null,
      viewUrl: persist ? `/storage/screenshots/${filename}` : null
    };

    // Add to history (limit 30 items)
    if (persist) await repository.add({ ...result, ownerId });

    return {
      success: true,
      data: result,
      buffer
    };
  } finally {
    await context.close().catch(() => {});
  }
}

/**
 * Format bytes into human-readable string
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Get screenshot history
 */
export function getHistory(ownerId) {
  return repository.list(ownerId);
}

/**
 * Delete a screenshot from history & disk
 */
export async function deleteScreenshot(id, ownerId) {
  return repository.delete(id, ownerId);
}

/**
 * Clear ALL history entries and delete all screenshot files from disk
 */
export async function clearAllHistory(ownerId) {
  return repository.clear(ownerId);
}

export function getCaptureQueueStats() { return captureQueue.stats(); }

export function checkStorageReady() { return repository.ready(); }
