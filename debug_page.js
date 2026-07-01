/**
 * Debug: check what's on a Who-is-Who page.
 * Uses an EXISTING browser tab that's already authenticated.
 */
const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  
  // Try to find an already-open who-is-who tab
  const pages = await browser.pages();
  let page = null;
  for (const p of pages) {
    const url = p.url();
    if (url.includes('who-is-who')) {
      page = p;
      console.log('Found existing who-is-who tab:', url);
      break;
    }
  }

  if (!page) {
    // No existing tab — open new one (may need auth)
    console.log('No who-is-who tab found. Opening new tab...');
    console.log('If you see login page, please authenticate in Edge first, then re-run.');
    page = await browser.newPage();
  }

  // Navigate to COM top-level
  const testUrl = 'https://op.europa.eu/en/web/who-is-who/organization/-/organization/COM';
  console.log('Navigating to:', testUrl);
  await page.goto(testUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));

  const text = await page.evaluate(() => document.body.innerText);
  console.log('Page length:', text.length);
  
  if (text.includes('EU Login') || text.includes('Sign in to continue')) {
    console.log('\n*** SESSION EXPIRED ***');
    console.log('Please log in to op.europa.eu in Edge first, then re-run this script.');
  } else {
    console.log('\n=== PAGE TEXT (first 4000) ===');
    console.log(text.substring(0, 4000));

    console.log('\n=== LINKS WITH BRACKETS ===');
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a'))
        .filter(a => a.textContent.includes('[') && a.href.includes('organization'))
        .slice(0, 20)
        .map(a => a.textContent.trim().substring(0, 100) + ' ||| ' + a.href);
    });
    links.forEach(l => console.log(l));
  }

  await browser.disconnect();
})();
