## ADDED Requirements

### Requirement: Study-content search API

The system SHALL expose `GET /api/search` that searches study content only (questions, theory references, readings/notes, videos/audio) and returns results grouped by media kind.

#### Scenario: Typed query returns grouped study hits

- **WHEN** a client calls `GET /api/search?q=photosynthesis`
- **THEN** the response contains `groups` with some of `quiz`, `theory`, `notes`, `pdf`, `video`, `audio`, each an array of items with `id`, `title`, `subtitle`, `href`, and `courseCode`, ordered by relevance.

#### Scenario: Short query is rejected cheaply

- **WHEN** a client calls `GET /api/search?q=a`
- **THEN** the system returns HTTP 400 with an error and performs no collection scans.

### Requirement: Type and course filters

The system SHALL support `type` (quiz, theory, notes, pdf, video, audio) and `course` (course code) query params that narrow results without changing response shape.

#### Scenario: Filter to videos of one course

- **WHEN** a client calls `GET /api/search?q=mitosis&type=video&course=COS+202`
- **THEN** only video-kind items from COS 202 are returned in `groups.video`, and other groups are empty arrays.

### Requirement: Paginated per-group limits

The system SHALL cap each group at `limit` items (default 8, max 25) and include per-group `total` counts where cheap to compute.

#### Scenario: Default caps apply

- **WHEN** a client calls `GET /api/search?q=cell` with no limit
- **THEN** no group array exceeds 8 items.

### Requirement: Grouped search UI sections

The system SHALL render the Search tab as grouped sections (Quizzes, Theory, Notes, PDFs, Videos, Audio) reusing the course-detail media language, with debounced server fetch and a useful empty state.

#### Scenario: Typing shows grouped sections

- **WHEN** a user types "java" in the Search tab
- **THEN** within 1s the page shows one section per non-empty group, each item linking to its quiz/theory/note/video destination.

#### Scenario: Empty query shows discovery picks

- **WHEN** a user opens the Search tab with no query
- **THEN** the page shows recent/popular study picks instead of an empty list.
