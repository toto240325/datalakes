# Catch-Up: Technical Details

This document captures the technical context so we can resume quickly if we lose conversation history.

## What We Built

Two Puppeteer-based crawlers that connect to a locally running Edge browser (via remote debugging port 9222) to scrape the EU "Who is Who" directory at `op.europa.eu`. The site requires EU Login authentication, so we piggyback on an already-authenticated Edge session.

## Architecture

```
Edge (port 9222, authenticated) ←── puppeteer-core ←── crawl_people.js
                                                         │
                                                         ├── reads ec_organigram_dgs.json (DG list)
                                                         ├── recursively visits each org page
                                                         ├── extracts people + function titles
                                                         └── outputs ec_people.json + ec_people.csv
```

## Key Technical Decisions

### Why `waitUntil: 'load'` + fixed delay?
The Who-is-Who site has a chatbot widget that keeps network connections alive indefinitely. Using `networkidle2` caused infinite hangs. Using `load` + 2.5s delay works reliably — the page content is server-rendered, so it's available shortly after load.

### Why load DGs from file instead of crawling COM page?
The top-level COM page was unreliable to scrape during the crawl (timing issues with session reuse). Loading the DG list from `ec_organigram_dgs.json` eliminates that fragility. This file was crawled separately and is stable.

### Why reuse an existing Edge tab?
Opening a new tab sometimes hits the EU Login SSO redirect chain, which can stall. Reusing a tab that's already on a who-is-who page guarantees the cookies/session are active for that context.

### Page structure (innerText parsing)
Each org page lists people in this format:
```
Mr Carl-Christian BUHR
Director

+32-229-68599
Ms Ana POPESCU
Assistant to the Director - Policy coordinator

+32-229-58032
```

The parser regex-matches `^(Mr|Ms)\s+(.+)$` then looks at the next non-empty line for the function title, and optionally the phone number after that.

Sub-level links appear as `[CODE] Name` with href attributes pointing to child org pages.

## What Was Tested

- `crawl_people.js --dg DIGIT`: Successfully extracted 2808 people across 148 pages in ~21 minutes.
- Function titles correctly captured (e.g. "IT Security Officer - Security Monitoring Architect", "Legal and Policy Officer", "Head of sector")
- Retry logic works (one retry observed during the DIGIT crawl, recovered fine)
- Output saved as both JSON and tab-separated CSV

## What Remains

1. **Full Commission crawl**: Run `node crawl_people.js` to crawl all 49 DGs. Estimated 2-4 hours. Use `--resume` if interrupted.
2. **Data quality checks**: Some entries may have empty function fields (e.g. when a person appears as just a name on a sublevel page without details). Worth filtering/reviewing.
3. **Deduplication**: Some people may appear on multiple pages (e.g. a Director listed on both their directorate page and a sublevel). Consider dedup by name+phone.

## Active Directory Alternative

The `active_directory.ps1` script dumps the EC AD to CSV. It was investigated early on but the AD `Title` field only contains "Mr"/"Ms"/"M." — not the actual job function. That's why we went with the Who-is-Who crawler.

However, AD is useful for:
- Getting the full email addresses
- Getting office locations
- Distinguishing staff (STAT) from contractors (PREST)
- Cross-referencing with the Who-is-Who data

## File Inventory

| File | Purpose |
|------|---------|
| `crawl_people.js` | Main people crawler (production) |
| `crawl_full_organigram.js` | Org structure crawler |
| `ec_organigram_dgs.json` | Pre-crawled list of 49 DGs with URLs |
| `ec_people.json` | Output: 2808 DIGIT people with functions |
| `ec_people.csv` | Same as above, tab-separated |
| `digit_full.json` | DIGIT org tree (from organigram crawler) |
| `digit_organigram_complete.json` | DIGIT structure with unit URLs |
| `active_directory.ps1` | PowerShell AD export script |
| Various `.txt`/`.json` files | Exploration artifacts from earlier sessions |
