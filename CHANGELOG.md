# Changelog

## 0.4.0

- Fixed cross-DG name collisions: AD matching now validates department alignment (717 potential collisions avoided)
- Improved A4 PREST relocation: fuzzy name matching handles variants (Steve/Stephen, HTML entities, composed surnames, middle names)
- All 140 DIGIT.A.4 service providers now correctly relocated to their real sectors/teams
- Search dropdown now displays names as "SURNAME Firstname" for clarity
- Search supports multi-word queries in any order (e.g. "romeo david")
- Enter key selects first search result
- Removed photos from git tracking (now served via junction, gitignored)

## 0.3.0

- Added AD details enrichment (email, phone, office) via `export_ad_details.ps1`
- Added photo integration: thumbnails in org view, larger photo in hover tooltip
- Added three-tier name matching: direct name → A4 Excel username → phone bridge (69% match rate)
- Added DIGIT.A.4 team relocation: PREST moved from .005 to real sectors/teams
- Added "(EXT)" badge for external providers
- Added hover tooltip with photo + email/phone/office
- Added data freshness date in webapp header
- Added Enter key to select first search result
- Stripped non-public SYSPER fields (statute, funcGroup, management, etc.)
- Changed server to port 8087, bound to 0.0.0.0 for LAN access
- Updated README with full installation and data refresh instructions
- Updated catch-up.md with all technical details and learnings

## 0.2.0

- Added SYSPER2 fast crawler (`crawl_sysper.js`): 58K people in 28 min with rich data (statute, function group, location, management flag)
- Added AD photo extraction script (`active_directory.ps1`)
- Built webapp with search and org navigation (`webapp/`)
- Added EU favicon to webapp
- Restored name-left / job-title-right layout in webapp
- Reorganized project: legacy Who-is-Who scripts moved to `legacy/`, data files to `data/`
- Updated `.gitignore` to exclude personal data and legacy artifacts
- Added release process steering (semantic versioning)
- Added `build_data.cjs` to generate webapp data from SYSPER2 output

## 0.1.0

- Initial Who-is-Who organigram crawler (`crawl_full_organigram.js`)
- Initial Who-is-Who people crawler (`crawl_people.js`)
- Active Directory export script (`active_directory.ps1`)
- Basic project structure with README and catch-up docs
