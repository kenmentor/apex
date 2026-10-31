## 1. Library core

- [x] 1.1 Add `src/lib/library.js` (node shapes, breadcrumb builder, permission helpers on ancestor chain)
- [x] 1.2 Add `library_nodes` + `library_members` indexes (`ensure-search-indexes` or new `seed` hook)
- [x] 1.3 `GET /api/library` (children + breadcrumb + role) + `POST /api/library` (create folder/ref, editor+)
- [x] 1.4 `PATCH /api/library/[id]` (rename/move with cycle check) + `DELETE /api/library/[id]` (recursive)
- [x] 1.5 `POST /api/library/[id]/copy` (deep copy cap 200) + move validation

## 2. Sharing

- [x] 2.1 `GET/POST /api/library/[id]/members` + `DELETE /api/library/[id]/members?email=` (owner-only)
- [x] 2.2 Viewer/editor enforcement on all writes + shared-with-me roots in `GET /api/library`
- [x] 2.3 Leave/remove member flow verified

## 3. Drive UI (same window)

- [x] 3.1 Rebuild `/folders` as Drive browser (`?id=` routing, breadcrumbs, grid/list, in-folder search)
- [x] 3.2 Node menus: rename, move picker, copy, delete confirm, new folder/upload/link
- [x] 3.3 Multi-select bar for bulk move/delete (minimal)
- [x] 3.4 Share dialog (add viewer/editor, list, remove) + Shared section
- [x] 3.5 Upload via `/api/upload` -> file ref; Save-to-folder from search/courses

## 4. Create-from-folder

- [x] 4.1 New menu: folder, upload, link, Make quiz/game shortcuts with courseCode context
- [x] 4.2 Stale ref badge + empty states; viewer hides write actions

## 5. Verification

- [ ] 5.1 CRUD/move/copy/delete + cycle rejection + 200-cap smoke tested via API
- [ ] 5.2 Sharing matrix checked (owner/editor/viewer/anon); no changes to ledger/games/antifarm

## 6. Central public store + Samsung-style files (follow-up)

- [x] 6.1 `user_materials` collection + `GET/POST /api/materials` (default `isPublic: true`) + `PATCH/DELETE /api/materials/[id]` (owner-only)
- [x] 6.2 Uploads write central doc first, then library ref (`materialId`, `size`, `mime`, `isPublic`); public toggle in Details
- [x] 6.3 `/api/search` includes `user_materials` (`isPublic: true`) in notes/pdf/video/audio groups
- [x] 6.4 Folders UI Samsung-inspired (own icons): My Files header, Categories (Images/Videos/Audio/Documents with counts), Internal storage folders, sort (name/date/size/type), select + Move/Copy/Share/Delete bar, Details sheet with size/date/visibility, category view with back
- [ ] 6.5 Smoke: upload -> appears in Search anon; make private -> disappears; no build per user rule
