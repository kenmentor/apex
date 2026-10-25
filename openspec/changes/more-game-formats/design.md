## Context

V1 shipped one game (chunk reassembly) on shared rails: `game_attempts` log, ghost-race ranking matrix (accuracy × speed × difficulty), anti-farm guards, and completion-gated mastery. Content sources exist: per-topic MCQ banks (`data/courses/`) and theory text (`seed-data/*-theory.json`). This change adds three formats that reuse all of it.

## Goals / Non-Goals

**Goals:**
- Three playable formats (sprint, pairs, cloze) solo + ghost-compatible, on the existing attempt/race/ledger rails.
- Rule-based generation from existing banks and theory text — no new content pipeline.
- Format-specific scoring with the same 80% pass convention.

**Non-Goals:**
- User-authored custom games or a game SDK.
- Live synchronous variants of the new formats.
- New currencies, payouts, or race settlement changes.

## Decisions

- **Sprint pulls from banks, not generated.** MCQs are hand-quality; generating questions risks junk. Sprint = sample N per topic filter, shuffle, timed. Alternative: LLM-generated sprints (rejected — quality + cost).
- **Pairs derive from theory glossary lines.** Term↔definition rows extracted from theory Q/A and bank stems (`question → first 12 words of explanation` as fallback). 6 pairs per round. Mistake penalty (−5s or −points) to kill random-tap farming. Alternative: pairs from user highlights (rejected — no highlight data yet).
- **Cloze derives from explanations via keyword blanking.** Blank content words (not stopwords), accept exact + close matches (case/punctuation-insensitive, edit distance ≤ 2). Alternative: strict exact match (rejected — punishes typos, not ignorance).
- **One attempts endpoint, typed.** `POST /api/games/attempts` gains `format: chunk|sprint|pairs|cloze` with per-format payload; timing floors per format in `antifarm.js`. Alternative: endpoint per format (rejected — duplicates auth/guard logic).
- **Ghost races stay format-agnostic.** Entries already carry `accuracy/seconds/difficulty`; sprint maps naturally, pairs/cloze normalize to 0–100 accuracy. No settlement changes.

## Risks / Trade-offs

- [Risk] Cloze blanking produces ambiguous blanks (multiple valid answers) → Mitigation: blank only sentences with a single theory keyword, cap 1 blank per sentence, accept list.
- [Risk] Pairs memorized by position across replays → Mitigation: seeded shuffle per attempt, reshuffle pairs each round.
- [Risk] Sprint farming via easy topics → Mitigation: existing stake caps + completion gating + per-format minimum seconds scale with item count.
- [Trade-off] Rule-based generation caps variety vs a full editor — accepted; editor is a later change once formats prove out.
