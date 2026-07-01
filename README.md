# EC Datalakes

Tools to extract structured data from the European Commission's internal and public directories.

## Goal

Build a complete, machine-readable dataset of all EC staff members with their:
- Name
- Function/job title (e.g. "IT Projects Manager", "Legal and Policy Officer")
- Organizational unit (DG, Directorate, Unit, Sector)
- Phone number

## Data Sources

### 1. EU "Who is Who" (op.europa.eu)
The official EU directory. Public but requires EU Login authentication.
Contains the full org structure and individual staff with their function titles.

### 2. EC Active Directory (internal)
The internal LDAP directory. Accessible only from the EC network via PowerShell.
Contains all staff but only Mr/Ms as "title" — no real job function.

## Scripts

### `crawl_full_organigram.js`
Crawls the Who-is-Who to extract the Commission's org structure (DGs → Directorates → Units → Sectors).
Outputs a hierarchical JSON with org codes, names, and heads.

### `crawl_people.js`
Crawls the Who-is-Who to extract all individual people with their function titles.
Recursively visits every page in the org hierarchy and parses people entries.

```bash
# Crawl one DG
node crawl_people.js --dg DIGIT

# Crawl all DGs
node crawl_people.js

# Resume after interruption
node crawl_people.js --resume
```

### `active_directory.ps1`
PowerShell script to dump the EC Active Directory to CSV.
Run from the EC network with RSAT installed.

## Prerequisites

- Node.js + `npm install puppeteer-core`
- Microsoft Edge running with `--remote-debugging-port=9222`
- Authenticated session on op.europa.eu in Edge

### Starting Edge with remote debugging
```
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --remote-debugging-port=9222
```

## Output Files

| File | Description |
|------|-------------|
| `ec_people.json` | All people with function titles (JSON array) |
| `ec_people.csv` | Same data as tab-separated CSV |
| `ec_organigram_dgs.json` | List of all 49 DGs with Who-is-Who URLs |
| `digit_full.json` | DIGIT org structure (from organigram crawler) |

## Status

- [x] Org structure crawler working
- [x] People crawler working (tested with DIGIT: 2808 people, 148 pages, 21 min)
- [ ] Full Commission crawl (49 DGs, estimated 2-4 hours)
