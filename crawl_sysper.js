/**
 * SYSPER2 Fast Crawler
 * 
 * Exploits the SYSPER2 internal app to extract all EC staff with rich data
 * (name, job title, location, statute, function group, management flag).
 * 
 * Much faster than Who-is-Who scraping: uses in-browser fetch() calls
 * against the authenticated session — no page navigation needed.
 * 
 * Prerequisites:
 *   - Edge running with --remote-debugging-port=9222
 *   - A SYSPER2 tab open and authenticated
 *   - npm install puppeteer-core
 * 
 * Usage:
 *   node crawl_sysper.js [--dg DIGIT] [--output sysper_people.json] [--resume]
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');

const delay = ms => new Promise(r => setTimeout(r, ms));

// CLI args
const args = process.argv.slice(2);
function getArg(name, defaultVal) {
  const idx = args.indexOf(`--${name}`);
  return (idx !== -1 && args[idx + 1]) ? args[idx + 1] : defaultVal;
}
const OUTPUT_FILE = getArg('output', 'sysper_people.json');
const ONLY_DG = getArg('dg', null);
const RESUME = args.includes('--resume');

let fetchCount = 0;

/**
 * Fetch an org unit page and parse the jobs + child ouIds from the HTML.
 * Runs inside the browser context (uses session cookies).
 */
async function fetchOrgUnit(page, ouId) {
  fetchCount++;
  return page.evaluate(async (ouId) => {
    const resp = await fetch(`/SYSPER2/org/vieworganisationjobs_jd.do?ouId=${ouId}&viewDate=01/07/2026`, {
      credentials: 'include'
    });
    if (!resp.ok) return { error: resp.status, jobs: [], children: [] };

    const html = await resp.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const text = doc.body.innerText;

    // 1. Extract the org unit title
    const titleEl = doc.querySelector('.title-page');
    const rawTitle = titleEl ? titleEl.textContent.trim().replace(/\s+/g, ' ') : '';
    // Format: "DIGIT.A.4, Policy Solutions & Business Automation"
    const titleParts = rawTitle.split(',');
    const code = titleParts[0] ? titleParts[0].trim() : '';
    const name = titleParts.slice(1).join(',').trim();

    // 2. Extract jobs from the table
    // Pattern in HTML: showJobDetails_OUID_N() { window.open("/SYSPER2/job/job.do?jobId=XXX...
    // Followed by table cells: jobNo, name, title, location, statute, occupation, headOfEntity, management, funcGroup, version, status
    const jobs = [];
    const jobPattern = /showJobDetails_\d+_\d+\(\)\s*\{[^}]*jobId=(\d+)[^}]*\}/g;
    let match;
    const jobIds = [];
    while ((match = jobPattern.exec(html)) !== null) {
      jobIds.push(match[1]);
    }

    // Parse job rows from the HTML
    // Structure: after each showJobDetails_XXX_N() script block, the TDs follow:
    // TD.idData (jobNo), TD (name), TD (jobTitle), TD (location), TD (statute), TD (occupation), TD (headOfEntity), TD (management), TD (funcGroup)
    const sections = html.split(/function showJobDetails_\d+_\d+\(\)/);
    for (let i = 1; i < sections.length; i++) {
      const section = sections[i];
      // Get everything up to the next function or a reasonable end
      const block = section.substring(0, 4000);
      
      // Extract all TD contents in order
      const tdPattern = /<td[^>]*>([\s\S]*?)<\/td>/g;
      const tds = [];
      let tdMatch;
      while ((tdMatch = tdPattern.exec(block)) !== null) {
        // Strip HTML tags and &nbsp; from TD content
        const content = tdMatch[1]
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        if (content) tds.push(content);
      }
      
      // Expected: [name, jobTitle, location, statute, occupation, headOfEntity, management, funcGroup, ...]
      if (tds.length >= 4) {
        const jobId = jobIds[i - 1] || '';
        jobs.push({
          jobId,
          name: tds[0] || '',
          jobTitle: tds[1] || '',
          location: tds[2] || '',
          statute: tds[3] || '',
          occupation: tds[4] || '',
          headOfEntity: tds[5] || '',
          management: tds[6] || '',
          funcGroup: tds[7] || '',
        });
      }
    }

    // 3. Extract child ouIds from the jstree data in the page
    const children = [];
    const treeMatch = html.match(/var\s+jsTreeData\s*=\s*(\{[\s\S]*?\});\s*\n/);
    if (treeMatch) {
      try {
        const treeData = JSON.parse(treeMatch[1]);
        // Find the node matching our ouId and get its children
        function findChildren(node, targetId) {
          if (node.data && node.data.id === targetId && node.children) {
            return node.children.map(c => ({
              ouId: c.data.id,
              title: c.data.title,
              state: c.state
            }));
          }
          if (node.children) {
            for (const child of node.children) {
              const result = findChildren(child, targetId);
              if (result) return result;
            }
          }
          return null;
        }
        const found = findChildren(treeData, parseInt(ouId));
        if (found) children.push(...found);
      } catch (e) {
        // JSON parse failed — tree not fully available for closed nodes
      }
    }

    return { code, name, ouId, jobs, children };
  }, ouId);
}

/**
 * Get the full jstree data from the currently loaded SYSPER2 page.
 * This gives us the top-level DG ouIds.
 */
async function getTreeData(page) {
  return page.evaluate(() => {
    if (typeof jsTreeData !== 'undefined') return jsTreeData;
    // Try to find it in scripts
    const scripts = Array.from(document.querySelectorAll('script:not([src])'));
    for (const s of scripts) {
      const match = s.textContent.match(/var\s+jsTreeData\s*=\s*(\{[\s\S]*?\});\s*\n/);
      if (match) {
        try { return JSON.parse(match[1]); } catch(e) {}
      }
    }
    return null;
  });
}

/**
 * Flatten the jstree data into a list of {ouId, code, name, parent, children[]}.
 * Only includes nodes with state "open" (already expanded) — others need fetching.
 */
function flattenTree(node, parentId) {
  const results = [];
  if (!node || !node.data) return results;

  const titleParts = node.data.title.split(':');
  const code = titleParts[0] || '';
  const name = titleParts.slice(1).join(':').trim();

  results.push({
    ouId: node.data.id,
    code,
    name,
    parent: parentId,
    state: node.state,
    childOuIds: (node.children || []).map(c => c.data.id)
  });

  if (node.children) {
    for (const child of node.children) {
      results.push(...flattenTree(child, node.data.id));
    }
  }

  return results;
}

(async () => {
  const startTime = Date.now();
  console.log('SYSPER2 Fast Crawler');
  console.log(`  DG: ${ONLY_DG || 'ALL'} | Output: ${OUTPUT_FILE}\n`);

  // Connect to Edge
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const pages = await browser.pages();

  let page = null;
  for (const p of pages) {
    if (p.url().includes('SYSPER2')) { page = p; break; }
  }
  if (!page) {
    console.error('No SYSPER2 tab found. Open SYSPER2 in Edge first.');
    await browser.disconnect();
    return;
  }
  console.log('  Connected to SYSPER2 tab');

  // Get the tree data from the page
  const treeData = await getTreeData(page);
  if (!treeData) {
    console.error('Could not find jsTreeData in page');
    await browser.disconnect();
    return;
  }

  // Flatten to get all known nodes
  const allNodes = flattenTree(treeData, null);
  console.log(`  Tree has ${allNodes.length} nodes (from currently expanded view)`);

  // Get the Commission-level DGs
  const commissionNode = allNodes.find(n => n.code === 'COMMISSION');
  const dgNodes = commissionNode
    ? allNodes.filter(n => n.parent === commissionNode.ouId)
    : [];
  console.log(`  ${dgNodes.length} DGs found\n`);

  // Filter if --dg specified
  let toProcess = dgNodes;
  if (ONLY_DG) {
    toProcess = dgNodes.filter(n => n.code.toUpperCase() === ONLY_DG.toUpperCase());
    if (toProcess.length === 0) {
      console.error(`DG "${ONLY_DG}" not found. Available: ${dgNodes.map(n => n.code).join(', ')}`);
      await browser.disconnect();
      return;
    }
  }

  // Load existing data if resuming
  let allPeople = [];
  if (RESUME && fs.existsSync(OUTPUT_FILE)) {
    allPeople = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    console.log(`  Resuming: ${allPeople.length} people already collected\n`);
  }
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

    // Recursive fetch: get this DG's page, then all children
    const dgPeople = await crawlOuRecursive(page, dg.ouId, dg.code, dg.name, dg.code);
    allPeople.push(...dgPeople);

    console.log(` -> ${dgPeople.length} people (total: ${allPeople.length}, fetches: ${fetchCount})`);

    // Save after each DG
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allPeople, null, 2), 'utf8');
  }

  // Final summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
  console.log(`\nDone in ${elapsed}s | ${fetchCount} fetches | ${allPeople.length} people`);
  console.log(`Output: ${OUTPUT_FILE}`);

  // CSV export
  const csvFile = OUTPUT_FILE.replace('.json', '.csv');
  const csvHeader = 'Name\tJobTitle\tUnit\tUnitName\tDG\tLocation\tStatute\tFuncGroup\tManagement\tHeadOfEntity';
  const csvLines = allPeople.map(p =>
    `${p.name}\t${p.jobTitle}\t${p.unit}\t${p.unitName}\t${p.dg}\t${p.location}\t${p.statute}\t${p.funcGroup}\t${p.management}\t${p.headOfEntity}`
  );
  fs.writeFileSync(csvFile, [csvHeader, ...csvLines].join('\n'), 'utf8');
  console.log(`CSV: ${csvFile}`);

  await browser.disconnect();
})();

/**
 * Recursively crawl an org unit and all its children.
 * Returns flat array of people.
 */
async function crawlOuRecursive(page, ouId, code, name, dg) {
  const data = await fetchOrgUnit(page, ouId);

  if (data.error) {
    console.log(` [ERR:${data.error}]`);
    return [];
  }

  // Convert jobs to people records
  const people = data.jobs.map(j => ({
    name: j.name,
    jobTitle: j.jobTitle,
    unit: data.code || code,
    unitName: data.name || name,
    dg,
    location: j.location,
    statute: j.statute,
    funcGroup: j.funcGroup,
    management: j.management,
    headOfEntity: j.headOfEntity,
    jobId: j.jobId,
    occupation: j.occupation
  }));

  if (people.length > 0) {
    process.stdout.write(` [${people.length}]`);
  }

  // Small delay to avoid hammering the server
  await delay(200);

  // Recurse into children
  if (data.children && data.children.length > 0) {
    for (const child of data.children) {
      const titleParts = child.title.split(':');
      const childCode = titleParts[0] || '';
      const childName = titleParts.slice(1).join(':').trim();
      const childPeople = await crawlOuRecursive(page, child.ouId, childCode, childName, dg);
      people.push(...childPeople);
    }
  }

  return people;
}
