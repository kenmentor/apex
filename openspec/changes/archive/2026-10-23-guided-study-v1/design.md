## Context

The app today is a solo quiz driller: admin-seeded MCQ JSONs in `data/courses/`, per-course quiz pages, `scores` rows, all-time `leaderboard` aggregation, vanity `points`/`streak` on users, and `spaces` as an async forum. The V1 vision adds a guided loop (plan → complete → earn → play together) without breaking any of those APIs. Pilot cohort defaults to COS 200 Level; all cohort-specific content lives in data/seeders so other departments can follow the same pattern.

## Goals / Non-Goals

**Goals:**
- One pilot semester plan (courses → CCMAS topics → daily items) with a completion-gated streak and mastery bar.
- One game format (chunk reassembly) playable solo and as async ghost races with a documented ranking matrix.
- Closed-loop coin ledger (append-only transactions, locked vs withdrawable flags, in-app only, no cash-out).
- Best-fit group suggestions as a non-gating rail plus mutual progress visibility.
- All new state in new collections; existing quiz/score/leaderboard behavior unchanged.

**Non-Goals:**
- Live video/voice media, WebRTC/SFU infra, recording/consent pipelines.
- Cash-out, KYC, real-money rails.
- Full CCMAS coverage, 10+ game formats, automated creator payouts.
- Changes to existing scoring trust model beyond documenting limits.

## Decisions

- **Topics as the unit of planning.** Course → topic → items (learn/drill/prove). Alternatives: course-level only (too coarse for games/mastery) or LO-level (too fine to author for V1). Topics map 1:1 to game sessions and mastery rows.
- **Ghost races as default multiplayer.** Same seed, async participation, ranked by accuracy × speed × difficulty. Alternative: synchronous live rooms with world-pause (chosen only as opt-in scheduled mode) — rejected as default because mobile-network fragility makes hostage states the norm.
- **Pause-with-mercy-limit for live rooms.** 60s pause on disconnect, then bot-takeover or majority-vote continue; stake escrow rules shown pre-entry. Alternative: COD-harsh forfeit everywhere (cheaper, angrier) or infinite pause (hostage). Mercy limit balances trust vs liveness.
- **Append-only `transactions` ledger, dual flags.** Every coin movement is a row `{type, from, to, amount, locked/withdrawable, reason}`; user balances are derived, never incremented blindly. Alternative: `users.coins += n` (rejected — unauditable, unfarmable-proof).
- **Creator fund V1 = platform-minted bootstrap + manual monthly payout.** Reward = completions × difficulty × mastery-lift with decay; computed offline, paid by script. Alternative: automated on-chain-style payouts (rejected — needs pool income first) or per-unlock marketplace pricing (rejected per user direction: free by default).
- **Fit as rules-weighted score, suggestion-only.** Hard filter same dept/level/semester; soft score pace 40 / rhythm 20 / intent 15 / availability 15 / size 10; bands not ranks; silent leave. Alternative: ML matching (rejected — no data yet) or hard assignment (rejected — kills agency).
- **Mastery default 80% per topic, trend shown alongside level.** Effort (streak/items) displayed next to mastery so strugglers retain a moving number.

## Risks / Trade-offs

- [Risk] Staked ghost races farmed by alt accounts → Mitigation: stake caps in V1, completion-gated entry (must finish plan item to enter staked), server-side timing sanity checks, manual review of outlier win rates.
- [Risk] Creator fund gaming (easy banks farmed for completions) → Mitigation: difficulty weighting + mastery-lift signal + decay; manual payout lets humans veto obvious farms.
- [Risk] Pause griefing in live rooms (reconnect-loop hostage) → Mitigation: per-player pause budget per session, auto bot-takeover after 60s, host/vote continue.
- [Risk] Coin overhang (no expiry + generous faucets → whale balances, meaningless prices) → Mitigation: real sinks in V1 (staked entry is zero-sum, live seats are scarce, tips); monitor supply and tune faucet rates before adding sinks.
- [Risk] Streak rule change alienates existing users (visit counted before) → Mitigation: UI copy explains completion-gating; grandfather old streak display with "new rules" marker.
- [Trade-off] Ghost races sacrifice live trash-talk energy for robustness — accepted; scheduled live rooms remain for small-group hype.
- [Trade-off] Manual creator payouts don't scale — accepted for V1; automation is a later change once pool income exists.
