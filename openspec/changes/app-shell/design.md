## Context

`NavWrapper` mounts a global `NavBar` (bottom tabs on mobile, left rail on desktop) with per-route `active` mapping. Notifications already exist (`/api/notifications` GET with unreadCount + PATCH mark-read, `/notifications` page). Auth state lives in `localStorage` via `@/lib/auth` (`getUser`, `getToken`); wallet balance via `/api/wallet?email=`.

## Goals / Non-Goals

**Goals:**
- One global shell: top bar + sidebar + 5 bottom tabs on every non-auth route.
- Search across courses, groups, games from one box.
- Messages inbox reusing notifications infra, with unread badge on tab + bell.

**Non-Goals:**
- True DMs (needs inbox model, safety/moderation — separate change).
- Settings expansion (link to existing `/settings` only).
- Visual redesign of pages themselves.

## Decisions

- **Sidebar state lives in a `ShellChrome` client component** rendered by `NavWrapper` (holds drawer open/close, unread count). Alternative: page-level bars (rejected — 40+ pages would each need wiring).
- **Messages = notifications inbox**, not DMs. Data already flows (nudge, score-beaten, achievements); building DMs now would force identity/safety decisions prematurely.
- **Search is client-side over three cached lists** (courses, spaces, static games index). No search backend in V1; lists are small. Alternative: Mongo text index (rejected — overkill now, easy later).
- **Curriculum tab points at `/plan`** (with waitlist for non-pilot users, already built). Courses browser stays reachable via sidebar + home.
- **Bell + Messages tab share one unread fetch** in ShellChrome to avoid double polling.

## Risks / Trade-offs

- [Risk] Extra top bar eats vertical space on small phones → Mitigation: slim 52px bar, pages already use `pb-24`.
- [Risk] Users miss moved Courses/Rankings tabs → Mitigation: sidebar lists them; home page keeps entry points.
- [Trade-off] Client-side search won't scale past thousands of items — accepted; server search later.
