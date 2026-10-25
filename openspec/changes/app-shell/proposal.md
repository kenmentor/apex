## Why

Navigation grew organically (Courses, Spaces, Rankings, Profile tabs) and no longer matches the product: curriculum plans, games, search, and messages have nowhere to live. A single X-style shell — bottom tabs for the 5 daily destinations plus an avatar-opened sidebar for everything else — gives every current and planned surface a home.

## What Changes

- Bottom tabs (mobile + desktop rail): Home `/`, Curriculum `/plan`, Groups `/spaces`, Search `/search` (new), Messages `/messages` (new).
- Global top bar: avatar (opens sidebar), app title, notification bell with unread badge → `/notifications`.
- Sidebar drawer: profile + coin balance, Games hub links, My Groups, Create (group/content), Progress (plan, streak, wallet, rankings), Settings, Logout.
- New `/search`: one query across courses, groups, games.
- New `/messages`: inbox backed by the existing notifications collection (nudges, results, announcements). True user-to-user DMs are explicitly a later change.
- `NavWrapper` route map extended; old Courses/Rankings/Profile tabs move into the sidebar.

## Capabilities

### New Capabilities

- `app-shell`: bottom-tab bar, top bar, avatar sidebar drawer, search page, messages inbox.

### Modified Capabilities

- None (existing pages keep their routes; only the chrome around them changes).

## Impact

- Affected: `src/components/NavBar.js`, `src/components/NavWrapper.js`, new `TopBar.js` + `SideDrawer.js`, new `src/app/search` + `src/app/messages` routes.
- No changes to page logic, APIs, ledger, or games; notifications API reused as-is.
- Out of scope: true DMs, desktop multi-column layout, settings expansion.
