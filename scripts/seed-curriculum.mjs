import { MongoClient } from 'mongodb'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz'

// CCMAS-grounded values for the pilot (Computing, UI domestication):
// C-COS 202 (3u, LH30 PH45, sem 2) · CSC 282 lab (2u, LH15 PH45, sem 2) ·
// C-CSC 203 Discrete Structures (2u, LH30, sem 1).
const ENRICH = {
  'COS 202': { units: 3, status: 'C', LH: 30, PH: 45, semester: 2, outcomes: ['Write object-oriented programs with classes and exception handling', 'Use arrays and file input/output in programs'] },
  'CSC 282': { units: 2, status: 'C', LH: 15, PH: 45, semester: 2, outcomes: ['Build Java classes with constructors', 'Apply overloading and overriding correctly'] },
  'CSC 203': { units: 2, status: 'C', LH: 30, PH: 0, semester: 1, outcomes: ['Use propositional logic and truth tables', 'Work with sets and relations in proofs'] },
}

const KIND_ORDER = { learn: 0, watch: 1, drill: 2, play: 3, prove: 4 }

async function main() {
  const plan = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'plans', 'cos-200L.json'), 'utf-8'))
  const c = new MongoClient(URI, { connectTimeoutMS: 10000, serverSelectionTimeoutMS: 10000 })
  await c.connect()
  const db = c.db()

  await db.collection('disciplines').updateOne(
    { code: 'Computing' },
    { $set: { code: 'Computing', title: 'Computing', updatedAt: new Date().toISOString() } },
    { upsert: true }
  )
  await db.collection('programmes').updateOne(
    { code: 'COS' },
    { $set: { code: 'COS', title: 'B.Sc. Computer Science', disciplineCode: 'Computing', updatedAt: new Date().toISOString() } },
    { upsert: true }
  )

  let courseCount = 0, topicCount = 0, actCount = 0
  for (const course of plan.courses || []) {
    const code = course.code
    const meta = ENRICH[code] || { units: 2, status: 'C', LH: 30, PH: 0, semester: 1, outcomes: [] }
    const sections = []
    const topics = []
    const acts = []
    for (const t of course.topics || []) {
      const sectionId = t.id
      sections.push({ id: sectionId, title: t.title, order: sections.length, ccmasRef: t.ccmasRef || '' })
      // Pilot: one topic per section (real outlines will subdivide further).
      const topicId = `${t.id}-t1`
      topics.push({ id: topicId, sectionId, title: t.title, order: 0, difficulty: t.difficulty || 1 })
      topicCount += 1
      for (const item of t.items || []) {
        acts.push({
          courseCode: code, topicId,
          kind: item.kind, title: item.title,
          payload: { readingRef: item.readingRef || null, bank: item.bank || null, filter: item.filter || null, passMark: item.passMark || null },
          order: KIND_ORDER[item.kind] ?? 9,
          origin: 'core', status: 'approved', createdBy: 'seed',
          updatedAt: new Date().toISOString(),
        })
      }
    }
    await db.collection('curriculum_courses').updateOne(
      { code, level: '200 Level', university: null },
      {
        $set: {
          code, title: course.title, units: meta.units, status: meta.status,
          LH: meta.LH, PH: meta.PH, semester: meta.semester,
          level: '200 Level', programmeCode: 'COS', disciplineCode: 'Computing',
          core: true, university: null, outcomes: meta.outcomes,
          sections, topics, updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    )
    courseCount += 1
    for (const a of acts) {
      await db.collection('topic_activities').updateOne(
        { courseCode: a.courseCode, topicId: a.topicId, kind: a.kind, title: a.title, origin: 'core' },
        { $set: a },
        { upsert: true }
      )
      actCount += 1
    }
  }

  console.log(`curriculum seeded: 1 discipline, 1 programme, ${courseCount} courses, ${topicCount} topics, ${actCount} core activities.`)
  await c.close()
}

main().catch(e => { console.error('seed-curriculum failed:', e.message); process.exit(1) })
