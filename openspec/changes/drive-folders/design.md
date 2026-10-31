## Context

`src/app/folders/page.js` is virtual-only (type links + `/api/courses`). Study content lives in Mongo (`questions`, `theory_references`, `readings`, `videos`, `space_posts` media on Cloudinary) and is aggregated by `GET /api/search`. No `library/folders/saved` collection exists. Auth is JWT in `localStorage` (`@/lib/auth` `getToken/getUser`), server guard via `Authorization: Bearer` -> `auth-server.js`. Uploads go via `POST /api/upload` -> Cloudinary.

## Goals / Non-Goals

**Goals:**
- Single `library_nodes` hierarchy per user with Drive ops: browse/create/rename/move/copy/delete, breadcrumb, in-folder search, grid/list.
- Any search result, course, group, or upload savable as a `ref` node with `href` preview.
- Sharing V1: owner + `library_members` {viewer, editor}; editors write, viewers read.
- Folder as creation workspace: New (folder, upload, link) + Make quiz/game from folder context (deep-link to existing `/courses/[code]/quiz`, `/games/*`).

**Non-Goals:**
- Real-time co-editing, public link sharing, storage quotas, trash/restore (hard delete V1 with confirm), offline sync.
- True user file-system (no FS writes; uploads stay on Cloudinary).
- Changing search/courses/spaces schemas.

## Decisions

- **One `library_nodes` collection, not folders+items split.** Node: `{ _id, ownerEmail, kind: 'folder'|'ref', name, parentId: ObjectId|null, itemKind, refId, href, url, courseCode, subtitle, color, order, createdAt, updatedAt }`. Single tree query `find({ownerEmail or shared, parentId})`, move = `parentId` rewrite + cycle check, copy = recursive insert. Alternative: two collections (rejected — joins + dual moves).
- **Sharing via `library_members` `{ nodeId: rootSharedFolderId, email, role, addedBy, createdAt }`.** Permission = owner OR ancestor membership with role. Enforce server-side on every write by walking ancestors (depth capped, indexes on `parentId`, `ownerEmail`). Alternative: ACL array on node (rejected — fan-out on deep copy).
- **Refs are pointers, not copies.** `refId + itemKind + href/url` copied from `/api/search` shape; preview navigates to existing `href`; source delete does not cascade (stale `ref` shows badge). Alternative: snapshot content (rejected — duplication + drift).
- **Uploads reuse `POST /api/upload`.** Folders UI uploads then creates `ref` node `itemKind: file|pdf|video|audio|image` with `url`. No new upload path.
- **APIs under `/api/library/...`:** `GET /?parentId=&q=` (children + breadcrumb), `POST /` (create folder/ref), `PATCH /[id]` (rename/move), `DELETE /[id]` (recursive), `POST /[id]/copy`, `POST /[id]/members` + `DELETE`. JWT required; viewer blocks writes; editor allows create/organize but not share/delete-root.
- **UI single-window Drive:** `src/app/folders/page.js` + `src/components/folders/*` (Browser, Breadcrumbs, NodeMenu, MovePicker, SaveToFolderButton). Same-window navigation `?id=<folderId>`, no new tabs. Selection + bulk move/delete V1 minimal (multi-select bar).

## Risks / Trade-offs

- [Risk] Deep trees -> ancestor walk cost → Mitigation: cap depth 20, index `parentId`, cache breadcrumb per request.
- [Risk] Copy explosion on large folders → Mitigation: cap 200 nodes per copy, reject with 413 + message.
- [Risk] Stale refs when source deleted → Mitigation: show "source missing" badge, keep node deletable.
- [Trade-off] Hard delete V1 (no trash) — accepted for speed; confirm modal + explicit warning.
- [Trade-off] Client-side permission hints only; true enforcement server-side — accepted.
