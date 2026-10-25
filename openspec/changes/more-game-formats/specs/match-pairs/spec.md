## ADDED Requirements

### Requirement: Term-definition pair matching

The system SHALL present 6 shuffled term↔definition pairs per round derived from theory content, scored by pairs cleared per time with a mistake penalty.

#### Scenario: Matching round

- **WHEN** a student plays a pairs round on a topic
- **THEN** the system shows shuffled terms and definitions, accepts pair selections, penalizes mismatches, and logs accuracy and time against the topic

#### Scenario: Reshuffle on replay

- **WHEN** a student replays the same pairs round
- **THEN** the system presents a newly seeded shuffle so positions cannot be memorized
