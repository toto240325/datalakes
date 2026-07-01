const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
    const page = await browser.newPage();

    // Go to Sysper2API page
    await page.goto('https://api-gateway.ec.testa.eu/devportal/apis/a881442d6-429d-4ae7-be1d-722b9f2981aa', {
      waitUntil: 'networkidle2', timeout: 30000
    });
    await new Promise(r => setTimeout(r, 2000));

    // Try clicking "Try Out" or finding the Swagger/OpenAPI spec link
    // Look for links to swagger/openapi
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ text: a.textContent.trim(), href: a.href }))
        .filter(l => l.href.includes('swagger') || l.href.includes('openapi') || l.text.includes('Swagger') || l.text.includes('Download'));
    });
    console.log('Swagger links:', JSON.stringify(links, null, 2));

    // Also try the "Try Out" tab which should show the API spec
    const tryOutClicked = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('a, button, span'));
      const tryOut = tabs.find(el => el.textContent.trim() === 'Try Out');
      if (tryOut) { tryOut.click(); return true; }
      return false;
    });
    console.log('Clicked Try Out:', tryOutClicked);
    
    if (tryOutClicked) {
      await new Promise(r => setTimeout(r, 3000));
      const text = await page.evaluate(() => document.body.innerText);
      fs.writeFileSync('sysper2api_tryout.txt', text, 'utf8');
      console.log('\nTry Out page (' + text.length + ' chars):');
      console.log(text.substring(0, 5000));
    }

    // Also try fetching the swagger.json directly from the API
    // WSO2 DevPortal typically serves it at /apis/{id}/swagger
    console.log('\n\n=== Trying direct swagger URL ===');
    await page.goto('https://api-gateway.ec.testa.eu/devportal/apis/a881442d6-429d-4ae7-be1d-722b9f2981aa/documents', {
      waitUntil: 'networkidle2', timeout: 30000
    });
    await new Promise(r => setTimeout(r, 2000));
    const docsText = await page.evaluate(() => document.body.innerText);
    console.log('Documents page:', docsText.substring(0, 2000));

    await page.close();
    await browser.disconnect();
  } catch (err) {
    console.error('ERROR:', err.message);
  }
})();
