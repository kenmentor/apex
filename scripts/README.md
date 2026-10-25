# scripts/

One-off ops / DB utilities. Run via npm (from `quiz-app/`):

```
npm run seed:gss212     → seed-gss212.mjs   (GSS 212 questions + videos)
npm run seed:cos-csc    → seed-cos-csc.mjs  (COS 202 + CSC 282)
npm run seed:theory     → seed-theory.mjs   (theory references)
npm run db:query        → query.mjs         (peek at collections)
npm run db:dump-gss212  → dump-gss212.mjs   (console dump, debugging)
npm run db:promote       → promote.mjs       (make a user admin — edit email first!)
npm run db:test         → test-mongo.mjs    (connectivity check)
              —           migrate-dates.mjs   (one-off date migration, keep for history)
```

Rules:
- All paths relative: `join(__dirname, '..', 'data', 'courses', file)`.
- Never hardcode `C:/...` or connection strings — use `process.env.MONGODB_URI`
  (loads from `.env` via `dotenv/config` where needed).
- Prefer adding new seeders under `../seed-data/` + an npm script entry.
