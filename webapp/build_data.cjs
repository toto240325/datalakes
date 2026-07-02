/**
 * Builds the webapp data file by merging:
 *   - SYSPER2 crawl (org structure + job titles) — filtered to public fields only
 *   - AD export (email, phone, office, photo username)
 * 
 * Input:  ../data/sysper_people.json, ../data/ad_details.csv, ../data/photo_mapping.csv
 * Output: public/ec_directory.json
 * 
 * Usage: node webapp/build_data.cjs
 */

const fs = require('fs');
const path = require('path');

const PEOPLE_FILE = path.join(__dirname, '..', 'data', 'sysper_people.json');
const AD_FILE = path.join(__dirname, '..', 'data', 'ad_details.csv');
const PHOTO_MAPPING_FILE = path.join(__dirname, '..', 'data', 'photo_mapping.csv');
const A4_EXCEL_FILE = path.join(__dirname, '..', 'data', 'digit_a4_staff.xlsx');
const OUTPUT_FILE = path.join(__dirname, 'public', 'ec_directory.json');

if (!fs.existsSync(PEOPLE_FILE)) {
  console.error(`Input not found: ${PEOPLE_FILE}\nRun crawl_sysper.js first.`);
  process.exit(1);
}

// 1. Load SYSPER people
const people = JSON.parse(fs.readFileSync(PEOPLE_FILE, 'utf8'));
console.log(`SYSPER: ${people.length} people`);

// 2. Load AD details (public fields: email, phone, office)
// Keyed by normalized "FirstName SURNAME" for matching
const adMap = new Map(); // "eric derruine" -> { email, phone, office, username }
const adByPhone = new Map(); // normalized phone -> { email, phone, office, username }
const adByUsername = new Map(); // "derruer" -> { email, phone, office, username }
if (fs.existsSync(AD_FILE)) {
  const lines = fs.readFileSync(AD_FILE, 'utf8').split('\n').slice(1);
  for (const line of lines) {
    const [username, givenName, surname, mail, phone, office, city, dept, company] = line.split('\t');
    if (username && givenName && surname) {
      const entry = {
        username: username.trim(),
        email: (mail || '').trim(),
        phone: (phone || '').trim(),
        office: (office || '').trim(),
      };
      const key = `${givenName} ${surname}`.trim().toLowerCase();
      adMap.set(key, entry);
      adByUsername.set(username.trim(), entry);
      // Also index by phone for fallback matching
      if (entry.phone) {
        const normPhone = entry.phone.replace(/[\s\-\+]/g, '').slice(-6); // last 6 digits
        adByPhone.set(normPhone, entry);
      }
    }
  }
  console.log(`AD:     ${adMap.size} users loaded (${adByPhone.size} with phone)`);
} else {
  console.log('AD:     not found (run export_ad_details.ps1 for email/phone/office)');
}

// 2b. Load A4 Excel username mapping (direct username for DIGIT.A.4 staff)
const a4UsernameMap = new Map(); // normalized name -> username
if (fs.existsSync(A4_EXCEL_FILE)) {
  const XLSX = require('xlsx');
  const wb = XLSX.readFile(A4_EXCEL_FILE);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }).slice(1);
  for (const row of rows) {
    const [username, , fullName] = row;
    if (username && fullName) {
      a4UsernameMap.set(fullName.trim().toLowerCase(), username.trim());
    }
  }
  console.log(`A4 map: ${a4UsernameMap.size} direct username mappings`);
}

// 3. Load photo mapping (username -> has photo)
let photoUsers = new Set();
if (fs.existsSync(PHOTO_MAPPING_FILE)) {
  const lines = fs.readFileSync(PHOTO_MAPPING_FILE, 'utf8').split('\n').slice(1);
  for (const line of lines) {
    const username = line.split('\t')[0];
    if (username) photoUsers.add(username.trim());
  }
  console.log(`Photos: ${photoUsers.size} users with photos`);
}

// 3b. Build phone-to-name bridge from Who-is-Who data (has phone + name)
const WIW_FILE = path.join(__dirname, '..', 'data', 'ec_people.json');
const nameByPhone = new Map(); // normalized phone -> sysper-style name
if (fs.existsSync(WIW_FILE)) {
  const wiwPeople = JSON.parse(fs.readFileSync(WIW_FILE, 'utf8'));
  for (const p of wiwPeople) {
    if (p.phone && p.name) {
      const normPhone = p.phone.replace(/[\s\-\+]/g, '').slice(-6);
      nameByPhone.set(normPhone, p.name.trim().toLowerCase());
    }
  }
  console.log(`WiW:    ${nameByPhone.size} phone-to-name mappings (for fallback)`);
}

// 4. Build org map — only PUBLIC fields from SYSPER + AD enrichment
const orgMap = {};
let adMatches = 0;

for (const person of people) {
  const code = person.unit;
  if (!code) continue;

  if (!orgMap[code]) {
    const parts = code.split('.');
    let parentCode = null;
    for (let i = parts.length - 1; i >= 1; i--) {
      const candidate = parts.slice(0, i).join('.');
      if (candidate !== code) { parentCode = candidate; break; }
    }
    orgMap[code] = { code, name: person.unitName || code, parent: parentCode, dg: person.dg, children: [], people: [] };
  }

  // Match to AD: try name first, then A4 direct username, then phone fallback
  const nameKey = person.name.trim().toLowerCase();
  let ad = adMap.get(nameKey);
  
  // Fallback 1: A4 Excel direct username mapping
  if (!ad) {
    const a4Username = a4UsernameMap.get(nameKey);
    if (a4Username) {
      // Look up this username in AD by scanning (build a username index)
      ad = adByUsername.get(a4Username);
    }
  }
  
  // Fallback 2: use Who-is-Who phone data as bridge to AD
  if (!ad) {
    for (const [normPhone, wiwName] of nameByPhone) {
      if (wiwName === nameKey) {
        const adEntry = adByPhone.get(normPhone);
        if (adEntry) { ad = adEntry; break; }
      }
    }
  }
  
  if (ad) adMatches++;

  // Only PUBLIC fields — no statute, funcGroup, management, headOfEntity, occupation, jobId
  orgMap[code].people.push({
    name: person.name,
    title: person.jobTitle,        // from SYSPER (same as Who-is-Who function)
    location: person.location,     // from SYSPER (also in AD)
    email: ad ? ad.email : '',     // from AD (public)
    phone: ad ? ad.phone : '',     // from AD (public)
    office: ad ? ad.office : '',   // from AD (public)
    username: ad && photoUsers.has(ad.username) ? ad.username : ''
  });
}

console.log(`Match:  ${adMatches}/${people.length} people matched to AD (${(adMatches/people.length*100).toFixed(0)}%)`);

// 4b. DIGIT.A.4 override: relocate PREST from .005 to real sectors + teams
if (fs.existsSync(A4_EXCEL_FILE)) {
  const XLSX = require('xlsx');
  const wb = XLSX.readFile(A4_EXCEL_FILE);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }).slice(1); // skip header

  let relocated = 0;
  for (const row of rows) {
    const [username, sysperSector, fullName, , , team, realSector, , , , , status] = row;
    if (status !== 'PREST' || !team || !realSector) continue;

    // Normalize real sector code: "DIGIT.A4.001" -> "DIGIT.A.4.001"
    const normalizedSector = realSector.replace(/A4/, 'A.4');
    // Team node code: e.g. "DIGIT.A.4.001.EC-Answer"
    const teamCode = `${normalizedSector}.${team}`;

    // Find this person in orgMap DIGIT.A.4.005 and move them
    const srcCode = 'DIGIT.A.4.005';
    if (!orgMap[srcCode]) continue;

    const personIdx = orgMap[srcCode].people.findIndex(p => 
      p.name.toLowerCase() === fullName.trim().toLowerCase()
    );
    if (personIdx === -1) continue;

    const person = orgMap[srcCode].people.splice(personIdx, 1)[0];

    // Ensure team node exists
    if (!orgMap[teamCode]) {
      orgMap[teamCode] = {
        code: teamCode,
        name: team,
        parent: normalizedSector,
        dg: 'DIGIT',
        children: [],
        people: []
      };
    }

    orgMap[teamCode].people.push(person);
    relocated++;
  }
  console.log(`A4 fix: ${relocated} PREST relocated to real sectors/teams`);
}

// 5. Ensure parent nodes exist
for (const code of Object.keys(orgMap)) {
  let current = orgMap[code].parent;
  while (current && !orgMap[current]) {
    orgMap[current] = { code: current, name: current, parent: current.includes('.') ? current.split('.').slice(0, -1).join('.') : null, dg: orgMap[code].dg, children: [], people: [] };
    current = orgMap[current].parent;
  }
}

// 6. Build children arrays
for (const [code, org] of Object.entries(orgMap)) {
  if (org.parent && orgMap[org.parent] && !orgMap[org.parent].children.includes(code)) {
    orgMap[org.parent].children.push(code);
  }
}
for (const org of Object.values(orgMap)) { org.children.sort(); }

// 7. Build search index
const peopleIndex = [];
for (const [code, org] of Object.entries(orgMap)) {
  for (const person of org.people) {
    peopleIndex.push({ name: person.name, function: person.title, unit: code, unitName: org.name });
  }
}

// 8. Write output
const output = { orgMap, peopleIndex, meta: { generatedAt: new Date().toISOString(), totalOrgs: Object.keys(orgMap).length, totalPeople: peopleIndex.length, source: 'SYSPER2 + AD (public fields only)' } };

const outDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output), 'utf8');

const sizeMB = (fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(1);
console.log(`\nOutput: ${OUTPUT_FILE} (${sizeMB} MB)`);
console.log(`  ${output.meta.totalOrgs} orgs, ${output.meta.totalPeople} people`);
