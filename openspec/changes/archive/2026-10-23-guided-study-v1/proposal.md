## Why

The quiz app proves students will drill questions, but it offers no guided path from "enrolled" to "exam-ready", no multiplayer reason to return, and no economy to reward creators. This change introduces one thin vertical slice — a CCMAS-grounded semester plan with daily items, one user-playable game format plus ghost races, a closed-loop coin ledger, and best-fit study groups — so the core loop (plan → complete → earn → play together) can be validated before scaling to more departments, live media, or cash-out.

## What Changes

- Semester plan for one pilot cohort (default: COS 200 Level): courses → CCMAS topics → sequenced daily items (learn / drill / prove) with a per-topic mastery bar (default 80%).
- Completion-gated streak: streaks and coin gifts accrue only on days the plan item is completed at/above the bar, not on visits.
- One user-authored game format (reassemble chunked definitions/explanations) playable solo; same content playable as async ghost races over a subject set with accuracy × speed × difficulty ranking.
- Pause-with-limit for live rooms; ghost racing as the default robust mode on unstable networks.
- Closed-loop coin ledger: welcome 30 (locked, spend-only, never withdrawable); earn via day completion, race winnings, creator-fund payouts; spend on premium unlocks, staked entry, live-class seats, tips. No expiry, stackable, in-app only — no cash-out in V1.
- Creator fund (V1: platform-minted bootstrap pool, manual monthly payout): rewards free-by-default content based on completions × difficulty × mastery lift, with decay. No creator-set prices in V1.
- Study groups: same-department/level hard filter, best-fit suggestion rail (pace 40 / rhythm 20 / intent 15 / availability 15 / size 10), manual browse always available; mutual tracking shows mastery % + streak + weekly trend; silent leave.

## Capabilities

### New Capabilities

- `semester-plan`: CCMAS course→topic mapping for pilot cohort, daily items, mastery bar, completion state.
- `study-games-v1`: chunk-reassembly game definition + solo play + ghost-race sessions + ranking matrix.
- `coin-ledger`: dual-balance ledger (spendable everywhere; withdrawable tracked but disabled in V1), faucets, sinks, transaction log.
- `study-groups-fit`: group model, fit scoring, suggestion rail, mutual progress visibility, nudges.

### Modified Capabilities

- None (no existing specs; greenfield contract).

## Impact

- Affected: `src/app` (new plan/groups/game/race routes + pages), `src/lib` (plan, fit scoring, ledger helpers), MongoDB (new collections: plans, topics, game sessions, transactions, groups; extended users/scores), `data/courses` + `seed-data` (topic-level content), `scripts` (seeders for topics/pools).
- No breaking changes to existing quiz/leaderboard/streak APIs; streak meaning tightens (completion-gated) — surfaced in UI copy.
- Out of scope for V1: live video/voice media servers, cash-out/KYC, full CCMAS coverage, 10+ game formats, automated creator payouts.
