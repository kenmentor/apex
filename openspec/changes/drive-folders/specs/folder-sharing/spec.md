## ADDED Requirements

### Requirement: Share folders with roles
The system SHALL allow folder owners to add members by email as `viewer` or `editor` on any folder; access inherits to descendants.

#### Scenario: Add editor
- **WHEN** owner adds `a@x.com` as editor to folder F
- **THEN** `a@x.com` sees F in Shared section and can create/organize inside F.

#### Scenario: Viewer read-only
- **WHEN** viewer opens shared folder
- **THEN** system shows contents but hides/disable New, rename, move, delete, share controls.

### Requirement: Server-side permission enforcement
The system SHALL enforce viewer/editor on every library write by checking ownership or ancestor membership; unauthenticated requests are rejected.

#### Scenario: Block viewer write
- **WHEN** viewer attempts POST/PATCH/DELETE under shared folder
- **THEN** system returns 403 and makes no change.

#### Scenario: Editor cannot reshare or delete shared root
- **WHEN** editor attempts member add/remove or deleting the shared root
- **THEN** system returns 403.

### Requirement: Shared listing and removal
The system SHALL list shared-with-me roots and allow owner to remove members and members to leave.

#### Scenario: Leave shared folder
- **WHEN** member leaves a shared folder
- **THEN** system removes membership and folder disappears for them.
