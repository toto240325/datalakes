# EC Datalakes

A searchable webapp showing all European Commission colleagues with their job title, org unit, photo, and contact details — with organigram navigation.

## Installation

```bash
git clone https://github.com/toto240325/datalakes.git
cd datalakes
npm install
```

Prerequisites:
- Node.js (v18+)
- Microsoft Edge with `--remote-debugging-port=9222`
- PowerShell with RSAT (for Active Directory access)
- EC network connectivity (for SYSPER2 and AD)

### Starting Edge with remote debugging

```
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --remote-debugging-port=9222
```

## Data Refresh Cycle

When you want to update the data (e.g. every few weeks), follow these steps in order:

### Step 1: Crawl SYSPER2 (people + org structure)

1. Open SYSPER2 in Edge: https://intracomm.ec.testa.eu/SYSPER2/org/vieworganisationjobs_jd.do
2. Make sure you're authenticated (you should see the org tree)
3. Run:

```bash
node crawl_sysper.js
```

This takes ~30 minutes and produces `data/sysper_people.json` (58K people).
Supports `--resume` if interrupted. Saves after each DG.

### Step 2: Export AD details (email, phone, office)

```powershell
powershell -ExecutionPolicy Bypass -File export_ad_details.ps1
```

Takes ~2 min. Produces `data/ad_details.csv` (49K users).

### Step 3: Extract photos from AD

```powershell
powershell -ExecutionPolicy Bypass -File get_photos.ps1
```

Takes ~5 min. Produces `data/photos/*.jpg` (21K photos).
Skips already-downloaded photos on re-runs.

### Step 4: Build webapp data

```bash
node webapp/build_data.cjs
```

Merges SYSPER + AD + photos + A4 Excel into `webapp/public/ec_directory.json`.

### Step 5: Serve the webapp

```bash
python -m http.server 8087 --bind 0.0.0.0 -d webapp
```

Open http://localhost:8087/index.html (or from any machine on your LAN via your IP).

## Data Sources

| Source | What it gives | Access |
|--------|--------------|--------|
| SYSPER2 (intranet) | Name, job title, org unit, org tree | EC network + EU Login |
| Active Directory (LDAP) | Email, phone, office, photo | EC network + RSAT |
| Who-is-Who (op.europa.eu) | Name, function, phone (used for fallback matching) | EU Login |
| A4 Excel (team file) | Real sector/team assignment for DIGIT.A.4 externals | Manual |

### What we use vs. what we don't

We only expose **publicly available** data (accessible to all EC staff via AD/address book/Who-is-Who):
- Name, job title, org unit, location (BRU/LUX)
- Email, phone, office room, photo

We do NOT expose SYSPER-only fields that may be restricted:
- Statute (FP/CA/CB), function group (AD/AST), management flag, head of entity, occupation status, job ID

### Name matching strategy

SYSPER gives names like "Eric DERRUINE" but AD uses usernames like "derruer". Matching is done by:
1. **Direct name match** (68%): normalized "firstname surname" comparison
2. **A4 Excel username** (for DIGIT.A.4): the team spreadsheet has both full name and username
3. **Phone bridge** (for composed names): Who-is-Who has (name + phone), AD has (phone + username) — we bridge via phone number

## Project Structure

```
crawl_sysper.js          SYSPER2 crawler (main data source)
export_ad_details.ps1    AD export: email, phone, office
get_photos.ps1           AD photo extraction (21K thumbnails)
active_directory.ps1     Original AD export script (reference)
webapp/
  index.html             Single-page app (search + organigram)
  build_data.cjs         Merges all sources into webapp JSON
  public/
    favicon.svg          EU-style favicon
    photos/ → data/photos (junction)
    ec_directory.json    Generated webapp data (gitignored)
data/                    All generated data (gitignored)
  sysper_people.json     58K people from SYSPER2
  ad_details.csv         49K users from AD
  photo_mapping.csv      Username-to-name mapping with photos
  photos/                21K JPEG thumbnails
  digit_a4_staff.xlsx    DIGIT.A.4 team assignments
legacy/                  Old Who-is-Who scrapers (superseded)
```

## Key Learnings

- **SYSPER2 is 12x faster than Who-is-Who** for the same data (28 min vs 4+ hours)
- SYSPER2's `jsTreeData` variable contains the full org tree as JSON in the page source
- In-browser `fetch()` with `credentials: 'include'` reuses the auth session — no page navigation needed
- Python's `http.server` needs `--bind 127.0.0.1` (or `0.0.0.0`) explicitly on Windows
- Windows junctions (`mklink /J`) work without admin rights and resolve for http servers
- AD `Title` field is just "Mr/Ms" — real job titles come from SYSPER2
- The OAB (Outlook Address Book) files are binary `.oab` format — not easily parseable
- `Out-File -Append` in PowerShell is extremely slow for >1K lines — use `WriteAllLines` instead
