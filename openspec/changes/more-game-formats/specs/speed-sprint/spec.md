## ADDED Requirements

### Requirement: Timed MCQ sprint from topic banks

The system SHALL generate a timed sprint of N questions sampled from a topic's bank filter, scored by accuracy × speed with the 80% pass convention.

#### Scenario: Solo sprint

- **WHEN** a student starts a sprint on a topic
- **THEN** the system presents N shuffled bank questions under a timer, scores accuracy × speed, and logs the attempt against the topic

#### Scenario: Sprint as ghost entry

- **WHEN** a student submits a sprint inside an open ghost race
- **THEN** the system normalizes the result to accuracy/seconds/difficulty and records it as a race entry
