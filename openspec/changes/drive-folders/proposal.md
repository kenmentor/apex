## Why

Bottom-tab Folders is currently a virtual browser (type links + course list). Users need a real Drive-style file system where any study content — quizzes, theory, notes, PDFs, videos, audio, courses, groups, uploads — can be organized in their own folders, shared with editors/viewers, and used to create games/quizzes.

## What Changes

- Personal library rooted at `/folders`: browse folders + files in same window (breadcrumb, grid/list, search within folder).
- Folder CRUD: create, rename, delete (recursive), move, copy (deep copy for folders).
- File ops: add any study content to a folder (from search/courses/topic), upload PDF/video/audio/image (Cloudinary via existing `/api/upload`), create link/file placeholders, rename, move, copy, delete, preview via existing `href`.
- Sharing V1: owner can add members by email as `viewer` or `editor`; editors can add/organize, viewers read-only. Private by default.
- Creation entry: from a folder, create quiz/game sessions, upload material, add from search — folder becomes the workspace.
- Tab integration: `NavBar` Folders tab stays `/folders`; `TopBar` Mail icon stays messages entry point.

## Capabilities

### New Capabilities

- `drive-folders`: folder/file node model, hierarchy, CRUD + move/copy/delete, breadcrumbs, search, sharing roles.
- `folder-sharing`: member add/remove, viewer/editor enforcement on writes.
- `folder-content-actions`: save-to-folder from study content, uploads via Cloudinary, create game/quiz from folder context.

### Modified Capabilities

- None (search/courses/groups pages unchanged; only deep-link `?type=` already added).

## Impact

- New: `src/lib/library.js` (node helpers, breadcrumbs, permission checks), `src/app/api/folders/**` routes, `src/app/api/library/**` or single `folders` resource, `library_nodes` + `library_members` collections with indexes.
- Modified: `src/app/folders/page.js` rebuilt to Drive UI, `src/app/search/page.js` gets Save-to-folder buttons (additive).
- No changes to ledger, games scoring, antifarm, chunk settlement, curriculum seed.
