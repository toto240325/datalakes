/**
 * Builds a standalone single-file HTML version of the EC Directory Explorer.
 * 
 * The data is inlined as a JavaScript variable — no server needed.
 * Photos are not included (would add ~55 MB in base64).
 * 
 * Input:  public/ec_directory.json, index.html
 * Output: standalone/ec_directory_standalone_YYYY-MM-DD.html
 * 
 * Usage: node webapp/build_standalone.cjs
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'public', 'ec_directory.json');
const OUTPUT_DIR = path.join(__dirname, 'standalone');

if (!fs.existsSync(DATA_FILE)) {
  console.error(`Data file not found: ${DATA_FILE}\nRun build_data.cjs first.`);
  process.exit(1);
}

// Load the data
console.log('Loading data...');
const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
console.log(`  ${data.meta.totalPeople} people, ${data.meta.totalOrgs} orgs`);

// Date for filename
const dateStr = new Date().toISOString().slice(0, 10);
const outputFile = path.join(OUTPUT_DIR, `ec_directory_standalone_${dateStr}.html`);

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Build the standalone HTML
console.log('Building standalone HTML...');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EC Directory Explorer (Standalone)</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; color: #333; }
    
    .header { background: #003399; color: white; padding: 1rem 2rem; display: flex; align-items: center; gap: 1rem; }
    .header h1 { font-size: 1.3rem; font-weight: 500; }
    .header .subtitle { opacity: 0.7; font-size: 0.85rem; }

    .search-container { max-width: 600px; margin: 2rem auto; padding: 0 1rem; position: relative; }
    .search-input { width: 100%; padding: 0.8rem 1rem; font-size: 1rem; border: 2px solid #ddd; border-radius: 8px; outline: none; transition: border-color 0.2s; }
    .search-input:focus { border-color: #003399; }
    .search-results { position: absolute; top: 100%; left: 1rem; right: 1rem; background: white; border: 1px solid #ddd; border-radius: 0 0 8px 8px; max-height: 300px; overflow-y: auto; z-index: 100; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .search-results.hidden { display: none; }
    .search-item { padding: 0.6rem 1rem; cursor: pointer; border-bottom: 1px solid #f0f0f0; }
    .search-item:hover { background: #f0f7ff; }
    .search-item .name { font-weight: 500; }
    .search-item .detail { font-size: 0.8rem; color: #666; margin-top: 2px; }

    .org-view { max-width: 1100px; margin: 0 auto; padding: 1rem; }
    .org-view.hidden { display: none; }

    .breadcrumb { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-bottom: 1.5rem; font-size: 0.85rem; }
    .breadcrumb a { color: #003399; text-decoration: none; cursor: pointer; }
    .breadcrumb a:hover { text-decoration: underline; }
    .breadcrumb .sep { color: #999; }

    .org-level { margin-bottom: 1.5rem; }
    .level-label { font-size: 0.75rem; text-transform: uppercase; color: #666; font-weight: 600; letter-spacing: 0.05em; margin-bottom: 0.5rem; }

    .org-card { background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem 1.2rem; margin-bottom: 0.5rem; cursor: pointer; transition: box-shadow 0.2s, border-color 0.2s; }
    .org-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); border-color: #003399; }
    .org-card.current { border-color: #003399; border-width: 2px; background: #f0f7ff; }
    .org-card.parent { border-color: #999; }
    .org-card .org-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem; }
    .org-card .org-code { font-weight: 600; color: #003399; }
    .org-card .org-name { color: #555; font-size: 0.9rem; }
    .org-card .people-count { font-size: 0.75rem; color: #999; }

    .people-list { margin-top: 0.5rem; }
    .person { display: flex; justify-content: space-between; align-items: center; padding: 0.35rem 0; border-top: 1px solid #f0f0f0; font-size: 0.85rem; }
    .person:first-child { border-top: none; }
    .person .p-left { display: flex; align-items: center; gap: 0.4rem; }
    .person .p-name { font-weight: 500; white-space: nowrap; }
    .person .p-name.highlight { background: #ffe066; padding: 0 3px; border-radius: 3px; }
    .person .p-name-block { display: flex; flex-direction: column; position: relative; }
    .person .p-function { color: #666; font-size: 0.8rem; text-align: right; margin-left: 1rem; }

    .tooltip { display: none; position: absolute; left: 0; top: 100%; z-index: 200; background: white; border: 1px solid #ccc; border-radius: 6px; padding: 0.5rem 0.7rem; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-size: 0.78rem; color: #444; white-space: nowrap; margin-top: 4px; }
    .tooltip .tooltip-details { line-height: 1.5; }
    .person:hover .tooltip { display: block; }

    .children-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 0.5rem; }

    .no-results { text-align: center; padding: 3rem; color: #999; }

    .standalone-badge { background: #ff9800; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; margin-left: 0.5rem; }

    @media (max-width: 600px) {
      .children-grid { grid-template-columns: 1fr; }
      .person { flex-direction: column; align-items: flex-start; }
      .person .p-function { margin-left: 0; margin-top: 2px; text-align: left; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>EC Directory Explorer <span class="standalone-badge">OFFLINE</span></h1>
      <div class="subtitle">European Commission \u2013 Who is Who \xb7 <span id="dataDate"></span></div>
    </div>
  </div>

  <div class="search-container">
    <input type="text" class="search-input" id="searchInput" placeholder="Search by name (e.g. BUHR, Popescu, Siatras...)" autocomplete="off">
    <div class="search-results hidden" id="searchResults"></div>
  </div>

  <div class="org-view hidden" id="orgView"></div>

  <script>
    // Inline data (no server needed)
    const DATA = ${JSON.stringify(data)};

    let currentHighlight = null;

    // Show data date
    if (DATA.meta && DATA.meta.generatedAt) {
      const d = new Date(DATA.meta.generatedAt);
      document.getElementById('dataDate').textContent = 'Data from ' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    document.getElementById('searchInput').focus();

    // Search
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    let debounceTimer;

    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(doSearch, 150);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const firstItem = searchResults.querySelector('.search-item');
        if (firstItem) firstItem.click();
      }
    });

    searchInput.addEventListener('focus', () => {
      if (searchResults.children.length > 0) searchResults.classList.remove('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) searchResults.classList.add('hidden');
    });

    function surnameFirst(name) {
      const parts = name.split(' ');
      const upper = parts.filter(p => p === p.toUpperCase() && p.length > 1);
      const rest = parts.filter(p => p !== p.toUpperCase() || p.length <= 1);
      if (upper.length > 0) return upper.join(' ') + ' ' + rest.join(' ');
      return name;
    }

    function doSearch() {
      const query = searchInput.value.trim().toLowerCase();
      if (!query || query.length < 2) {
        searchResults.classList.add('hidden');
        return;
      }

      const queryParts = query.split(/\\s+/);
      
      const matches = DATA.peopleIndex.filter(p => {
        const name = p.name.toLowerCase();
        if (queryParts.length === 1) return name.includes(query);
        return queryParts.every(part => name.includes(part));
      }).slice(0, 20);

      if (matches.length === 0) {
        searchResults.innerHTML = '<div class="search-item"><span class="detail">No results found</span></div>';
      } else {
        searchResults.innerHTML = matches.map(p => \`
          <div class="search-item" data-unit="\${p.unit}" data-name="\${p.name}">
            <div class="name">\${highlightMatch(surnameFirst(p.name), query)}</div>
            <div class="detail">\${p.function || '(no function)'} \\u2014 \${p.unitName} (\${p.unit})</div>
          </div>
        \`).join('');
      }
      searchResults.classList.remove('hidden');

      searchResults.querySelectorAll('.search-item').forEach(item => {
        item.addEventListener('click', () => {
          const unit = item.dataset.unit;
          const name = item.dataset.name;
          currentHighlight = name;
          searchResults.classList.add('hidden');
          showOrgView(unit);
        });
      });
    }

    function highlightMatch(text, query) {
      const idx = text.toLowerCase().indexOf(query);
      if (idx === -1) return text;
      return text.substring(0, idx) + '<mark>' + text.substring(idx, idx + query.length) + '</mark>' + text.substring(idx + query.length);
    }

    function showOrgView(unitCode) {
      const view = document.getElementById('orgView');
      const org = DATA.orgMap[unitCode];
      if (!org) {
        view.innerHTML = '<div class="no-results">Unit not found</div>';
        view.classList.remove('hidden');
        return;
      }

      let html = '';
      html += '<div class="breadcrumb">' + buildBreadcrumb(unitCode) + '</div>';

      if (org.parent && DATA.orgMap[org.parent]) {
        const parent = DATA.orgMap[org.parent];
        html += '<div class="org-level"><div class="level-label">Parent</div>';
        html += renderOrgCard(parent, 'parent');
        html += '</div>';
      }

      html += '<div class="org-level"><div class="level-label">Current</div>';
      html += renderOrgCard(org, 'current', true);
      html += '</div>';

      if (org.children && org.children.length > 0) {
        html += '<div class="org-level"><div class="level-label">Sub-levels (' + org.children.length + ')</div>';
        html += '<div class="children-grid">';
        for (const childCode of org.children) {
          const child = DATA.orgMap[childCode];
          if (child) html += renderOrgCard(child, 'child');
        }
        html += '</div></div>';
      }

      view.innerHTML = html;
      view.classList.remove('hidden');

      view.querySelectorAll('[data-navigate]').forEach(el => {
        el.addEventListener('click', () => {
          currentHighlight = null;
          showOrgView(el.dataset.navigate);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      });
    }

    function renderOrgCard(org, type, showAllPeople) {
      const maxPeople = showAllPeople ? 999 : 5;
      const people = org.people || [];
      const shown = people.slice(0, maxPeople);
      const remaining = people.length - shown.length;

      let html = \`<div class="org-card \${type}" data-navigate="\${org.code}">\`;
      html += '<div class="org-header">';
      html += \`<span class="org-code">\${org.code}</span>\`;
      html += \`<span class="people-count">\${people.length} people</span>\`;
      html += '</div>';
      html += \`<div class="org-name">\${org.name}</div>\`;

      if (shown.length > 0) {
        html += '<div class="people-list">';
        for (const p of shown) {
          const isHighlighted = currentHighlight && p.name === currentHighlight;
          const isExternal = p.email && p.email.includes('@ext.');
          const extBadge = isExternal ? ' <span style="color:#999;font-weight:normal;font-size:0.75rem">(EXT)</span>' : '';
          const rawFunc = p.title || '';
          const displayFunc = (rawFunc === 'BRU' || rawFunc === 'LUX') ? '' : rawFunc;
          const detailParts = [p.username ? ('\\u{1F464} ' + p.username) : '', p.email, p.phone, p.office, p.location].filter(Boolean);
          const tooltipHtml = detailParts.length > 0
            ? \`<span class="tooltip"><span class="tooltip-details">\${detailParts.join('<br>')}</span></span>\`
            : '';
          html += '<div class="person">';
          html += \`<span class="p-left"><span class="p-name-block"><span class="p-name\${isHighlighted ? ' highlight' : ''}">\${p.name}\${extBadge}</span>\${tooltipHtml}</span></span>\`;
          html += \`<span class="p-function">\${displayFunc}</span>\`;
          html += '</div>';
        }
        if (remaining > 0) {
          html += \`<div class="person"><span class="detail">+ \${remaining} more...</span></div>\`;
        }
        html += '</div>';
      }

      html += '</div>';
      return html;
    }

    function buildBreadcrumb(unitCode) {
      const parts = [];
      let code = unitCode;
      while (code) {
        const org = DATA.orgMap[code];
        if (!org) break;
        parts.unshift(\`<a data-navigate="\${code}">\${org.code}</a>\`);
        code = org.parent;
      }
      return parts.join('<span class="sep"> \\u203A </span>');
    }
  </script>
</body>
</html>`;

fs.writeFileSync(outputFile, html, 'utf8');

const sizeMB = (fs.statSync(outputFile).size / 1024 / 1024).toFixed(1);
console.log(`\nDone: ${outputFile}`);
console.log(`Size: ${sizeMB} MB`);
console.log(`\nJust open this file in any browser — no server needed.`);
