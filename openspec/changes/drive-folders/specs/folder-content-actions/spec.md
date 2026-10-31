## ADDED Requirements

### Requirement: Save study content to folder
The system SHALL allow saving any quiz, theory, note, PDF, video, audio, course, or group from search/courses/topic views into a user folder as a ref pointer.

#### Scenario: Save from search
- **WHEN** user taps Save on a search hit and picks folder F
- **THEN** system creates a ref node in F with title, href, courseCode and shows confirmation.

#### Scenario: Stale ref badge
- **WHEN** saved source no longer resolves
- **THEN** system still lists the ref with a "source missing" badge and allows delete.

### Requirement: Upload files into folders
The system SHALL allow uploading PDF/video/audio/image via existing `/api/upload` (Cloudinary) from within a folder, creating a file ref node.

#### Scenario: Upload PDF
- **WHEN** user uploads `slides.pdf` in folder F
- **THEN** system uploads to Cloudinary and creates a pdf ref with `url` in F.

### Requirement: Create from folder
The system SHALL provide New actions (folder, upload, link) plus Make-quiz/game shortcuts that deep-link with folder context (courseCode prefilled where known).

#### Scenario: New quiz from folder
- **WHEN** user taps Make quiz in folder containing courseCode C
- **THEN** system navigates to `/courses/<c>/quiz` for that course.
