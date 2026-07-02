# Catch-Up: Technical Details (v0.2.0)

## What We Have

Two data extraction approaches and a webapp to explore the results.

### SYSPER2 Crawler (primary, fast)

`crawl_sysper.js` connects to an Edge browser (port 9222) that has a SYSPER2 tab open. It:

1. Reads the `jsTreeData` variable from the page (contains all DG ouIds in a nested JSON structure)
2. For each DG, does an in-browser `fetch()` to `/SYSPER2/org/vieworganisationjobs_jd.do?ouId=XXX`
3. Parses the HTML response: extracts job table (name, title, location, statute, funcGroup) and child ouIds from the jstree data
4. Recurses into children until no more sub-units
5. Saves after each DG, supports `--resume`

Performance: 58,239 people in 28 minutes (1,940 fetches). Each fetch takes ~0.5-1s with a 200ms delay between calls.

### Active Directory (supplementary)

`active_directory.ps1` queries the EC's internal LDAP. Gives email, office, phone, and `thumbnailPhoto` (JPEG). The AD `Title` field is only "Mr"/"Ms" (not the job function), which is why SYSPER2 is the primary source.

### Webapp

`webapp/index.html` — a single HTML file with inline JS/CSS. Loads `public/ec_directory.json` (17.5 MB, built by `build_data.cjs`) and provides:
- Fuzzy search on person names
- Org view: parent + current unit + children
- Click to navigate between units
- EU-flag favicon

Served via `python -m http.server 8080 --bind 127.0.0.1` from the `webapp/` folder.

## File Structure

```
crawl_sysper.js        SYSPER2 crawler
active_directory.ps1   AD export + photo extraction
webapp/
  index.html           SPA (search + org navigation)
  build_data.cjs       Merges crawl data into webapp format
  public/
    favicon.svg        EU-style favicon
    ec_directory.json  Generated (gitignored)
data/                  All personal data files (gitignored)
  sysper_people.json   58K people with rich fields
  sysper_people.csv    Same, tab-separated
  sysper_people_2026-07-02.json  Dated backup
legacy/                Old Who-is-Who approach + exploration files
```

## Key Technical Decisions

- **SYSPER2 over Who-is-Who**: 12x faster, richer data, same auth requirement
- **In-browser fetch()**: avoids page navigation, uses existing session cookies
- **waitUntil: 'load'**: the Who-is-Who site's chatbot kept `networkidle2` from resolving
- **DG list from jsTreeData**: the SYSPER2 page embeds the full org tree as a JS variable
- **No server backend**: webapp is pure static HTML + JSON, no build step needed

## Known Issues / Quirks

- `funcGroup` field currently contains version/status appended (e.g. "1: Active") — needs cleanup
- Some duplicate entries exist (same person listed at multiple org levels)
- OIB has 1382 people on a single page (service providers) — parser handles it fine
- Session can expire during long crawls — `--resume` handles this
