## ADDED Requirements

### Requirement: Five-destination bottom tabs

The system SHALL show bottom tabs Home, Curriculum, Groups, Search, Messages on all non-auth routes, with the active tab highlighted from the current path.

#### Scenario: Tab navigation

- **WHEN** a signed-in user opens any non-auth page
- **THEN** the five tabs are visible and the one matching the current section is highlighted

### Requirement: Avatar-opened sidebar

The system SHALL show a top bar with the user's avatar which opens a sidebar containing profile + coins, Games, My Groups, Create, Progress links, Rankings, Settings, and Logout.

#### Scenario: Open sidebar

- **WHEN** the user taps their avatar
- **THEN** a drawer opens with the sections above and closes on backdrop tap or close action

### Requirement: Unified search

The system SHALL provide a search page querying courses, study groups, and games from one box.

#### Scenario: Search

- **WHEN** the user types a query on the search page
- **THEN** matching courses, groups, and games appear grouped with links

### Requirement: Messages inbox

The system SHALL provide a messages inbox listing the user's notifications (nudges, results, announcements) with unread state and mark-read, plus an unread badge on the Messages tab and top-bar bell.

#### Scenario: Unread message

- **WHEN** the user has unread notifications
- **THEN** the Messages tab and bell show the unread count, and opening a message marks it read
