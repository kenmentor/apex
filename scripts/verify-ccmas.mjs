// Cross-validate DB curriculum against the CCMAS JSON source of truth.
import { MongoClient } from 'mongodb'
import { readFileSync } from 'node:fs'

const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz'
const SRC = new URL('../../data-raw/ccmas/computing.json', import.meta.url)

const splitTopics = (contents) => String(contents || '')
  .split(/(?<=[.;])\s+|\n+/)
  .map(s => s.trim().replace(/\s+/g, ' '))
  .filter(s => s.length > 3 && !/^this course is\b/i.test(s))

const c = new MongoClient(URI, { connectTimeoutMS: 15000, serverSelectionTimeoutMS: 15000 })
await c.connect()
const db = c.db()
console.log('DB:', db.databaseName)

const data = JSON.parse(readFileSync(SRC, 'utf-8'))
const byCode = {}
for (const t of data.course_details || []) byCode[t.code] = t

let issues = 0
const flag = (msg) => { issues += 1; console.log(' MISMATCH:', msg) }

// 1. Every table course must have a DB course doc with matching meta.
let checked = 0
for (const pr of data.programmes) {
  for (const [level, tab] of Object.entries(pr.levels || {})) {
    for (const tc of tab.courses || []) {
      checked += 1
      const docs = await db.collection('curriculum_courses').find({ code: tc.code }).toArray()
      if (!docs.length) { flag(`${tc.code} (${pr.name} ${level}): NO course doc`); continue }
      const src = byCode[tc.code]
      for (const d of docs) {
        if (src && d.units !== src.units) flag(`${tc.code}: units db=${d.units} src=${src.units}`)
        if (src && d.status !== src.status) flag(`${tc.code}: status db=${d.status} src=${src.status}`)
        if ((d.outcomes || []).length !== (src ? src.outcomes.length : 0)) flag(`${tc.code}: outcomes db=${(d.outcomes || []).length} src=${src ? src.outcomes.length : 0}`)
      }
      // 2. Topics must match a fresh split of the source contents.
      const expected = splitTopics(src ? src.contents : '')
      const actual = await db.collection('curriculum_topics').find({ courseCode: tc.code }).sort({ order: 1 }).toArray()
      // dedupe by section (shared atoms across programmes counted once per course)
      const seen = new Set()
      const uniq = actual.filter(t => (seen.has(t.id) ? false : (seen.add(t.id), true)))
      if (uniq.length !== expected.length) flag(`${tc.code}: topics db=${uniq.length} expected=${expected.length}`)
      for (let i = 0; i < Math.min(uniq.length, expected.length); i++) {
        if ((uniq[i].title || '').trim() !== expected[i].trim()) { flag(`${tc.code} topic[${i}] text differs:\n   db : ${uniq[i].title}\n   src: ${expected[i]}`); break }
      }
      // 3. Every topic needs its 3 ladder activities.
      const acts = await db.collection('topic_activities').countDocuments({ courseCode: tc.code, origin: 'core', auto: true })
      if (acts !== uniq.length * 3) flag(`${tc.code}: ladder activities=${acts} expected=${uniq.length * 3}`)
    }
  }
}

// 4. No orphan topics (course missing) and no duplicate ids.
const allTopics = await db.collection('curriculum_topics').find({}).project({ id: 1, courseCode: 1 }).toArray()
const ids = new Set()
let dupes = 0
for (const t of allTopics) { if (ids.has(t.id)) dupes += 1; ids.add(t.id) }
if (dupes) flag(`duplicate topic ids: ${dupes}`)
const courseCodes = new Set((await db.collection('curriculum_courses').find({}).project({ code: 1 }).toArray()).map(d => d.code))
const orphans = allTopics.filter(t => !courseCodes.has(t.courseCode)).map(t => t.id)
if (orphans.length) flag(`orphan topics (no course): ${orphans.slice(0, 10).join(', ')}`)

console.log(`checked ${checked} table rows; issues: ${issues}`)
console.log(issues === 0 ? 'ALL CLEAN ✓' : 'SEE MISMATCHES ABOVE')
await c.close()
process.exit(issues === 0 ? 0 : 1)
