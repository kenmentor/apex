## ADDED Requirements

### Requirement: Fewer sequential round trips

The system SHALL fetch independent data in parallel batches and reuse in-flight/cached responses (TTL) so repeat visits and tab switches avoid refetching.

#### Scenario: Course page load

- **WHEN** a student opens a course page
- **THEN** courses, videos, and readings are requested concurrently, not sequentially

#### Scenario: Shell navigation

- **WHEN** the user navigates between tabs within 60 seconds
- **THEN** notifications and wallet are served from cache without new requests

### Requirement: Non-blocking first paint

The system SHALL load fonts with `display=swap` + preconnect and SHALL NOT wrap `window.fetch` globally.

#### Scenario: Cold load

- **WHEN** the app loads on a slow connection
- **THEN** text renders in fallback fonts immediately and swaps when webfonts arrive, and fetch calls carry no wrapper overhead

### Requirement: Bounded heavy queries

The system SHALL bound leaderboard aggregation with a `limit` (default 100) and SHALL fetch the feed challenge question via `$sample` instead of `count + skip`.

#### Scenario: Leaderboard load

- **WHEN** the leaderboard is requested without a limit
- **THEN** at most 100 ranked entries are computed and returned
