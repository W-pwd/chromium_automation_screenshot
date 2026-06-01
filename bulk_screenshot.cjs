const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

async function main() {
  const textPath = process.argv[2] || path.join(__dirname, 'pages.txt');
  const outDir = process.argv[3] || path.join('screenshots', 'inventories');
  const useHttp = process.argv[4] === 'http';
  const origin = `${useHttp ? 'http' : 'https'}://localhost`;
  const base = `${origin}/Inventories/process/`;
  const dep = '35';
  const cookieValue = 'empname=Walid&code=399&pass=Clinic&dep=Clinic';
  const cookieExpiry = 1893456000; // 2030-01-01T00:00:00Z in epoch seconds

  const text = fs.readFileSync(textPath, 'utf8');
  const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const urls = new Set();
  for (const line of lines) {
    if (/^https?:\/\//i.test(line)) {
      urls.add(line);
      continue;
    }
    // try to extract name from a path like /Order-Management/name or a plain name
    try {
      const u = new URL(line);
      urls.add(line);
      continue;
    } catch (e) {
      // not a full URL — treat as a pagename and build using base
      const name = line.replace(/.*\//, '').replace(/\.aspx$/i, '').toLowerCase();
      if (name) urls.add(`${base}${name}.aspx?dep=${dep}`);
    }
  }

  const pages = Array.from(urls).sort();
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  if (pages.length === 0) {
    console.error('No page names found in', textPath);
    process.exit(1);
  }

  let browser = null;
  let context = null;

  async function ensureContext() {
    if (!browser || !browser.isConnected()) {
      try { if (browser) await browser.close(); } catch (e) {}
      browser = await chromium.launch();
    }
    if (!context || context.isClosed()) {
      context = await browser.newContext({ viewport: { width: 1600, height: 800 }, ignoreHTTPSErrors: true });
    }
  }

  // we'll set the cookie via document.cookie on the origin before visiting each page

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  console.log('Found', pages.length, 'pages — starting capture...');

  for (const entry of pages) {
    // entry may already be a full URL or a pagename URL built earlier
    const url = /^https?:\/\//i.test(entry) ? entry : `${base}${entry}.aspx?dep=${dep}`;
    // create a filesystem-safe filename based on the URL
    const safeName = url.replace(/https?:\/\//i, '').replace(/[\\/:?"<>|&=]/g, '-').replace(/-+/g, '-');
    const fileName = `order-${safeName}-${timestamp}.png`;
    const filePath = path.join(outDir, fileName);
    await ensureContext();
    let page = null;
    try {
      page = await context.newPage();
      process.stdout.write(`Visiting ${url} ... `);
      // open origin to set cookie via document.cookie so auth works
      await page.goto(origin + '/', { waitUntil: 'networkidle', timeout: 60000 });
      const cookieString = `user=${cookieValue}; path=/; expires=Fri, 01 Jan 2030 00:00:00 GMT`;
      await page.evaluate((c)=>{ document.cookie = c; }, cookieString);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: filePath, fullPage: true, type: 'png' });
      console.log('saved');
      console.log(filePath);
    } catch (err) {
      console.log('failed:', err.message);
      // if context/browser got closed, reset them so ensureContext recreates
      try { if (page) await page.close(); } catch (e) {}
      try { if (context) await context.close(); } catch (e) {}
      try { if (browser) await browser.close(); } catch (e) {}
      context = null; browser = null;
    } finally {
      try { if (page && !page.isClosed()) await page.close(); } catch (e) {}
    }
  }

  try { if (context) await context.close(); } catch (e) {}
  try { if (browser) await browser.close(); } catch (e) {}
  console.log('All done. Screenshots saved to:', outDir);
}

main().catch(err=>{
  console.error(err);
  process.exit(1);
});
