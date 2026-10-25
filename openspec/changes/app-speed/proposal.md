## Why

Pages feel slow: course pages fetch in waterfalls, the shell refetches on every navigation, nothing is cached, fonts block first paint, and the personalized feed plus telemetry add per-request taxes. This change cuts sequential round trips roughly in half with zero behavior changes.

## What Changes

- New cached fetch helper (`src/lib/fetch-json.js`): in-flight dedupe + short TTL, shared by shell and pages.
- Shell (NavWrapper) fetches notifications/wallet at most once per 60s.
- Course page: courses + videos + readings in one parallel batch.
- Home/search: same parallel data through the cached helper.
- Telemetry: remove the global `window.fetch` wrapper (beacon tracking stays).
- Fonts: preconnect + `display=swap` so text paints immediately.
- Feed API: parallelize independent queries; `$sample` instead of `count + skip(random)`.
- Leaderboard API: optional `limit` (default 100) to bound aggregation cost.

## Capabilities

### New Capabilities

- `app-speed`: cached fetch helper, parallelized batches, non-blocking fonts, trimmed telemetry, bounded heavy queries.

### Modified Capabilities

- None (response shapes unchanged; only timing/cost changes).

## Impact

- Affected: `src/lib/fetch-json.js` (new), `NavWrapper`, home, course detail, search, `TelemetryProvider`, layout font links, feed + leaderboard routes.
- No API contract changes; no UI changes except faster paint.
- Out of scope: image optimization, virtualized lists, DB index migration (documented for later).
