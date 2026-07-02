# Catch-Up: Technical Details (v0.3.0)

This file captures everything needed to resume work without the conversation history.

## Architecture

```
SYSPER2 (intranet)──┐
                    ├──► build_data.cjs ──► ec_directory.json ──► webapp (index.html)
AD (LDAP) ──────────┤                                              │
Who-is-Who (WiW) ───┤                                              │
A4 Excel ───────────┘                                              ▼
                                                           Browser (port 8087)
```

## Data Pipeline

1. `crawl_sysper.js` → `data/sysper_people.json` (58K people, ~30 min)
2. `export_ad_details.ps1` → `data/ad_details.csv` (49K users, ~2 min)
3. `get_photos.ps1` → `data/photos/*.jpg` + `data/photo_mapping.csv` (21K photos, ~5 min)
4. `node webapp/build_data.cjs` → `webapp/public/ec_directory.json` (18 MB, merges all)
5. `python -m http.server 8087 --bind 0.0.0.0 -d webapp`

## SYSPER2 Crawler — How It Works

Connects to Edge (port 9222) with an open SYSPER2 tab. Reads `var jsTreeData = {...}` from the page — this contains the entire org tree with `ouId` numbers. Then for each DG:

1. Fetch `/SYSPER2/org/vieworganisationjobs_jd.do?ouId=XXX` via in-browser `fetch()`
2. Parse HTML: split on `function showJobDetails_XXX_N()`, extract TDs after each split
3. TD order: [name, jobTitle, location, statute, occupation, headOfEntity, management, funcGroup]
4. Also parse `jsTreeData` from response to discover child ouIds
5. Recurse into children, 200ms delay between fetches

The tree is lazy: only currently-expanded nodes have children in the initial `jsTreeData`. Closed DGs get their children discovered when we fetch their page.

## Name Matching (SYSPER → AD)

SYSPER names: "Eric DERRUINE", AD uses: "derruer" (SamAccountName). Three-tier matching:

1. **Name match** (68%): `"${givenName} ${surname}".toLowerCase()` on both sides
2. **A4 Excel** (DIGIT.A.4 only): spreadsheet has username + full name for all A4 staff
3. **Phone bridge**: Who-is-Who has (name, phone), AD has (phone, username). For unmatched SYSPER names, find them in WiW by name → get phone → find AD by phone (last 6 digits)

Result: 69% matched overall (39,931 / 58,239).

## DIGIT.A.4 Special Handling

External providers (PREST) are all in SYSPER under `DIGIT.A.4.005`. In reality they belong to teams within sectors 001-004. The A4 Excel spreadsheet (`data/digit_a4_staff.xlsx`) provides:
- Column F: Team name (e.g. "EC-Answer", "ECI")
- Column G: Real sector (e.g. "DIGIT.A4.001" — note: no dot between A and 4)
- Column L: Status (STAT/PREST)

`build_data.cjs` moves PRESTataires from .005 to their real sector, creating team sub-nodes.

## Privacy Model

We only use data fields available in public/semi-public sources (AD, address book, Who-is-Who):
- ✅ Name, job title, org unit, location, email, phone, office, photo
- ❌ Statute, function group, grade, management flag, head of entity, occupation status, job ID

The SYSPER crawler collects all fields (needed for matching) but `build_data.cjs` strips non-public fields before outputting.

## Known Issues

- `funcGroup` in sysper_people.json contains "version: Active" suffix — harmless since we don't expose it
- Some job titles are just city codes (BRU/LUX) when SYSPER has no real title — webapp filters these out
- 32% of people have no AD match (mostly externals not in EC LDAP)
- The `photos/` junction uses an absolute path — won't work if project moves

## File Sizes

- `sysper_people.json`: ~14 MB (58K people)
- `ad_details.csv`: ~5 MB (49K users)
- `photos/`: ~40 MB (21K JPEGs, ~2KB each)
- `ec_directory.json`: ~18 MB (webapp data)
