/**
 * EC Organigram Crawler
 * 
 * Crawls the EU "Who is Who" directory to extract the full European Commission
 * organigram (DGs, Directorates, Units) in a structured JSON format.
 * 
 * Prerequisites:
 *   - Edge running with --remote-debugging-port=9222
 *   - Authenticated session on op.europa.eu (EU Login)
 *   - npm install puppeteer-core
 * 
 * Usage:
 *   node crawl_full_organigram.js [--depth 3] [--dg DIGIT] [--output ec_organigram.json]
 * 
 * Options:
 *   --depth N       How deep to crawl (1=DGs only, 2=+Directorates, 3=+Units) [default: 3]
 *   --dg CODE       Only crawl a specific DG (e.g. DIGIT, AGRI). Omit for all.
 *   --output FILE   Output file path [default: ec_organigram.json]
 * 
 * Output format:
 *   {
 *     "code": "COM",
 *     "name": "European Commission",
 *     "crawledAt": "2026-06-25T...",
 *     "children": [
 *       {
 *         "code": "DIGIT",
 *         "name": "Directorate-General for Digital Services",
 *         "head": "Ms Veronica GAFFEY",
 *         "children": [
 *           { "code": "DIGIT.A", "name": "Digital Transformation", "head": "Mr Carl-Christian BUHR",
 *             "children": [
 *               { "code": "DIGIT.A.1", "name": "Corporate Digital Transformation", ... }
 *             ]
 *           }
 *         ]
 *       }
 *     ]
 *   }
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');

const BASE_URL = 'https://op.europa.eu/en/web/who-is-who/organization/-/organization/COM';
const delay = ms => new Promise(r => setTimeout(r, ms));

// Parse CLI args
const args = process.argv.slice(2);
function getArg(name, defaultVal) {
  const idx = args.indexOf(`--${name}`);
  return (idx !== -1 && args[idx + 1]) ? args[idx + 1] : defaultVal;
}
const MAX_DEPTH = parseInt(getArg('depth', '3'));
const ONLY_DG = getArg('dg', null);
const OUTPUT_FILE = getArg('output', 'ec_organigram.json');

let pageCount = 0;

async function extractOrgPage(page, url) {
  pageCount++;
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  } catch (e) {
    // Retry once on timeout
    console.log(`    [retry] ${url}`);
    await delay(2000);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  }
  await delay(1200);

  return page.evaluate(() => {
    const text = document.body.innerText;

    // Title after "Embed in website"
    const titleMatch = text.match(/Embed in website\s+(.+?)\n/);
    const rawTitle = titleMatch ? titleMatch[1].trim() : '';

    // Split "Digital Transformation (DIGIT.A)" into name and code
    const codeMatch = rawTitle.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    const name = codeMatch ? codeMatch[1].trim() : rawTitle;
    const code = codeMatch ? codeMatch[2] : '';

    // Head of entity
    const headPatterns = [
      /Director-General:\s*(Mr|Ms)\s+(.+)/,
      /Director:\s*(Mr|Ms)\s+(.+)/,
      /Head of Unit:\s*(Mr|Ms)\s+(.+)/,
      /Head of Service:\s*(Mr|Ms)\s+(.+)/,
      /Acting Director-General:\s*(Mr|Ms)\s+(.+)/,
      /Acting Director:\s*(Mr|Ms)\s+(.+)/,
      /Acting Head of Unit:\s*(Mr|Ms)\s+(.+)/,
      /Deputy Director-General:\s*(Mr|Ms)\s+(.+)/,
    ];
    let head = '';
    for (const p of headPatterns) {
      const m = text.match(p);
      if (m) { head = `${m[1]} ${m[2].trim()}`; break; }
    }

    // Sublevels
    const sublevels = [];
    for (const line of text.split('\n')) {
      const m = line.match(/^\[([^\]]+)\]\s+(.+)$/);
      if (m) sublevels.push({ code: m[1], name: m[2].trim() });
    }

    // Links for sublevels
    const links = Array.from(document.querySelectorAll('a'))
      .filter(a => a.textContent.match(/^\[/) && a.href.includes('organization'))
      .map(a => ({ text: a.textContent.trim(), href: a.href }));

    for (const sub of sublevels) {
      const link = links.find(l => l.text.includes(`[${sub.code}]`));
      sub.href = link ? link.href : null;
    }

    return { name, code, head, sublevels };
  });
}

async function crawlRecursive(page, url, currentDepth, maxDepth) {
  const data = await extractOrgPage(page, url);

  const node = { code: data.code, name: data.name, head: data.head, children: [] };

  if (currentDepth < maxDepth && data.sublevels.length > 0) {
    for (const sub of data.sublevels) {
      if (sub.href) {
        const child = await crawlRecursive(page, sub.href, currentDepth + 1, maxDepth);
        node.children.push(child);
      } else {
        node.children.push({ code: sub.code, name: sub.name, head: '', children: [] });
      }
    }
  } else {
    // Store sublevel names without drilling deeper
    for (const sub of data.sublevels) {
      node.children.push({ code: sub.code, name: sub.name, head: '', children: [] });
    }
  }

  return node;
}

(async () => {
  const startTime = Date.now();
  console.log('EC Organigram Crawler');
  console.log(`  Depth: ${MAX_DEPTH} | DG: ${ONLY_DG || 'ALL'} | Output: ${OUTPUT_FILE}`);
  console.log('');

  try {
    const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
    const page = await browser.newPage();

    // Get top-level DGs
    console.log('Fetching Commission top-level...');
    const comData = await extractOrgPage(page, BASE_URL);
    console.log(`  ${comData.sublevels.length} DGs/services found\n`);

    const result = {
      code: 'COM',
      name: 'European Commission',
      head: comData.head,
      crawledAt: new Date().toISOString(),
      maxDepth: MAX_DEPTH,
      children: []
    };

    // Filter DGs if requested
    const toProcess = ONLY_DG
      ? comData.sublevels.filter(s => s.code.toUpperCase() === ONLY_DG.toUpperCase())
      : comData.sublevels;

    if (ONLY_DG && toProcess.length === 0) {
      console.error(`DG "${ONLY_DG}" not found.`);
      console.error(`Available: ${comData.sublevels.map(s => s.code).join(', ')}`);
      await page.close();
      await browser.disconnect();
      return;
    }

    // Crawl each DG
    for (let i = 0; i < toProcess.length; i++) {
      const dg = toProcess[i];
      const prefix = `[${i + 1}/${toProcess.length}]`;

      if (MAX_DEPTH >= 2 && dg.href) {
        console.log(`${prefix} ${dg.code}: ${dg.name} ...`);
        const dgNode = await crawlRecursive(page, dg.href, 1, MAX_DEPTH);
        result.children.push(dgNode);

        const dirCount = dgNode.children.length;
        const unitCount = dgNode.children.reduce((s, d) => s + d.children.length, 0);
        console.log(`       -> ${dirCount} directorates, ${unitCount} units (${pageCount} pages total)`);

        // Save intermediate progress every 5 DGs
        if ((i + 1) % 5 === 0) {
          fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf8');
          console.log(`       [saved intermediate progress]`);
        }
      } else {
        result.children.push({ code: dg.code, name: dg.name, head: '', children: [] });
      }
    }

    // Final save
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf8');

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const totalDirs = result.children.reduce((s, dg) => s + dg.children.length, 0);
    const totalUnits = result.children.reduce((s, dg) =>
      s + dg.children.reduce((s2, dir) => s2 + dir.children.length, 0), 0);

    console.log(`\nDone in ${elapsed}s | ${pageCount} pages fetched`);
    console.log(`${result.children.length} DGs | ${totalDirs} directorates | ${totalUnits} units`);
    console.log(`Output: ${OUTPUT_FILE}`);

    await page.close();
    await browser.disconnect();
  } catch (err) {
    console.error('ERROR:', err.message);
    console.error(err.stack);
  }
})();
