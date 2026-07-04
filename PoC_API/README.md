# PoC: OP Portal Search API (Who-is-Who)

## Summary

This API is the **Publications Office Portal Search System** (PSS). It provides access to multiple EU data collections including the "Who-is-Who" (WIW) directory.

**Conclusion: NOT useful as primary data source for our project.**

The API only returns **management-level** persons (Head of Unit and above). It contains ~1,512 persons for the Commission, vs. the ~58,000 we get from SYSPER. Regular staff members are not indexed.

## What it provides

For each person (management only):
- Full name, given/family name, gender
- Title/position (in 24 languages)
- Email, phone, office address
- Organisation hierarchy (full path with multilingual names)
- Organisation mnemonic (e.g. DIGIT.A.4)
- Photo URL (from publications.europa.eu)
- vCard data

For organisations:
- Full hierarchy with multilingual names
- Contact point, address, homepage
- Representative person (DG head)
- Classification (DG, Unit, etc.)
- Mnemonic codes

## Potential secondary uses

1. **Org hierarchy with official multilingual names** — could enrich our organigram with proper translated entity names
2. **Management contact details** — already available via SYSPER+AD, so not much added value
3. **Organisation metadata** — addresses, homepages, depictions for each DG

## Access details

- URL: `https://acceptance.op.europa.eu/api/search/1.0/wiw/simple_json`
- Auth: Basic (credentials in creds.txt)
- Works through corporate proxy (no `--noproxy` needed on VPN)
- Max 50 results per page, max 20 pages (= 1000 results max per query)

## Tested on 2026-07-03

| Query | Results | Level |
|-------|---------|-------|
| "gaffey" (DG DIGIT) | 1 | Director-General |
| "derruine" (DIGIT.A.4) | 1 | Head of Unit |
| "romeo" (DIGIT.A.4 staff) | 0 | Regular staff — NOT in API |
| "head of unit" (COM) | 1512 | All management |

## Files

- `creds.txt` — API credentials (DO NOT commit to git)
- `Search.postman_collection.json` — Postman collection with all endpoints
- `20260306_OPPortal_SystemSpecifications-v.9.2.4_APIDocumentation (1).html` — Full API docs
- `test_wiw_api.js` — Node.js test script (needs proxy fix for VPN)
