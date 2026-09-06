const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const outDir = '/Users/elainamarriott/.gemini/antigravity-ide/brain/0c5dbe0c-7f7b-4d08-af62-d4d267861daf/screenshots';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

(async () => {
  const browser = await chromium.launch();
  const contextDesktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const contextMobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  
  const pages = [
    { url: 'http://localhost:8788/', name: 'homepage' },
    { url: 'http://localhost:8788/what-we-build.html', name: 'what-we-build' },
    { url: 'http://localhost:8788/work.html', name: 'work' },
    { url: 'http://localhost:8788/how-it-works.html', name: 'how-it-works' },
  ];
  
  for (const p of pages) {
    const pageD = await contextDesktop.newPage();
    await pageD.goto(p.url);
    await pageD.waitForLoadState('networkidle');
    await pageD.screenshot({ path: path.join(outDir, p.name + '-1440x900.jpg'), fullPage: true, type: 'jpeg', quality: 80 });
    await pageD.close();
    
    const pageM = await contextMobile.newPage();
    await pageM.goto(p.url);
    await pageM.waitForLoadState('networkidle');
    await pageM.screenshot({ path: path.join(outDir, p.name + '-390x844.jpg'), fullPage: true, type: 'jpeg', quality: 80 });
    await pageM.close();
  }
  
  await browser.close();
})();
