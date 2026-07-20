import 'dotenv/config'
import { MongoClient } from 'mongodb'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz'

const COURSES = [
  {
    code: 'PHY 102', title: 'General Physics II', icon: 'P', color: '#c0392b',
    dept: { code: 'PHY', title: 'Physics', color: '#c0392b' },
    file: 'phy102.json', theory: 'phy102-theory.json',
  },
  {
    code: 'CSC 162', title: 'Electronics & Computer Hardware', icon: 'E', color: '#2980b9',
    dept: { code: 'CSC', title: 'Computer Science', color: '#1a5276' },
    file: 'csc162.json', theory: 'csc162-theory.json',
  },
  {
    code: 'CSC 102', title: 'Introduction to Problem Solving', icon: 'P', color: '#8e44ad',
    dept: { code: 'CSC', title: 'Computer Science', color: '#1a5276' },
    file: 'csc102.json', theory: 'csc102-theory.json',
  },
  {
    code: 'CSC 182', title: 'Computer Lab 1B (C++)', icon: 'C', color: '#16a085',
    dept: { code: 'CSC', title: 'Computer Science', color: '#1a5276' },
    file: 'csc182.json', theory: 'csc182-theory.json',
  },
  {
    code: 'GSS 112', title: 'Nigerian People, Culture & Citizenship', icon: 'N', color: '#2ecc71',
    dept: { code: 'GSS', title: 'General Studies', color: '#27ae60' },
    file: 'gss112.json', theory: 'gss112-theory.json',
  },
  {
    code: 'BCM 242', title: 'Carbohydrate Metabolism', icon: 'C', color: '#e74c3c',
    dept: { code: 'BCM', title: 'Biochemistry', color: '#e74c3c' },
    file: 'bcm242.json', theory: 'bcm242-theory.json',
  },
  {
    code: 'CSC 203', title: 'Discrete Structure', icon: 'Δ', color: '#8e44ad',
    dept: { code: 'CSC', title: 'Computer Science', color: '#1a5276' },
    file: 'csc203.json', theory: 'csc203-theory.json',
  },
]

async function seedCourse(db, course) {
  console.log(`\n=== ${course.code}: ${course.title} ===`)

  const data = JSON.parse(readFileSync(join(__dirname, '..', course.file), 'utf-8'))
  let theory = []
  try { theory = JSON.parse(readFileSync(join(__dirname, course.theory), 'utf-8')) } catch { }

  // Department
  await db.collection('departments').updateOne(
    { code: course.dept.code },
    { $set: course.dept },
    { upsert: true }
  )

  // Course
  await db.collection('courses').updateOne(
    { code: course.code },
    { $set: { code: course.code, title: course.title, description: data.study_guide_title || '', icon: course.icon, color: course.color } },
    { upsert: true }
  )

  // Curriculum
  const level = '100 Level'
  const curr = await db.collection('curriculum').findOne({ department_code: course.dept.code, level })
  if (curr) {
    if (!curr.course_codes.includes(course.code)) {
      await db.collection('curriculum').updateOne({ _id: curr._id }, { $push: { course_codes: course.code } })
    }
  } else {
    await db.collection('curriculum').insertOne({ department_code: course.dept.code, level, course_codes: [course.code] })
  }

  // Category
  await db.collection('categories').updateOne(
    { code: course.dept.code },
    { $set: { code: course.dept.code, title: course.dept.title, color: course.dept.color } },
    { upsert: true }
  )
  const count = await db.collection('courses').countDocuments({ code: new RegExp('^' + course.dept.code) })
  await db.collection('categories').updateOne({ code: course.dept.code }, { $set: { courseCount: count } })

  // MCQs
  const existing = await db.collection('questions').countDocuments({ courseCode: course.code })
  if (existing > 0) {
    console.log(`  Deleting ${existing} existing MCQs...`)
    await db.collection('questions').deleteMany({ courseCode: course.code })
  }
  const docs = []
  for (const section of data.sections) {
    for (const q of section.questions) {
      docs.push({
        courseCode: course.code, section: section.section_title,
        id: q.id, question: q.question, options: q.options,
        correctAnswer: q.correct_answer, explanation: q.explanation || '',
        ...(q.code ? { code: q.code } : {}),
      })
    }
  }
  if (docs.length) await db.collection('questions').insertMany(docs)
  console.log(`  ${docs.length} MCQs inserted`)

  // Theory references
  if (theory.length > 0) {
    await db.collection('theory_references').deleteMany({ courseCode: course.code })
    for (const ref of theory) {
      await db.collection('theory_references').insertOne({ ...ref, createdAt: new Date().toISOString() })
    }
    console.log(`  ${theory.length} theory references inserted`)
  }
}

async function main() {
  const client = new MongoClient(URI, { connectTimeoutMS: 10000, serverSelectionTimeoutMS: 10000 })
  await client.connect()
  const db = client.db()
  console.log('Connected to MongoDB.')

  for (const course of COURSES) {
    await seedCourse(db, course)
  }

  await client.close()
  console.log('\nAll courses seeded successfully!')
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1) })
