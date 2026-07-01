/**
 * EC People Crawler
 * 
 * Crawls the EU "Who is Who" directory to extract all people (staff members)
 * from each organizational unit, including their function/job title.
 * 
 * Prerequisites:
 *   - Edge running with --remote-debugging-port=9222
 *   - Authenticated session on op.europa.eu (EU Login)
 *   - npm install puppeteer-core
 *   - ec_organigram_dgs.json (DG list with URLs)
 * 
 * Usage:
 *   node crawl_people.js [--output ec_people.json] [--dg DIGIT] [--resume]
 * 
 * Output format (ec_people.json):
 *   [
 *     {
 *       "name": "Carl-Christian BUHR",
 *       "title": "Mr",
 *       "function": "Director",
 *       "phone": "+32-229-68599",
 *       "unit": "DIGIT.A",
 *       "unitName": "Digital Transformation",
 *       "dg": "DIGIT"
 *     }
 *   ]
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');

const delay = ms => new Promise(r => setTimeout(r, ms));

// Parse CLI args
const args = process.argv.slice(2);
function getArg(name, defaultVal) {
  const idx = args.indexOf(`--${name}`);
  return (idx !== -1 && args[idx + 1]) ? args[idx + 1] : defaultVal;
}
const OUTPUT_FILE = getArg('output', 'ec_people.json');
const ONLY_DG = getArg('dg', null);
const RESUME = args.includes('--resume');
const DG_LIST_FILE = 'ec_organigram_dgs.json';

let pageCount = 0;

/**
 * Navigate to a URL and wait for content to appear.
 * Uses 'load' event + fixed delay. Retries once on failure.
 * Returns true if page loaded successfully, false otherwise.
 */
async function navigateTo(page, url) {
  url = url.replace(/\s+/g, '');
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  } catch (e) {
    // Retry once
    console.log(`    [retry] ${url}`);
    await delay(3000);
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    } catch (e2) {
      console.log(`    [FAILED] ${url}: ${e2.message}`);
      return false;
    }
  }
  // Wait for JS rendering
  await delay(2500);
  return true;
}

/**
 * Extract people and sub-level links from the current page.
 */
async function extractPageData(page) {
  return page.evaluate(() => {
    const text = document.body.innerText;
    const lines = text.split('\n').map(l => l.trim());

    // Extract org title
    const titleMatch = text.match(/Embed in website\s+(.+?)\n/);
    const rawTitle = titleMatch ? titleMatch[1].trim() : '';
    const codeMatch = rawTitle.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    const pageName = codeMatch ? codeMatch[1].trim() : rawTitle;
    const pageCode = codeMatch ? codeMatch[2] : '';

    // Extract people
    const people = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const personMatch = line.match(/^(Mr|Ms)\s+(.+)$/);
      if (!personMatch) continue;

      const title = personMatch[1];
      const name = personMatch[2].trim();
      if (name === 'Publications' || name === 'Sublevels' || name === 'Map') continue;

      let func = '';
      let phone = '';
      let j = i + 1;
      while (j < lines.length && lines[j] === '') j++;

      if (j < lines.length && !lines[j].match(/^(Mr|Ms)\s+/) && !lines[j].match(/^\[/)) {
        if (lines[j].match(/^\+?\d[\d\s\-]+$/)) {
          phone = lines[j];
        } else {
          func = lines[j];
          let k = j + 1;
          while (k < lines.length && lines[k] === '') k++;
          if (k < lines.length && lines[k].match(/^\+?\d[\d\s\-]+$/)) {
            phone = lines[k];
          }
        }
      }

      people.push({ name, title, function: func, phone });
    }

    // Extract sub-level links
    const sublevels = Array.from(document.querySelectorAll('a'))
      .filter(a => a.textContent.match(/^\[/) && a.href.includes('organization'))
      .map(a => {
        const m = a.textContent.trim().match(/^\[([^\]]+)\]\s*(.*)$/);
        return m ? { code: m[1], name: m[2].trim(), href: a.href } : null;
      })
      .filter(Boolean);

    return { pageCode, pageName, people, sublevels };
  });
}

/**
 * Recursively crawl an org page: extract people, then follow sub-level links.
 */
async function crawlRecursive(page, url, code, name, dg, depth, maxDepth) {
  pageCount++;

  const ok = await navigateTo(page, url);
  if (!ok) return [];

  const pageData = await extractPageData(page);

  // Attach unit info to people found on this page
  const results = pageData.people.map(p => ({
    ...p,
    unit: code || pageData.pageCode,
    unitName: name || pageData.pageName,
    dg
  }));

  if (results.length > 0) {
    process.stdout.write(` [${results.length}p]`);
  }

  // Recurse into sublevels
  if (depth < maxDepth && pageData.sublevels.length > 0) {
    for (const sub of pageData.sublevels) {
      const subResults = await crawlRecursive(
        page, sub.href, sub.code, sub.name, dg, depth + 1, maxDepth
      );
      results.push(...subResults);
    }
  }

  return results;
}

// Main
(async () => {
  const startTime = Date.now();
  console.log('EC People Crawler');
  console.log(`  DG: ${ONLY_DG || 'ALL'} | Output: ${OUTPUT_FILE}`);
  console.log('');

  let allPeople = [];

  if (RESUME && fs.existsSync(OUTPUT_FILE)) {
    allPeople = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    console.log(`  Resuming: ${allPeople.length} people already collected\n`);
  }

  try {
    const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });

    // Find a tab already on who-is-who (keeps auth session)
    const allPages = await browser.pages();
    let page = null;
    for (const p of allPages) {
      if (p.url().includes('who-is-who/organization')) {
        page = p;
        console.log('  Reusing who-is-who tab');
        break;
      }
    }
    if (!page) {
      page = await browser.newPage();
      console.log('  Opened new tab');
    }

    // Load DG list
    if (!fs.existsSync(DG_LIST_FILE)) {
      console.error(`ERROR: ${DG_LIST_FILE} not found. Run the organigram crawler first.`);
      await browser.disconnect();
      return;
    }
    const dgData = JSON.parse(fs.readFileSync(DG_LIST_FILE, 'utf8'));
    const dgList = dgData.sublevels;
    console.log(`  ${dgList.length} DGs loaded from ${DG_LIST_FILE}\n`);

    // Filter
    const toProcess = ONLY_DG
      ? dgList.filter(s => s.code.toUpperCase() === ONLY_DG.toUpperCase())
      : dgList;

    if (ONLY_DG && toProcess.length === 0) {
      console.error(`DG "${ONLY_DG}" not found. Available: ${dgList.map(s => s.code).join(', ')}`);
      await browser.disconnect();
      return;
    }

    // Skip already collected DGs when resuming
    const collectedDGs = new Set(allPeople.map(p => p.dg));

    // Crawl each DG
    for (let i = 0; i < toProcess.length; i++) {
      const dg = toProcess[i];
      const prefix = `[${i + 1}/${toProcess.length}]`;

      if (RESUME && collectedDGs.has(dg.code)) {
        console.log(`${prefix} ${dg.code}: skipped (already collected)`);
        continue;
      }

      process.stdout.write(`${prefix} ${dg.code}`);

      const dgPeople = await crawlRecursive(page, dg.href, dg.code, dg.name, dg.code, 1, 10);
      allPeople.push(...dgPeople);

      console.log(` -> ${dgPeople.length} people (total: ${allPeople.length}, pages: ${pageCount})`);

      // Save every DG
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allPeople, null, 2), 'utf8');
    }

    // Final summary
    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log(`\nDone in ${elapsed} min | ${pageCount} pages | ${allPeople.length} people`);
    console.log(`Output: ${OUTPUT_FILE}`);

    // CSV export
    const csvFile = OUTPUT_FILE.replace('.json', '.csv');
    const csvHeader = 'Name\tTitle\tFunction\tPhone\tUnit\tUnitName\tDG';
    const csvLines = allPeople.map(p =>
      `${p.name}\t${p.title}\t${p.function}\t${p.phone}\t${p.unit}\t${p.unitName}\t${p.dg}`
    );
    fs.writeFileSync(csvFile, [csvHeader, ...csvLines].join('\n'), 'utf8');
    console.log(`CSV: ${csvFile}`);

    await browser.disconnect();
  } catch (err) {
    if (allPeople.length > 0) {
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allPeople, null, 2), 'utf8');
      console.log(`\n[ERROR] Saved progress: ${allPeople.length} people`);
    }
    console.error('ERROR:', err.message);
    console.error(err.stack);
  }
})();
