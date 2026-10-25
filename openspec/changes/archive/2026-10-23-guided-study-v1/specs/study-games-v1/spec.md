## ADDED Requirements

### Requirement: Chunk-reassembly game is playable solo

The system SHALL offer a chunk-reassembly game where a definition/explanation is split into shuffled chunks the student reorders, scored by correctness with item-level feedback.

#### Scenario: Solo play

- **WHEN** a student starts the game on a topic
- **THEN** the system presents shuffled chunks, accepts an ordering, scores it, and records the attempt against the topic

### Requirement: Ghost races rank async participants

The system SHALL support async ghost races over a subject/topic set where participants play the same seed at different times and are ranked by accuracy × speed × difficulty.

#### Scenario: Ghost race ranking

- **WHEN** a ghost race closes with two or more finishers
- **THEN** the system ranks finishers by the published matrix (accuracy primary, speed and difficulty weighted) and records results

### Requirement: Live rooms use pause-with-limit

The system SHALL pause a scheduled live race up to 60 seconds on a participant disconnect, then continue via bot-takeover or majority vote, with stake-escrow rules shown before entry.

#### Scenario: Disconnect in a live race

- **WHEN** a participant disconnects mid-race
- **THEN** the system pauses up to 60 seconds, then resumes without them, applying the pre-shown forfeit/escrow rule
