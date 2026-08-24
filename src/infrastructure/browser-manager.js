import puppeteer from 'puppeteer';
import fs from 'node:fs';

let browserInstance;
let launchPromise;

function findChromeExecutable() {
  const candidates = [process.env.PUPPETEER_EXECUTABLE_PATH, '/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', '/Applications/Chromium.app/Contents/MacOS/Chromium'];
  return candidates.find((candidate) => candidate && fs.existsSync(candidate));
}

async function launch() {
  const options = { headless: true, executablePath: findChromeExecutable(), args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--no-first-run', '--no-zygote', '--mute-audio', '--hide-scrollbars'] };
  try { return await puppeteer.launch(options); }
  catch (error) {
    if (!options.executablePath) throw error;
    delete options.executablePath;
    return puppeteer.launch(options);
  }
}

export async function getBrowser() {
  if (browserInstance?.isConnected()) return browserInstance;
  if (!launchPromise) {
    launchPromise = launch().then((browser) => {
      browserInstance = browser;
      browser.once('disconnected', () => { browserInstance = undefined; });
      return browser;
    }).finally(() => { launchPromise = undefined; });
  }
  return launchPromise;
}

export async function closeBrowser() {
  const browser = browserInstance || await launchPromise?.catch(() => undefined);
  browserInstance = undefined;
  if (browser) await browser.close().catch(() => {});
}

export function browserStatus() { return { connected: Boolean(browserInstance?.isConnected()), launching: Boolean(launchPromise) }; }
