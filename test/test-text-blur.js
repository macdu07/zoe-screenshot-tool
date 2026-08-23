import { captureScreenshot } from '../src/services/screenshot.service.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testFilePath = 'file://' + path.resolve(__dirname, 'text-blur-test.html');

async function testTextBlur() {
  console.log('Testing text unblur engine on:', testFilePath);
  const result = await captureScreenshot({
    url: testFilePath,
    width: 1440,
    height: 900,
    format: 'png',
    fullPage: true,
    scale: 2,
    waitAnimations: true
  });

  console.log('Result:', {
    success: result.success,
    file: result.data.filename,
    size: result.data.sizeFormatted,
    effectiveDimensions: `${result.data.effectiveWidth}x${result.data.effectiveHeight}`
  });
}

testTextBlur().catch(console.error);
