import { captureScreenshot } from '../src/services/screenshot.service.js';

async function testAllFormats() {
  console.log('Testing formats (PNG, JPG, WEBP)...');
  
  for (const fmt of ['png', 'jpg', 'webp']) {
    console.log(`\nTesting format: ${fmt.toUpperCase()}...`);
    const res = await captureScreenshot({
      url: 'https://example.com',
      width: 1280,
      height: 800,
      format: fmt,
      quality: 85,
      scale: 2,
      fullPage: true
    });

    console.log(`✅ ${fmt.toUpperCase()} Success:`, {
      format: res.data.format,
      effectiveDimensions: `${res.data.effectiveWidth}x${res.data.effectiveHeight}`,
      size: res.data.sizeFormatted,
      duration: `${res.data.durationMs}ms`,
      file: res.data.filename
    });
  }
  
  console.log('\n🎉 All formats tested successfully!');
  process.exit(0);
}

testAllFormats().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
