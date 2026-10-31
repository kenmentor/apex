// Cross-validate DB curriculum against the CCMAS JSON sources of truth
// (data-raw/ccmas/*.json). Detail lookup is global across disciplines so
// shared courses (MTH 101, PHY 101, COS 202, ...) validate even when the
// detail block lives in another discipline's file.
import { MongoClient } from 'mongodb'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz'
const SRC_DIR = join(__dirname, '..', '..', 'data-raw', 'ccmas')

const DETAIL_ALIASES = { 'DTS 322': 'DST 322' }

const splitTopics = (contents) => String(contents || '')
  .split(/(?<=[.;])\s+|\n+/)
  .map(s => s.trim().replace(/\s+/g, ' '))
  .filter(s => s.length > 3 && !/^this course is\b/i.test(s))

const c = new MongoClient(URI, { connectTimeoutMS: 15000, serverSelectionTimeoutMS: 15000 })
await c.connect()
const db = c.db()
console.log('DB:', db.databaseName)

const files = readdirSync(SRC_DIR).filter(f => f.endsWith('.json')).sort()
const datasets = files.map(f => JSON.parse(readFileSync(join(SRC_DIR, f), 'utf-8')))
// Global detail index — SAME consensus-wins rule as the seeder
// (see scripts/seed-ccmas-normalized.mjs; keep in sync).
const topicCount = (d) => String(d.contents || '').split(/(?<=[.;])\s+|\n+/)
  .map(s => s.trim()).filter(s => s.length > 3).length
const blockKey = (d) => String(d.contents || '').toLowerCase().replace(/\s+/g, ' ').trim()
  + '||' + (d.outcomes || []).join('||').toLowerCase().replace(/\s+/g, ' ').trim()
const _grouped = new Map()
for (const data of datasets) for (const t of data.course_details || []) {
  if (!_grouped.has(t.code)) _grouped.set(t.code, [])
  _grouped.get(t.code).push(t)
}
const byCode = {}
for (const [code, variants] of _grouped) {
  const freq = new Map()
  for (const v of variants) freq.set(blockKey(v), (freq.get(blockKey(v)) || 0) + 1)
  let best = variants[0], bestScore = [-1, -1]
  for (const v of variants) {
    const s = [freq.get(blockKey(v)), topicCount(v)]
    if (s[0] > bestScore[0] || (s[0] === bestScore[0] && s[1] > bestScore[1])) { best = v; bestScore = s }
  }
  byCode[code] = best
}
for (const [canonical, alias] of Object.entries(DETAIL_ALIASES)) if (!byCode[canonical] && byCode[alias]) byCode[canonical] = byCode[alias]

let issues = 0
const flag = (msg) => { issues += 1; console.log(' MISMATCH:', msg) }

// 1. Every table course must have a DB course doc with matching meta.
let checked = 0
for (const data of datasets) {
  for (const pr of data.programmes || []) {
    for (const [level, tab] of Object.entries(pr.levels || {})) {
      for (const tc of tab.courses || []) {
        checked += 1
        const docs = await db.collection('curriculum_courses').find({ code: tc.code }).toArray()
        if (!docs.length) { flag(`${tc.code} (${data.discipline}/${pr.name} ${level}): NO course doc`); continue }
        const src = byCode[tc.code]
        if (!src) continue // table-only code (no detail block anywhere) — seeder stores empty topics; not a mismatch
        // Units/status are per-programme: the seeder takes the TABLE ROW first
        // (row.units ?? det.units), because the same code can carry different
        // weights in different programmes (e.g. CYB 201 is 2u in Computing but
        // a different 1u course in Sciences Forensic Science). So validate docs
        // against their own row, and outcomes/topics against the shared detail.
        // docs are per-programme; the row only needs ONE matching doc (its own
        // programme's). find({code}) returns every programme's doc, so an
        // every-doc check false-flags shared codes with per-programme weights.
        if (tc.units != null && !docs.some(d => d.units === tc.units)) flag(`${tc.code}: units, no doc matches row=${tc.units} (have ${[...new Set(docs.map(d => d.units))].join(',')})`)
        if (tc.status != null && !docs.some(d => d.status === tc.status)) flag(`${tc.code}: status, no doc matches row=${tc.status}`)
        for (const d of docs) {
          if ((d.outcomes || []).length !== (src ? src.outcomes.length : 0)) flag(`${tc.code}: outcomes db=${(d.outcomes || []).length} src=${src ? src.outcomes.length : 0}`)
        }
        // 2. Topics must match a fresh split of the source contents.
        const expected = splitTopics(src ? src.contents : '')
        const actual = await db.collection('curriculum_topics').find({ courseCode: tc.code }).sort({ order: 1 }).toArray()
        // dedupe by id (shared atoms across programmes/disciplines counted once per course)
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

// 5. Shared-course check: every topic atom should list all disciplines that use it.
const sharedSample = ['MTH 101', 'PHY 101', 'COS 101', 'GST 111', 'COS 202']
for (const code of sharedSample) {
  const t = await db.collection('curriculum_topics').findOne({ courseCode: code })
  if (t) console.log(` shared ${code}: programmes=${(t.programmes || []).length} disciplines=${JSON.stringify(t.disciplines || [])}`)
}

console.log(`checked ${checked} table rows across ${datasets.length} disciplines; issues: ${issues}`)
console.log(issues === 0 ? 'ALL CLEAN ✓' : 'SEE MISMATCHES ABOVE')
await c.close()
process.exit(issues === 0 ? 0 : 1)
