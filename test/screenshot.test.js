import { captureScreenshot } from '../src/services/screenshot.service.js';
import fs from 'fs';
import path from 'path';

async function runTest() {
  console.log('Testing Screenshot Service with a sample website...');
  try {
    const testResult = await captureScreenshot({
      url: 'https://example.com',
      width: 1280,
      height: 800,
      format: 'png',
      scale: 2,
      fullPage: true
    });

    console.log('Capture test successful:', {
      url: testResult.data.url,
      dimensions: `${testResult.data.effectiveWidth}x${testResult.data.effectiveHeight}`,
      size: testResult.data.sizeFormatted,
      format: testResult.data.format,
      duration: `${testResult.data.durationMs}ms`
    });

    if (testResult.buffer && testResult.buffer.length > 0) {
      console.log('✅ Buffer generated successfully! Length:', testResult.buffer.length);
    } else {
      throw new Error('Buffer is empty');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

runTest();
