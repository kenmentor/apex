## 1. Client fetching

- [x] 1.1 Add `src/lib/fetch-json.js` (in-flight dedupe + TTL cache)
- [x] 1.2 Shell uses cached helper with 60s TTL for notifications/wallet
- [x] 1.3 Course page parallel batch via helper; home/search switch to helper

## 2. Paint + overhead

- [x] 2.1 Fonts: preconnect + display=swap, remove render-blocking
- [x] 2.2 Remove `window.fetch` wrapper from TelemetryProvider

## 3. Server queries

- [x] 3.1 Personalized feed: parallelize independent queries + `$sample` challenge
- [x] 3.2 Leaderboard `limit` param (default 100)

## 4. Verification

- [x] 4.1 Logic tests (cache/dedupe/TTL, $sample shape, limit default); node --check changed files; no behavior changes
