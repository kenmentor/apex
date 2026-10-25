## ADDED Requirements

### Requirement: CCMAS-shaped curriculum model

The system SHALL store curriculum as discipline → programme → level → semester → course (units, status, LH/PH, semester, core flag, outcomes) → sections → topics.

#### Scenario: Pilot programme loads

- **WHEN** a COS 200 Level plan is requested
- **THEN** courses carry units, status, semester, core flag, outcomes, and outline-derived sections/topics

### Requirement: Topic activities as single store

The system SHALL store every topic item (learn/watch/drill/play/prove) in `topic_activities` with courseCode, topicId, kind, title, payload, origin (`core` or `university:CODE`), and status.

#### Scenario: Topic with mixed origins

- **WHEN** a topic has core items plus approved university additions
- **THEN** the topic returns both, core first, each labeled by origin

### Requirement: Trusted officials publish directly

The system SHALL allow users with role `official` to write curriculum for their own university only (admins: any), with every write appended to `curriculum_revisions` including the before-state.

#### Scenario: Official adds a reading

- **WHEN** an official of UNILAG adds a reading to a topic
- **THEN** it goes live tagged `university:UNILAG` and a revision entry records who/when/before

#### Scenario: Out-of-scope write blocked

- **WHEN** an official of UNILAG writes to another university's layer or the locked core
- **THEN** the system rejects with 403 (core edits are platform-only)
