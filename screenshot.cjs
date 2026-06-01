const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async ()=>{
  const url = process.argv[2];
  const outDir = process.argv[3] || 'screenshots';
  const viewport = { width: 1600, height: 800 };

  if (!url) {
    console.error('Usage: node tools/screenshot.cjs <url> [outDir]');
    process.exit(1);
  }

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `screenshot-${timestamp}.${format}`;
  const filepath = path.join(outDir, filename);

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForFunction(() => document.readyState === 'complete');
    await page.waitForTimeout(500);
    await page.screenshot({ path: filepath, fullPage: false, type: 'png' });
    console.log(filepath);
  } catch (err) {
    console.error('Screenshot failed:', err.message);
    process.exit(2);
  } finally {
    await browser.close();
  }
})();
