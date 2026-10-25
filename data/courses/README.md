# data/courses/

Canonical MCQ dumps — one JSON per course. Committed to git.

Naming: lowercase for most (`chm101.json`), uppercase preserved for legacy
(`COS202.json`, `CSC282.json`, `INS202.json`). Don't rename without updating
the seeders that reference them.

Also present:
- `gss212.json` — canonical GSS 212 bank (copied from workspace `data-raw/`).
- `gss212-dump.json` — debug dump, safe to delete once confirmed stale.

Seeders read from here:
- `scripts/seed-gss212.mjs`, `scripts/seed-cos-csc.mjs`
- `seed-data/seed-all.mjs`, `seed-data/seed-*.mjs`
