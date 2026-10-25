## 1. Shared format plumbing

- [x] 1.1 Extend `src/lib/games.js` with sprint sampler, pairs extractor, cloze blanker + scorers
- [x] 1.2 Type the attempts endpoint (`format` field) and add per-format timing floors in `antifarm.js`
- [x] 1.3 Map all three formats into ghost-race entries (accuracy/seconds/difficulty normalization)

## 2. Speed Sprint

- [x] 2.1 Build sprint question sampler API (topic filter, N, shuffle, timer length)
- [x] 2.2 Build `/games/sprint` solo page with timer and accuracy × speed scoring

## 3. Match Pairs

- [x] 3.1 Build pairs derivation (theory Q/A → 6 term↔definition rows, seeded shuffle)
- [x] 3.2 Build `/games/pairs` page with mismatch penalty and replay reshuffle

## 4. Cloze Blanks

- [x] 4.1 Build cloze derivation (keyword blanking, accept list, close-match scorer)
- [x] 4.2 Build `/games/cloze` page with canonical-answer feedback

## 5. Verification

- [ ] 5.1 Attempt-log + mastery evidence check per format; race entry smoke test
- [ ] 5.2 Build passes with no changes to chunk game, settlement, ledger, or streak
