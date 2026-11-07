// Targeted CCMAS repair for Human Anatomy (ANA): fixes the ANA 302
// placeholder (was titled "ANA 302" with null units — CCMAS says
// Neuroanatomy, 2 units) and adds the 4 courses the programme mapping was
// missing (ANA 312, 322, 411, 432). Mirrors
// scripts/seed-ccmas-normalized.mjs shapes/filters exactly — upserts only,
// never deletes. Safe to re-run.
//
// Usage: node scripts/fix-ana-ccmas.mjs
// Needs MONGODB_URI in the environment or quiz-app/.env
import { MongoClient } from 'mongodb'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  for (const p of [join(__dirname, '..', '.env'), join(__dirname, '.env')]) {
    try {
      if (!existsSync(p)) continue
      for (const line of readFileSync(p, 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
        if (m && !process.env[m[1]]) {
          let v = m[2].trim()
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
          process.env[m[1]] = v
        }
      }
    } catch {}
  }
}
loadEnv()

const URI = process.env.MONGODB_URI
if (!URI) {
  console.error('MONGODB_URI not set (env or quiz-app/.env). Aborting — nothing touched.')
  process.exit(1)
}

const slug = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const splitTopics = (contents) => String(contents || '')
  .split(/(?<=[.;])\s+|\n+/)
  .map(s => s.trim().replace(/\s+/g, ' '))
  .filter(s => s.length > 3 && !/^this course is\b/i.test(s))

const WANT = new Set(['ANA 302', 'ANA 312', 'ANA 322', 'ANA 411', 'ANA 432'])
const PROG = 'ANA'
const DISCIPLINE = 'basic-medical'

const src = JSON.parse(readFileSync(join(__dirname, '..', '..', 'data-raw', 'ccmas', 'basic-medical.json'), 'utf-8'))
const prog = src.programmes.find(p => p.name === 'Human Anatomy')
if (!prog) throw new Error('Human Anatomy programme missing from source JSON')
const detailsByCode = new Map((src.course_details || []).map(d => [d.code, d]))

const client = new MongoClient(URI, { serverSelectionTimeoutMS: 20000, connectTimeoutMS: 20000 })
await client.connect()
const db = client.db()
console.log('DB:', db.databaseName)

let courses = 0, sections = 0, topics = 0
for (const [level, tab] of Object.entries(prog.levels || {})) {
  const levelLabel = `${level} Level`
  for (const row of tab.courses || []) {
    if (!WANT.has(row.code)) continue
    const code = row.code
    // Details: same consensus rule as the seeder is overkill here — the
    // source block for these codes is unique after the relabel fix.
    const det = detailsByCode.get(code)
    const sectionId = `${slug(code)}-S1`
    const topicList = splitTopics(det ? (Array.isArray(det.contents) ? det.contents.join(' ') : det.contents) : '').map((t, i) => ({
      id: `${slug(code)}-S1-T${i + 1}`, sectionId, title: t, order: i,
    }))

    await db.collection('curriculum_sections').updateOne(
      { id: sectionId },
      {
        $set: { id: sectionId, title: 'Course Contents', order: 0, courseCode: code, level: levelLabel, origin: 'core', updatedAt: new Date().toISOString() },
        $addToSet: { programmes: PROG, disciplines: DISCIPLINE },
      },
      { upsert: true },
    )
    sections++

    for (const t of topicList) {
      await db.collection('curriculum_topics').updateOne(
        { id: t.id },
        {
          $set: { ...t, courseCode: code, level: levelLabel, origin: 'core', updatedAt: new Date().toISOString() },
          $addToSet: { programmes: PROG, disciplines: DISCIPLINE },
        },
        { upsert: true },
      )
      topics++
    }

    const outcomes = det ? (Array.isArray(det.outcomes) ? det.outcomes : []) : []
    await db.collection('curriculum_courses').updateOne(
      { code, level: levelLabel, programmeCode: PROG, disciplineCode: DISCIPLINE },
      {
        $set: {
          code,
          title: row.title || det?.title || code,
          units: row.units ?? det?.units ?? null,
          status: row.status || det?.status || null,
          LH: row.LH ?? det?.LH ?? null,
          PH: row.PH ?? det?.PH ?? null,
          semester: null,
          level: levelLabel,
          programmeCode: PROG,
          disciplineCode: DISCIPLINE,
          core: true,
          university: null,
          outcomes,
          labwork: det?.lab || '',
          sections: [sectionId],
          topics: topicList.map(t => t.id),
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true },
    )
    courses++
    console.log(` - ${code} (${levelLabel}): "${row.title}" units=${row.units} topics=${topicList.length}`)
  }
}

console.log(`\nDone: ${courses} courses, ${sections} sections, ${topics} topics upserted.`)
await client.close()
