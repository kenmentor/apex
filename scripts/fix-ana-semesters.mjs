// Stamp First/Second semester onto ANA courses from a live CCMAS-era
// curriculum (Caleb University B.Sc. Human Anatomy page, verified
// 2026-11-08). Cross-checked: every assignment matches the odd/even course
// number heuristic already used in the app, and every code/title matches
// CCMAS 2022 (ANA 302 = Neuroanatomy, 2u).
// Run: node scripts/fix-ana-semesters.mjs (needs MONGODB_URI in env/.env)
import { MongoClient } from 'mongodb';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
for (const p of [join(__dirname, '..', '.env')]) {
  try {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        let v = m[2].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        process.env[m[1]] = v;
      }
    }
  } catch {}
}
const URI = process.env.MONGODB_URI;
if (!URI) { console.error('MONGODB_URI missing'); process.exit(1); }

// [code, level, semester] — semesters per Caleb University's published
// CCMAS-era Anatomy curriculum (odd/even rule holds for every row).
const ROWS = [
  ['ANA 201', '200 Level', 1], ['ANA 202', '200 Level', 2],
  ['ANA 203', '200 Level', 1], ['ANA 204', '200 Level', 2],
  ['ANA 301', '300 Level', 1], ['ANA 302', '300 Level', 2],
  ['ANA 307', '300 Level', 1], ['ANA 312', '300 Level', 2],
  ['ANA 322', '300 Level', 2], ['ANA 341', '300 Level', 1],
  ['ANA 351', '300 Level', 1], ['ANA 352', '300 Level', 2],
  ['ANA 399', '300 Level', 1],
  ['ANA 411', '400 Level', 1], ['ANA 412', '400 Level', 2],
  ['ANA 421', '400 Level', 1], ['ANA 422', '400 Level', 2],
  ['ANA 432', '400 Level', 2], ['ANA 441', '400 Level', 1],
  ['ANA 499', '400 Level', 1],
];

const client = new MongoClient(URI, { serverSelectionTimeoutMS: 20000, connectTimeoutMS: 20000 });
await client.connect();
const db = client.db();
let n = 0;
for (const [code, level, semester] of ROWS) {
  const r = await db.collection('curriculum_courses').updateMany(
    { code, level, programmeCode: 'ANA' },
    { $set: { semester, updatedAt: new Date().toISOString() } },
  );
  n += r.modifiedCount + r.matchedCount;
  console.log(`${code} (${level}): semester=${semester} matched=${r.matchedCount}`);
}
console.log(`done: ${n} docs touched`);
await client.close();
