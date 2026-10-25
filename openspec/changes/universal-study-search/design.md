## Context

`src/app/search/page.js` filters three small client-side lists (courses via `/api/courses`, groups via `/api/spaces`, static games index). Study content lives in four separate collections — `questions`, `theory_references`, `readings`, `videos` — each only reachable via per-course pages or `/api/topic-content` keyword matching. There is no cross-course text index and no single search entry point for study material.

## Goals / Non-Goals

**Goals:**
- One server endpoint `/api/search` over study content only (quiz/question, theory, note/reading, pdf, video, audio).
- Grouped-section results matching the course-detail / topic-content media language.
- Fast typed search: debounced, cached, paginated, with `type` + `course` filters.
- Useful empty state: recent/popular picks when no query.

**Non-Goals:**
- Community search (posts/groups) — stays on the existing client lists.
- Typo tolerance / full-text ranking tuning — `$text` score order is enough for V1.
- User-to-user DM or notifications search.

## Decisions

- **Single `/api/search` route fanning out to 4 collections in parallel** (`questions`, `theory_references`, `readings`, `videos`), each capped (`limit` default 8 per group, max 25). Alternative: one aggregation per collection behind separate endpoints (rejected — 4 round trips per keystroke, worse mobile UX).
- **Mongo `$text` indexes with regex fallback.** `$text` for indexed prefix/word match ordered by `score`; if index missing or query < 3 chars, fall back to case-insensitive regex on title/question fields. Alternative: regex-only (rejected — full scans on `questions` at scale); Atlas Search (rejected — not available on all tiers).
- **Media-kind grouping server-side.** Videos split into `video` vs `audio` by URL extension (same rule as `topic-content`); readings split into `pdf` vs `text` by `pdfUrl`/`.pdf`. Questions → `quiz`, theory → `theory`. Client renders one grouped section per kind. Alternative: flat mixed feed (rejected — user chose grouped sections, matches course tabs).
- ** stateless GET, no auth required.** Study catalogue is public; personalization stays in `/api/feed/personalized`. Alternative: email-scoped ranking (rejected — adds latency, no signal yet).
- **Index creation via idempotent script** (`scripts/ensure-search-indexes.mjs`, wired as `npm run db:indexes`), called lazily by the route via `createIndex` if missing. Alternative: manual Atlas UI step (rejected — forgotten on fresh envs).

## Risks / Trade-offs

- [Risk] `$text` index build on large `questions` blocks writes → Mitigation: background build, `createIndex` in script not request path hot loop; route catches index-missing and falls back to regex.
- [Risk] Regex fallback scans without index on short queries → Mitigation: require `q.length >= 2`, per-collection `.limit()`, 2s maxTimeMS.
- [Trade-off] `$text` has no typo tolerance — accepted for V1; popular-picks empty state covers discovery.
