const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { postMessageToThread } = require('worker_threads');


function waitWebFroms(page){
      return page.waitForFunction(() => {
    return typeof Sys === 'undefined' || !Sys.WebForms || !Sys.WebForms.PageRequestManager || !Sys.WebForms.PageRequestManager.getInstance().get_isInAsyncPostBack();
});
}

async function main() {
	const url = process.argv[2];
	const outDir = process.argv[3] || 'screenshots';
	const viewport = {width: 1600,height: 800};
  
	if (!url) {
		console.error('Usage: node tools/screenshot.cjs <url> [outDir]');
		process.exit(1);
	}

	const cookieValue = 'empname=Walid&code=399&pass=Clinic&dep=Clinic';

	if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, {recursive: true });
  
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const filename = `screenshot-${timestamp}.png`;
	const filepath = path.join(outDir, filename);
	
  
  const browser = await chromium.launch();
	const context = await browser.newContext({ viewport });
	const page = await context.newPage();
  await context.addCookies([
  {
    name: 'user',
    value: cookieValue,
    url: url
  }
]);

	try {
    
		await page.goto(url);
    
		process.stdout.write(`Starting ${url} ... \n`);
    
    await waitWebFroms(page);



		const input = page.locator('#ctl00_ContentPlaceHolder1_BootstrapFormLayout_MR_I');
		const search = page.locator('#ctl00_ContentPlaceHolder1_BootstrapFormLayout_search');
		await input.fill('20251399');
    
		await search.click();
    
   
    
    await page.waitForLoadState('networkidle');
    await waitWebFroms(page);

		await page.screenshot({
			path: filepath,
			fullPage: false,
			type: 'png'
		});

		console.log(filepath);
	} catch (err) {
		console.error('Screenshot failed:', err.message);
		process.exit(2);
	} finally {
		await browser.close();
	}
};


main()
.then(() => console.log('done'))
.catch(err => console.error(err));

