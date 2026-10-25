## ADDED Requirements

### Requirement: Pilot semester plan exists for one cohort

The system SHALL provide a semester plan for the pilot cohort (default COS 200 Level) mapping courses to CCMAS topics, each topic to sequenced items (learn, drill, prove), with a per-topic mastery bar (default 80%).

#### Scenario: Student opens their semester plan

- **WHEN** a pilot-cohort student opens the plan view
- **THEN** the system shows their courses, topics per course, item sequence, and per-topic mastery progress

#### Scenario: Non-pilot student

- **WHEN** a student outside the pilot cohort opens the plan view
- **THEN** the system shows plan unavailable with a waitlist option rather than partial data

### Requirement: Daily item completion is tracked

The system SHALL record per-topic item completion with score and timestamp, and derive topic mastery from the prove-item results.

#### Scenario: Completing the day's item

- **WHEN** a student completes the scheduled item at or above the mastery bar
- **THEN** the system marks the item complete, updates topic mastery, and counts the day toward streak/coin eligibility

#### Scenario: Below-bar attempt

- **WHEN** a student attempts the item below the mastery bar
- **THEN** the system records the attempt, shows remedial items, and does NOT count the day toward streak/coin eligibility

### Requirement: Completion-gated streak

The system SHALL count streak days only on days with at least one at-or-above-bar item completion.

#### Scenario: Visit without completion

- **WHEN** a student opens the app but completes no plan item that day
- **THEN** the system MUST NOT increment or extend the streak for that day
