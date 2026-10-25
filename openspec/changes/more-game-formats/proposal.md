## Why

Chunk-reassembly alone can't carry replayability: students habituate to one mechanic within days, and different topics suit different recall modes (recognition vs production vs association). Adding three formats that reuse the existing banks and race engine multiplies variety without multiplying content costs.

## What Changes

- Speed Sprint: timed MCQ run drawn from existing per-topic banks; scored by accuracy × speed; playable solo and as ghost-race entries.
- Match Pairs: term↔definition memory matching generated from theory content and question stems; scored by pairs cleared per time with mistake penalty.
- Cloze Blanks: fill-the-blank sentences auto-derived from explanations/definitions (reusing the chunking pipeline); scored by exact/close match rate.
- All three formats log attempts to `game_attempts`, count toward topic mastery evidence, and plug into the existing ghost-race ranking matrix and anti-farm guards.
- Authoring stays rule-based (no free-form editor): sprints pull from banks by topic filter, pairs/cloze derive from theory text.

## Capabilities

### New Capabilities

- `speed-sprint`: timed MCQ sprint generation from topic banks, scoring, solo play, race entry.
- `match-pairs`: term↔definition pair generation, matching play, mistake-penalty scoring.
- `cloze-blanks`: blank-derivation from explanations, fill-in play, close-match scoring.

### Modified Capabilities

- None (existing `study-games-v1` behavior unchanged; new formats extend the same attempt/race/ledger rails).

## Impact

- Affected: `src/lib/games.js` (new generators/scorers), `src/app/api/games/attempts` (new attempt types), `src/app/api/races` (format-aware entries), new pages under `src/app/games/`, `seed-data` (theory text is the pair/cloze source).
- No breaking changes to chunk game, race settling, ledger, or streak gating; anti-farm timing checks apply per format with format-specific minimums.
- Out of scope: user-built custom games, multiplayer-synced (live) variants of the new formats — ghosts only in this change.
