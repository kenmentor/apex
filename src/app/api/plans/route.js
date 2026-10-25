import { NextResponse } from 'next/server'
import { getCollection, getDB } from '@/lib/db'
import { loadPilotPlan, planProgress as legacyProgress, MASTERY_BAR } from '@/lib/plan'
import { mergeActivities } from '@/lib/curriculum'

// Maps stored department names to CCMAS programme codes.
const DEPT_TO_PROG = {
  'computer science': 'COS',
  'software engineering': 'SEN',
  'information technology': 'IFT',
  'cybersecurity': 'CYB',
  'data science': 'DSC',
  'information systems': 'INS',
  mathematics: 'MTH',
  statistics: 'STA',
  physics: 'PHY',
  chemistry: 'CHM',
  biology: 'BIO',
}

function programmeFor(user) {
  const dept = (user?.department || '').toLowerCase().trim()
  if (!dept) return null
  if (DEPT_TO_PROG[dept]) return DEPT_TO_PROG[dept]
  // Fallback: programme whose name contains the department words.
  return null
}

async function legacyPlan(email) {
  const plan = loadPilotPlan()
  let completions = []
  if (email) {
    const col = await getCollection('completions')
    completions = await col.find({ email: email.toLowerCase().trim() }).toArray()
  }
  const progress = legacyProgress(plan, completions, plan.masteryBar || MASTERY_BAR)
  return NextResponse.json({
    cohort: plan.cohort,
    masteryBar: plan.masteryBar || MASTERY_BAR,
    courses: plan.courses,
    progress,
    supported: true,
    source: 'legacy',
  })
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = (searchParams.get('email') || '').toLowerCase().trim()
    const university = (searchParams.get('university') || '').toUpperCase() || null

    let user = null
    if (email) {
      const users = await getCollection('users')
      user = await users.findOne({ email })
    }
    // Level canonical form is "200 Level" — accept bare "200" too.
    const rawLevel = (user?.level || '200 Level').trim()
    const level = /^\d{3}$/.test(rawLevel) ? `${rawLevel} Level` : rawLevel
    const prog = programmeFor(user)

    const db = await getDB()
    let courses = []
    if (prog) {
      courses = await db.collection('curriculum_courses')
        .find({ programmeCode: prog, level, $or: [{ core: true }, ...(university ? [{ university }] : [])] })
        .sort({ semester: 1, code: 1 })
        .toArray()
    }
    if (!courses.length) return legacyPlan(email)

    const codes = courses.map(c => c.code)
    const [allTopics, allActs] = await Promise.all([
      db.collection('curriculum_topics').find({ courseCode: { $in: codes } }).sort({ order: 1 }).toArray(),
      db.collection('topic_activities').find({ courseCode: { $in: codes } }).toArray(),
    ])
    const topicsByCourse = {}
    for (const t of allTopics) (topicsByCourse[t.courseCode] = topicsByCourse[t.courseCode] || []).push(t)
    const actsByTopic = {}
    for (const a of allActs) {
      const k = `${a.courseCode}::${a.topicId}`
      ;(actsByTopic[k] = actsByTopic[k] || []).push(a)
    }

    let completions = []
    if (email) {
      completions = await db.collection('completions').find({ email }).toArray()
    }

    const outCourses = []
    let totalTopics = 0
    let passedTopics = 0
    for (const c of courses) {
      const topics = (topicsByCourse[c.code] || []).map(t => {
        const acts = mergeActivities(
          (actsByTopic[`${c.code}::${t.id}`] || []).filter(a => (a.origin || 'core') === 'core'),
          university ? (actsByTopic[`${c.code}::${t.id}`] || []).filter(a => a.origin === university) : []
        ).map(a => ({ id: `${a.kind}-${String(a._id)}`.slice(-8), kind: a.kind, title: a.title, passMark: a.kind === 'prove' ? 80 : null }))
        const proves = completions.filter(x => x.topicId === t.id && x.kind === 'prove')
        const best = proves.length ? Math.max(...proves.map(r => r.percentage || 0)) : 0
        const passed = best >= MASTERY_BAR
        totalTopics += 1
        if (passed) passedTopics += 1
        return { id: t.id, title: t.title, items: acts, best, passed }
      })
      outCourses.push({ code: c.code, title: c.title, units: c.units, status: c.status, semester: c.semester, topics })
    }
    return NextResponse.json({
      cohort: { department: user?.department || '', level, programme: prog },
      masteryBar: MASTERY_BAR,
      courses: outCourses,
      progress: {
        topics: totalTopics,
        passed: passedTopics,
        pct: totalTopics ? Math.round((passedTopics / totalTopics) * 100) : 0,
      },
      supported: true,
      source: 'ccmas',
      university,
    })
  } catch (error) {
    return NextResponse.json({ supported: false, waitlist: true, error: error.message }, { status: 500 })
  }
}
