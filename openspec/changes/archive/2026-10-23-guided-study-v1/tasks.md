## 1. Semester plan foundation

- [x] 1.1 Author CCMAS topic map for pilot cohort (COS 200L, 2–3 courses) with items per topic
- [x] 1.2 Add plan/topic/completion collections, seeders, and plan read APIs
- [x] 1.3 Build plan view (courses → topics → items, mastery bars) and remedial branching
- [x] 1.4 Switch streak to completion-gating with UI copy and grandfathered display

## 2. Games and races

- [x] 2.1 Implement chunk-reassembly game (authoring shape, solo play, scoring, attempt log)
- [x] 2.2 Implement ghost-race sessions (same seed, async entry, accuracy × speed × difficulty ranking)
- [x] 2.3 Add scheduled live-room race with 60s pause, bot-takeover/vote continue, escrow copy
- [x] 2.4 Add anti-farm guards (entry gating, timing sanity checks, stake caps, outlier review)

## 3. Coin ledger and fund

- [x] 3.1 Implement append-only transactions ledger with locked/withdrawable flags and derived balances
- [x] 3.2 Wire faucets (welcome 30, completion gifts, race winnings) and sinks (unlocks, stakes, seats, tips)
- [x] 3.3 Implement V1 creator-fund scoring (completions × difficulty × mastery lift + decay) with manual payout script
- [x] 3.4 Disable withdrawals in V1 with clear messaging; keep flags for future

## 4. Study groups fit

- [x] 4.1 Extend group model (intent, availability, size) and onboarding chips
- [x] 4.2 Implement fit scoring rail (hard mountain filter + weighted bands) with browse-always
- [x] 4.3 Build mutual progress room view (mastery, streak, weekly trend) with silent leave
- [x] 4.4 Add nudge (free) now; tip-a-coin sink behind ledger

## 5. Verification

- [x] 5.1 Seed pilot data end-to-end and walk plan → complete → earn → race → group
- [x] 5.2 Verify existing quiz/leaderboard/streak APIs unchanged; build passes
