// Stage 2: normalize CCMAS computing.json into atomic collections.
//
//   curriculum_courses  (metadata + outcomes + labwork + section/topic ID lists)
//   curriculum_sections (own docs, immutable IDs, parent courseCode)
//   curriculum_topics   (own docs, immutable IDs, parent sectionId + courseCode)
//
// Rules honored: reference-never-embed, IDs are forever (deterministic slugs),
// no deletes (upsert only). Re-runnable against any DB via MONGODB_URI,
// so the exact same script seeds staging and production.
import { MongoClient } from 'mongodb'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz'
const SRC = join(__dirname, '..', '..', 'data-raw', 'ccmas', 'computing.json')

const slug = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')

// Programme short codes (dominant table prefix per programme).
const PROG_CODES = {
  'Computer Science': 'COS',
  'Cybersecurity': 'CYB',
  'Data Science': 'DTS',
  'Information and Communication': 'ICT',
  'Information Systems': 'INS',
  'Information Technology': 'IFT',
  'Software Engineering': 'SEN',
}

function splitTopics(contents) {
  // No cap: every CCMAS sentence is a topic. Fidelity over brevity.
  return String(contents || '')
    .split(/(?<=[.;])\s+|\n+/)
    .map(s => s.trim().replace(/\s+/g, ' '))
    .filter(s => s.length > 3 && !/^this course is\b/i.test(s))
}

async function main() {
  const data = JSON.parse(readFileSync(SRC, 'utf-8'))
  const c = new MongoClient(URI, { connectTimeoutMS: 15000, serverSelectionTimeoutMS: 15000 })
  await c.connect()
  const db = c.db()
  console.log('DB:', db.databaseName)

  await db.collection('disciplines').updateOne(
    { code: 'Computing' },
    { $set: { code: 'Computing', title: 'Computing', source: data.source, updatedAt: new Date().toISOString() } },
    { upsert: true }
  )

  let nCourses = 0, nSections = 0, nTopics = 0
  const progByName = new Map(data.programmes.map(p => [p.name, p]))

  for (const prog of data.programmes) {
    const progCode = PROG_CODES[prog.name] || prog.name.replace(/^B\.Sc\.\s+/i, '').split(' ')[0].toUpperCase()
    await db.collection('programmes').updateOne(
      { name: prog.name },
      { $set: { name: prog.name, code: progCode, disciplineCode: 'Computing', overview: prog.overview || '', philosophy: prog.philosophy || '', objectives: prog.objectives || [], updatedAt: new Date().toISOString() } },
      { upsert: true }
    )

    for (const [level, tab] of Object.entries(prog.levels || {})) {
      const levelLabel = `${level} Level`;
      for (const row of tab.courses || []) {
        const det = (prog.courseDetails || []).find(x => x.code === row.code)
          || data.course_details.find(x => x.code === row.code)
        const code = row.code
        const sem = null // CCMAS tables carry no semester; universities set per session
        const sections = [{ id: `${slug(code)}-S1`, title: 'Course Contents', order: 0 }]
        const topics = splitTopics(det ? det.contents : '').map((t, i) => ({
          id: `${slug(code)}-S1-T${i + 1}`, sectionId: `${slug(code)}-S1`, title: t, order: i,
        }))

        await db.collection('curriculum_sections').updateOne(
          { id: sections[0].id },
          {
            $set: { ...sections[0], courseCode: code, level: levelLabel, origin: 'core', updatedAt: new Date().toISOString() },
            $addToSet: { programmes: progCode },
          },
          { upsert: true }
        )
        nSections += 1

        for (const t of topics) {
          await db.collection('curriculum_topics').updateOne(
            { id: t.id },
            {
              $set: { ...t, courseCode: code, level: levelLabel, origin: 'core', updatedAt: new Date().toISOString() },
              $addToSet: { programmes: progCode },
            },
            { upsert: true }
          )
          nTopics += 1
        }

        await db.collection('curriculum_courses').updateOne(
          { code, level: levelLabel, programmeCode: progCode },
          {
            $set: {
              code, title: row.title || (det ? det.title : code),
              units: row.units ?? (det ? det.units : null),
              status: row.status || (det ? det.status : null),
              LH: row.LH ?? (det ? det.LH : null), PH: row.PH ?? (det ? det.PH : null),
              semester: sem, level: levelLabel, programmeCode: progCode, disciplineCode: 'Computing',
              core: true, university: null,
              outcomes: det ? det.outcomes || [] : [],
              labwork: det ? det.lab || '' : '',
              sections: sections.map(s => s.id), topics: topics.map(t => t.id),
              updatedAt: new Date().toISOString(),
            },
          },
          { upsert: true }
        )
        nCourses += 1
      }
    }
  }

  // Programmes that share common 100-level courses reference the same atoms:
  // nothing extra to do — IDs are global, links resolve regardless of programme.
  // Standard ladder per topic (auto-generated placeholders officials enrich later).
  // $setOnInsert keyed with auto:true so real content never collides.
  let nActs = 0
  const allTopics = await db.collection('curriculum_topics').find({}).toArray()
  for (const t of allTopics) {
    const ladder = [
      { kind: 'learn', title: `Read: ${t.title}`, payload: {}, order: 0 },
      { kind: 'drill', title: `Drill: ${t.title}`, payload: {}, order: 1 },
      { kind: 'prove', title: `Prove: ${t.title}`, payload: { passMark: 80 }, order: 2 },
    ]
    for (const a of ladder) {
      await db.collection('topic_activities').updateOne(
        { courseCode: t.courseCode, topicId: t.id, kind: a.kind, origin: 'core', auto: true },
        { $setOnInsert: { ...a, courseCode: t.courseCode, topicId: t.id, origin: 'core', status: 'approved', auto: true, createdBy: 'seed', updatedAt: new Date().toISOString() } },
        { upsert: true }
      )
      nActs += 1
    }
  }

  console.log(`normalized: 1 discipline, ${progByName.size} programmes, ${nCourses} course-links, ${nSections} sections, ${nTopics} topics, ${nActs} ladder slots.`)
  console.log('Note: semester is null (CCMAS tables carry no semester) — set per university session.');
  await c.close()
}

main().catch(e => { console.error('seed-ccmas-normalized failed:', e.message); process.exit(1) })
