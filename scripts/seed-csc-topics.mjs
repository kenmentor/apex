// Item 1: CSC 102/162/182 curriculum_topics (NONE existed) from question-bank
// sections, + matching curriculum_sections + curriculum_courses rows.
// Also adds the missing COS/100 Level course rows for CSC 101 and COS 103
// (topics existed, but no COS programme row, so plans never listed them).
// Mirrors scripts/fix-ana-ccmas.mjs shapes/filters exactly — upserts only,
// never deletes. Safe to re-run.
//
// Usage: node scripts/seed-csc-topics.mjs (needs MONGODB_URI in env/.env)
import { MongoClient } from 'mongodb'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
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

const URI = process.env.MONGODB_URI
if (!URI) {
  console.error('MONGODB_URI not set (env or quiz-app/.env). Aborting — nothing touched.')
  process.exit(1)
}

const slug = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const titleCase = (s) => String(s || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
const PROG = 'COS'
const DISCIPLINE = 'Computing'
const LEVEL = '100 Level'

// [courseCode, bankFile, level]
const BUILDS = [
  ['CSC 102', 'csc102.json'],
  ['CSC 162', 'csc162.json'],
  ['CSC 182', 'csc182.json'],
]

const client = new MongoClient(URI, { serverSelectionTimeoutMS: 20000, connectTimeoutMS: 20000 })
await client.connect()
const db = client.db()
console.log('DB:', db.databaseName)

let sections = 0, topics = 0, courses = 0
for (const [code, file] of BUILDS) {
  const bank = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'courses', file), 'utf8'))
  const bankSections = bank.sections || []
  const courseTitle = bank.course_title || bank.study_guide_title || code
  const sectionIds = []
  const topicIds = []
  bankSections.forEach((s, i) => {
    const sectionId = `${slug(code)}-S${i + 1}`
    sectionIds.push(sectionId)
    topicIds.push(`${sectionId}-T1`)
  })

  for (let i = 0; i < bankSections.length; i++) {
    const sectionId = sectionIds[i]
    const topicId = topicIds[i]
    const title = titleCase(bankSections[i].section_title)
    await db.collection('curriculum_sections').updateOne(
      { id: sectionId },
      {
        $set: { id: sectionId, title, order: i, courseCode: code, level: LEVEL, origin: 'auto', updatedAt: new Date().toISOString() },
        $addToSet: { programmes: PROG, disciplines: DISCIPLINE },
      },
      { upsert: true },
    )
    sections++
    await db.collection('curriculum_topics').updateOne(
      { id: topicId },
      {
        $set: { id: topicId, sectionId, title, order: i, courseCode: code, level: LEVEL, origin: 'auto', updatedAt: new Date().toISOString() },
        $addToSet: { programmes: PROG, disciplines: DISCIPLINE },
      },
      { upsert: true },
    )
    topics++
  }

  await db.collection('curriculum_courses').updateOne(
    { code, level: LEVEL, programmeCode: PROG, disciplineCode: DISCIPLINE },
    {
      $set: {
        code,
        title: courseTitle,
        units: null,
        status: null,
        LH: null,
        PH: null,
        semester: null,
        level: LEVEL,
        programmeCode: PROG,
        disciplineCode: DISCIPLINE,
        core: true,
        university: null,
        outcomes: [],
        labwork: '',
        sections: sectionIds,
        topics: topicIds,
        updatedAt: new Date().toISOString(),
      },
    },
    { upsert: true },
  )
  courses++
  console.log(`${code}: ${bankSections.length} sections/topics + course row ("${courseTitle}")`)
}

// Missing COS rows for courses whose topics exist (CSC 101, COS 103):
// link the existing topic ids under one auto section so plans list them.
for (const code of ['CSC 101', 'COS 103']) {
  const existing = await db.collection('curriculum_topics').find({ courseCode: code }).project({ id: 1, _id: 0 }).sort({ order: 1 }).toArray()
  if (!existing.length) { console.log(`${code}: no topics, skipped`); continue }
  const already = await db.collection('curriculum_courses').findOne({ code, level: LEVEL, programmeCode: PROG })
  if (already) { console.log(`${code}: COS row already present, skipped`); continue }
  const peer = await db.collection('curriculum_courses').findOne({ code })
  const sectionId = `${slug(code)}-S1`
  await db.collection('curriculum_sections').updateOne(
    { id: sectionId },
    {
      $set: { id: sectionId, title: 'Course Contents', order: 0, courseCode: code, level: LEVEL, origin: 'auto', updatedAt: new Date().toISOString() },
      $addToSet: { programmes: PROG, disciplines: DISCIPLINE },
    },
    { upsert: true },
  )
  await db.collection('curriculum_courses').updateOne(
    { code, level: LEVEL, programmeCode: PROG, disciplineCode: DISCIPLINE },
    {
      $set: {
        code,
        title: peer?.title || code,
        units: peer?.units ?? null,
        status: peer?.status || null,
        LH: peer?.LH ?? null,
        PH: peer?.PH ?? null,
        semester: null,
        level: LEVEL,
        programmeCode: PROG,
        disciplineCode: DISCIPLINE,
        core: true,
        university: null,
        outcomes: peer?.outcomes || [],
        labwork: peer?.labwork || '',
        sections: [sectionId],
        topics: existing.map(t => t.id),
        updatedAt: new Date().toISOString(),
      },
    },
    { upsert: true },
  )
  courses++
  console.log(`${code}: linked ${existing.length} existing topics + COS course row ("${peer?.title || code}")`)
}

console.log(`done: courses=${courses} sections=${sections} topics=${topics}`)
await client.close()
