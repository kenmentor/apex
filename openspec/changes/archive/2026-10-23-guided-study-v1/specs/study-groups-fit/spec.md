## ADDED Requirements

### Requirement: Same-mountain hard filter for suggestions

The system SHALL only suggest groups sharing department, level, and semester-plan overlap with the student.

#### Scenario: Suggestion candidate

- **WHEN** the system computes suggestions for a student
- **THEN** groups without shared department/level/semester overlap MUST be excluded

### Requirement: Best-fit rail is suggestion-only

The system SHALL rank eligible groups by pace (40) / rhythm (20) / intent (15) / availability (15) / size-fit (10) bands and present the top suggestions without gating manual browse or join.

#### Scenario: Browsing vs suggested

- **WHEN** a student browses all groups
- **THEN** the system shows every joinable group with fit bands labeled, keeping suggestions as a rail

### Requirement: Mutual progress is visible to members

The system SHALL show group members each other's mastery %, streak, and weekly trend for shared courses.

#### Scenario: Room view

- **WHEN** a member opens their group room
- **THEN** the system shows per-member mastery, streak, and trend, including improving-but-low members with trend highlighted

### Requirement: Leaving is silent and instant

The system SHALL allow one-tap leave with no shaming message posted to the room.

#### Scenario: Leave

- **WHEN** a member leaves a group
- **THEN** the system removes them immediately and posts no departure message
