## Why

The pilot plan is a single hardcoded file (3 courses, invented topics, no semesters/units/outcomes) served to everyone. The real product needs CCMAS-shaped curriculum — discipline → programme → level → semester → course → section → topic → activities — with the 70% core locked and a 30% university layer maintained by trusted per-university officials.

## What Changes

- New collections: `disciplines`, `programmes`, `curriculum_courses` (units, status, LH/PH, semester, core flag, outcomes, sections, topics), `topic_activities` (single home for all topic items, official ladder + university additions, with origin + status).
- Migrate `data/plans/cos-200L.json` into the new schema (COS 200 Level, both semesters where known, real outline topics).
- Users gain `role` (student/official/admin) + `university`. Officials publish directly to their university's layer; every write appends to `curriculum_revisions` (who/what/before/after) for one-tap rollback.
- Write APIs (official-or-admin guarded): upsert course/section/topic/activity, scoped to the official's university (admins: any).
- Read paths (`/api/plans`, home tasks, /task, /plan) switch to the new schema with university overlay (core + own university's approved additions).

## Capabilities

### New Capabilities

- `curriculum-schema`: disciplines/programmes/courses/sections/topics/activities model with core-vs-university origin.
- `topic-activities`: single activity store per topic (learn/watch/drill/play/prove).
- `university-officials`: roles, university scoping, direct-publish writes, revision log + rollback.

### Modified Capabilities

- None (greenfield collections; existing plan/completion behavior preserved, new source behind the same shapes).

## Impact

- Affected: new `src/lib/curriculum.js`, `src/app/api/curriculum/*` routes, seed scripts, `users` (role/university fields), plan/tasks/games read paths.
- No changes to scores, ledger, races, groups, wallet.
- Out of scope: proposal queue for non-officials, full CCMAS coverage beyond pilot, cross-university content sharing.
