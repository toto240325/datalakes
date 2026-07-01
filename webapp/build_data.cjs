/**
 * Merges the org tree (digit_full.json) and people data (ec_people.json)
 * into a single flat map for the webapp.
 * 
 * Output: webapp/public/ec_directory.json
 * 
 * Usage: node webapp/build_data.js
 */

const fs = require('fs');
const path = require('path');

// Input files
const ORG_FILE = path.join(__dirname, '..', 'digit_full.json');
const PEOPLE_FILE = path.join(__dirname, '..', 'ec_people.json');
const OUTPUT_FILE = path.join(__dirname, 'public', 'ec_directory.json');

// Read inputs
const orgTree = JSON.parse(fs.readFileSync(ORG_FILE, 'utf8'));
const people = JSON.parse(fs.readFileSync(PEOPLE_FILE, 'utf8'));

// Build flat org map from tree
const orgMap = {};

function flattenTree(node, parentCode) {
  // Clean up name (remove trailing code in parentheses)
  let name = node.name.replace(/\s*\([^)]*\)\s*$/, '').trim();

  orgMap[node.code] = {
    code: node.code,
    name: name,
    parent: parentCode || null,
    children: (node.children || []).map(c => c.code),
    people: []
  };

  for (const child of (node.children || [])) {
    flattenTree(child, node.code);
  }
}

// Start from DIGIT level (skip the COM wrapper)
const digitNode = orgTree.children
  ? orgTree.children.find(c => c.code === 'DIGIT')
  : orgTree;

if (digitNode) {
  flattenTree(digitNode, null);
} else {
  console.error('Could not find DIGIT node in org tree');
  process.exit(1);
}

// Assign people to their org units
let assignedCount = 0;
let unassignedCount = 0;

for (const person of people) {
  const unitCode = person.unit;
  if (orgMap[unitCode]) {
    orgMap[unitCode].people.push({
      name: person.name,
      title: person.title,
      function: person.function,
      phone: person.phone
    });
    assignedCount++;
  } else {
    // Unit not in org tree — create it as orphan under its parent
    // Try to infer parent from code (e.g. DIGIT.A.1.001 -> DIGIT.A.1)
    const parts = unitCode.split('.');
    let parentCode = null;
    for (let i = parts.length - 1; i >= 1; i--) {
      const candidate = parts.slice(0, i).join('.');
      if (orgMap[candidate]) {
        parentCode = candidate;
        break;
      }
    }

    orgMap[unitCode] = {
      code: unitCode,
      name: person.unitName || unitCode,
      parent: parentCode,
      children: [],
      people: [{
        name: person.name,
        title: person.title,
        function: person.function,
        phone: person.phone
      }]
    };

    // Add as child of parent
    if (parentCode && orgMap[parentCode]) {
      if (!orgMap[parentCode].children.includes(unitCode)) {
        orgMap[parentCode].children.push(unitCode);
      }
    }
    assignedCount++;
  }
}

// Build people index for search
const peopleIndex = [];
for (const [code, org] of Object.entries(orgMap)) {
  for (const person of org.people) {
    peopleIndex.push({
      name: person.name,
      function: person.function,
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
    totalPeople: peopleIndex.length
  }
};

// Ensure output directory exists
const outDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output), 'utf8');

console.log(`Done.`);
console.log(`  Orgs: ${output.meta.totalOrgs}`);
console.log(`  People: ${output.meta.totalPeople} (${assignedCount} assigned)`);
console.log(`  Output: ${OUTPUT_FILE}`);
