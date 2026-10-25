## Why

Search is the front door of this platform, but today it only filters three small client-side lists (courses, groups, games). Study content — quizzes/questions, theory, notes, PDFs, videos, audio — is invisible to search, so users can't find anything they can actually study from the Search tab.

## What Changes

- New server API `GET /api/search?q=&type=&course=&limit=` that searches study content only (no groups/posts): quizzes/questions, theory references, readings/notes, PDFs, videos, audio.
- Mongo text indexes on `questions`, `theory_references`, `readings`, `videos` so search scales past client-side filtering.
- Search page keeps grouped sections (per user choice), extended per type: Quizzes, Theory, Notes, PDFs, Videos, Audio — each section capped, with counts.
- Same presentation language as course detail / topic-content tabs (media-kind grouping: quiz / text / pdf / video / audio).
- Empty query shows recent/popular study picks; typed query hits the server with debounce.

## Capabilities

### New Capabilities

- `study-search`: server-side study-content search API with type + course filters, pagination, and grouped-section UI.

### Modified Capabilities

- None (existing client-side course/group/game filtering stays as fallback; no requirement changes to feed, curriculum, or games).

## Impact

- Affected: new `src/app/api/search/route.js`, Mongo text indexes (via seed/migration script), rewritten `src/app/search/page.js` (grouped sections per media kind, debounced server fetch).
- No changes to scores, ledger, races, groups, wallet, or auth.
- Out of scope: community search (posts/groups), true full-text ranking/typo tolerance, server-side global search across users.
