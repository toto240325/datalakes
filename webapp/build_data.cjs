/**
 * Builds the webapp data file from SYSPER2 crawl output.
 * 
 * Input:  ../sysper_people.json (from crawl_sysper.js)
 * Output: public/ec_directory.json (consumed by the webapp)
 * 
 * Usage: node webapp/build_data.cjs
 */

const fs = require('fs');
const path = require('path');

const PEOPLE_FILE = path.join(__dirname, '..', 'data', 'sysper_people.json');
const OUTPUT_FILE = path.join(__dirname, 'public', 'ec_directory.json');

if (!fs.existsSync(PEOPLE_FILE)) {
  console.error(`Input not found: ${PEOPLE_FILE}`);
  console.error('Run crawl_sysper.js first.');
  process.exit(1);
}

const people = JSON.parse(fs.readFileSync(PEOPLE_FILE, 'utf8'));
console.log(`Loaded ${people.length} people`);

// Build org map from people data
// Each person has: unit, unitName, dg — we infer the hierarchy from unit codes
const orgMap = {};

for (const person of people) {
  const code = person.unit;
  if (!code) continue;

  if (!orgMap[code]) {
    // Infer parent from code: DIGIT.A.1.001 -> DIGIT.A.1 -> DIGIT.A -> DIGIT
    const parts = code.split('.');
    let parentCode = null;
    for (let i = parts.length - 1; i >= 1; i--) {
      const candidate = parts.slice(0, i).join('.');
      if (candidate !== code) {
        parentCode = candidate;
        break;
      }
    }

    orgMap[code] = {
      code,
      name: person.unitName || code,
      parent: parentCode,
      dg: person.dg,
      children: [],
      people: []
    };
  }

  orgMap[code].people.push({
    name: person.name,
    title: person.jobTitle,
    location: person.location,
    statute: person.statute,
    funcGroup: person.funcGroup,
    management: person.management,
    headOfEntity: person.headOfEntity
  });
}

// Ensure all parent nodes exist (some might not have people directly)
for (const code of Object.keys(orgMap)) {
  let current = orgMap[code].parent;
  while (current && !orgMap[current]) {
    orgMap[current] = {
      code: current,
      name: current,
      parent: current.includes('.') ? current.split('.').slice(0, -1).join('.') : null,
      dg: orgMap[code].dg,
      children: [],
      people: []
    };
    current = orgMap[current].parent;
  }
}

// Build children arrays
for (const [code, org] of Object.entries(orgMap)) {
  if (org.parent && orgMap[org.parent]) {
    if (!orgMap[org.parent].children.includes(code)) {
      orgMap[org.parent].children.push(code);
    }
  }
}

// Sort children alphabetically
for (const org of Object.values(orgMap)) {
  org.children.sort();
}

// Build people index for search
const peopleIndex = [];
for (const [code, org] of Object.entries(orgMap)) {
  for (const person of org.people) {
    peopleIndex.push({
      name: person.name,
      function: person.title,
      unit: code,
      unitName: org.name
    });
  }
}

// Output
const output = {
  orgMap,
  peopleIndex,
  meta: {
    generatedAt: new Date().toISOString(),
    totalOrgs: Object.keys(orgMap).length,
    totalPeople: peopleIndex.length,
    source: 'SYSPER2'
  }
};

// Ensure output directory exists
const outDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output), 'utf8');

const sizeMB = (fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(1);
console.log(`Done.`);
console.log(`  Orgs: ${output.meta.totalOrgs}`);
console.log(`  People: ${output.meta.totalPeople}`);
console.log(`  Output: ${OUTPUT_FILE} (${sizeMB} MB)`);
