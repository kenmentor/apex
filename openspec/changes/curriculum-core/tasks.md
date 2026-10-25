## 1. Schema + migration

- [x] 1.1 Add `src/lib/curriculum.js` (normalizers, overlay merge, mastery helpers on new shape)
- [x] 1.2 `scripts/seed-ccmas-normalized.mjs` — idempotent, MONGODB_URI-driven, production-ready (`npm run seed:ccmas`)
- [x] 1.3 Seed verified: 7 programmes, 120 course-links, 120 sections, 1635 topics; shared atoms carry multi-programme links

## 4. Cross-validation (data integrity)

- [x] 4.1 `scripts/verify-ccmas.mjs` — every table row vs DB (meta, outcomes, topic text/order, ladder coverage, orphans, dupes)
- [x] 4.2 Full pass clean: 120 course-links, 120 sections, 1635 topics, 0 issues

## 2. Officials + revisions

- [x] 2.1 Add `role` + `university` to users; guard helper (official-of-university or admin)
- [x] 2.2 Write APIs for course/section/topic/activity (guarded, origin-tagged)
- [x] 2.3 `curriculum_revisions` log on every write + rollback endpoint

## 3. Read-path cutover

- [x] 3.1 `/api/plans` serves new schema with university overlay (legacy fallback intact)
- [ ] 3.2 Home tasks, /task, /plan verified against new shape on device
