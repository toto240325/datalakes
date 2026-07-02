---
inclusion: always
---

# Release Process

This project uses semantic versioning. Do NOT make ad-hoc git commits. Every commit must be a proper versioned release.

## Before ANY git commit, follow this checklist:

1. **Update CHANGELOG.md** — Add a new `## X.Y.Z` section at the top with bullet points for every change in this release.

2. **Update documentation if needed**:
   - `README.md` — project description, data sources, scripts, status
   - `catch-up.md` — technical decisions, file structure, what was done

3. **Bump the version** in two places:
   - `VERSION` file
   - `package.json` → `"version"`

4. **Git commit** with message format: `"v{X.Y.Z}: short description of all changes"`

## Version numbering

- **Patch** (0.1.1): bug fixes only, no new features
- **Minor** (0.2.0): new features, new crawlers, UI improvements, reorganization
- **Major** (1.0.0): production-ready release, major architecture changes

## Do NOT

- Make multiple small commits without version bumps
- Commit with messages like "fix: ..." or "feat: ..." without a version number
- Forget to update CHANGELOG.md
- Leave the version out of sync between VERSION and package.json
- Commit personal data files (ec_people.json, sysper_people.json, photos, etc.)
- Use `git commit --amend` on pushed commits — always make a new commit instead.
