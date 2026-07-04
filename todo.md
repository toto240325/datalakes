# TODO

## Next up
- [ ] Build standalone single-file HTML version (~20 MB, no server needed, no photos)
- [ ] Node.js server with "Update Data" button (replaces python http.server)
  - Serves static files + `/api/update` endpoint
  - Checks Edge:9222 availability + EU Login/SYSPER session
  - Navigates to organigram page via puppeteer if needed
  - Runs full pipeline: SYSPER crawl → AD export → photos → build_data
  - Streams progress to client via SSE (Server-Sent Events)
  - Shows errors if prereqs not met ("Edge not listening" / "Not logged in")

## Later
- [ ] Summary of organigram that can be pasted in mynotes3
- [ ] Investigate any useful skills, steering, MCP, or hooks to add

## Done (v0.4.0)
- [x] Cross-DG name collision fix (AD dept vs SYSPER DG validation)
- [x] Surname-first search
- [x] A4 PREST relocation with fuzzy matching
- [x] Remove photos from git tracking
