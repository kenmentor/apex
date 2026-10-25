## ADDED Requirements

### Requirement: Fill-the-blank from explanations

The system SHALL derive cloze sentences from explanations with one keyword blanked per sentence, accepting exact and close matches (case/punctuation-insensitive, edit distance ≤ 2).

#### Scenario: Cloze round

- **WHEN** a student plays a cloze round on a topic
- **THEN** the system presents blanked sentences, accepts answers, scores match rate, and logs the attempt against the topic

#### Scenario: Close match accepted

- **WHEN** a student answers with correct letters but wrong case or a one-letter typo
- **THEN** the system counts it correct and shows the canonical answer as feedback
