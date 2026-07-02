# EC Datalakes

Tools to extract and explore the European Commission staff directory.

## Goal

A searchable webapp showing all EC colleagues with their job title, org unit, and position in the organigram — with navigation up/down the hierarchy.

## Architecture

```
crawl_sysper.js          → data/sysper_people.json     (58K people, all DGs)
webapp/build_data.cjs    → webapp/public/ec_directory.json  (webapp data)
webapp/index.html        → http://localhost:8080        (search + org view)
```

## Quick Start

```bash
# 1. Start Edge with remote debugging
msedge --remote-debugging-port=9222

# 2. Open SYSPER2 in Edge and authenticate

# 3. Crawl all staff
node crawl_sysper.js

# 4. Build webapp data
node webapp/build_data.cjs

# 5. Serve webapp
python -m http.server 8080 --bind 127.0.0.1 -d webapp
# Open http://localhost:8080/index.html
```

## Data Sources

| Source | Access | Data | Speed |
|--------|--------|------|-------|
| SYSPER2 (intranet) | EC network + auth | Name, job title, statute, grade, location, management | 58K people in 28 min |
| Active Directory | EC network + RSAT | Name, email, department, office, phone, photo | ~1 min (in-memory) |
| Who is Who (public) | EU Login | Name, function title, phone | ~4 hours (legacy) |

## Project Structure

```
crawl_sysper.js        Main crawler (SYSPER2 approach)
active_directory.ps1   PowerShell AD export & photo extraction
webapp/                Web app (search + organigram viewer)
  index.html           Single-page app
  build_data.cjs       Builds webapp JSON from crawl output
  public/              Static assets (favicon, generated data)
data/                  Generated data files (gitignored)
legacy/                Old Who-is-Who scrapers and exploration files
```

## Status

- [x] SYSPER2 crawler: 58,239 people across 48 DGs (28 min)
- [x] Webapp: search by name, navigate organigram ±1 level
- [x] AD photo extraction (proof of concept)
- [ ] Integrate photos into webapp
- [ ] Full Commission crawl automation (scheduled refresh)
