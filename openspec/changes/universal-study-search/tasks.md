## 1. Search API + indexes

- [x] 1.1 Add `scripts/ensure-search-indexes.mjs` (idempotent `$text` indexes on questions, theory_references, readings, videos) + `db:indexes` npm script
- [x] 1.2 Build `GET /api/search` (q/type/course/limit, 4-collection parallel fan-out, `$text` with regex fallback, grouped response)
- [x] 1.3 Verify API: typed query, type+course filter, short-query 400, per-group caps

## 2. Search page grouped sections

- [x] 2.1 Rewrite `/search` with debounced server fetch (300ms) via cached helper, keeping course/group/game fallback lists
- [x] 2.2 Render grouped sections (Quizzes, Theory, Notes, PDFs, Videos, Audio) with counts, item cards linking to destinations
- [x] 2.3 Empty state: recent/popular study picks when no query; no-results state per spec

## 3. Verification

- [x] 3.1 Spec scenarios pass (grouped hits, filter narrowing, caps, debounced UI, empty picks); `node --check` changed files; no behavior changes to feed/curriculum/games
