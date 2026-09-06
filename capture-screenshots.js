const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const viewports = [
  { width: 390, height: 844, name: '390x844' },
  { width: 1440, height: 900, name: '1440x900' }
];

const pages = [
  { url: '/', name: 'homepage' },
  { url: '/work.html', name: 'work' },
  { url: '/about.html', name: 'about' },
  { url: '/project-brief.html', name: 'project-brief' }
];

async function captureScreenshots() {
  const browser = await chromium.launch();
  const outputDir = '/Users/elainamarriott/.gemini/antigravity-ide/brain/0c5dbe0c-7f7b-4d08-af62-d4d267861daf/screenshots';
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();

    for (const p of pages) {
      console.log(`Capturing ${p.name} at ${vp.name}...`);
      await page.goto(`http://localhost:8788${p.url}`);
      await page.waitForLoadState('domcontentloaded');
      // wait a bit for any slow assets
      await page.waitForTimeout(2000);

      const filePath = path.join(outputDir, `${p.name}-${vp.name}.jpg`);
      await page.screenshot({ path: filePath, fullPage: true, type: 'jpeg', quality: 70 });
    }
    await context.close();
  }

  await browser.close();
  console.log('Screenshots completed.');
}

captureScreenshots().catch(console.error);
