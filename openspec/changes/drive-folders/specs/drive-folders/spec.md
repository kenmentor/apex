## ADDED Requirements

### Requirement: Personal folder hierarchy
The system SHALL provide each user a private folder tree rooted at library root with folders navigable in the same `/folders` window via breadcrumb and `?id=` navigation.

#### Scenario: Open folders root
- **WHEN** user opens `/folders`
- **THEN** system shows root folders + files, breadcrumb `Folders`, and New button.

#### Scenario: Drill into folder
- **WHEN** user taps a folder
- **THEN** system navigates same-window to `?id=<folderId>` showing children + breadcrumb path.

### Requirement: Folder CRUD
The system SHALL allow create, rename, and recursive hard-delete of folders with cycle prevention on move.

#### Scenario: Create folder
- **WHEN** user creates folder "ENT 211" in current folder
- **THEN** system creates a folder node and shows it immediately.

#### Scenario: Rename folder
- **WHEN** owner/editor renames a folder
- **THEN** system updates name everywhere including breadcrumbs.

#### Scenario: Delete folder
- **WHEN** user confirms delete on a folder with contents
- **THEN** system recursively deletes descendants and returns to parent.

### Requirement: Move and copy
The system SHALL allow moving a node to another folder (cycle-safe) and deep-copying files/folders (cap 200 nodes).

#### Scenario: Move file
- **WHEN** user moves a file to another folder they can write
- **THEN** system updates parentId and breadcrumb, source disappears.

#### Scenario: Copy folder
- **WHEN** user copies a folder
- **THEN** system deep-copies descendants as new nodes with " (copy)" suffix on collision.

#### Scenario: Prevent folder into itself
- **WHEN** user tries to move a folder into itself or descendant
- **THEN** system rejects with error and no change occurs.

### Requirement: In-folder search and view modes
The system SHALL support filtering current folder children by name and toggling grid/list views persisted in localStorage.

#### Scenario: Filter children
- **WHEN** user types in folder search
- **THEN** system filters visible folders/files without navigation.

### Requirement: File node operations
The system SHALL allow file/ref nodes to be renamed, moved, copied, deleted, and previewed via stored `href`.

#### Scenario: Open file
- **WHEN** user taps a file ref
- **THEN** system opens stored `href` (course quiz/theory, search target, or file `url`).
