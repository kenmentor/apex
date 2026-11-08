import { NextResponse } from 'next/server'
import { getCollection, getDB } from '@/lib/db'
import { loadPilotPlan, planProgress as legacyProgress, MASTERY_BAR } from '@/lib/plan'
import { mergeActivities } from '@/lib/curriculum'

// Maps stored department names to CCMAS programme codes.
// Covers every department in src/lib/departments.js plus legacy free-text
// values already saved on user profiles (e.g. "Biochemistry",
// "Medicine and Surgery (MBBS/MBChB) (MBBS)").
const DEPT_TO_PROG = {
  'computer science': 'COS',
  'software engineering': 'SEN',
  'information technology': 'IFT',
  'cybersecurity': 'CYB',
  'data science': 'DTS',
  'information systems': 'INS',
  mathematics: 'MTH',
  statistics: 'STA',
  physics: 'PHY',
  chemistry: 'CHM',
  biology: 'BIO',
  // Basic / medical sciences — previously missing, so Anatomy/Biochemistry
  // users fell through to the legacy COS pilot plan.
  anatomy: 'ANA',
  'human anatomy': 'ANA',
  biochemistry: 'BCH',
  microbiology: 'MCB',
  'medical laboratory science': 'MLS',
  'medical laboratory technology': 'MLS',
  'science laboratory technology': 'SLT',
  physiology: 'PIO',
  medicine: 'MBBS',
  'medicine and surgery': 'MBBS',
  'medicine and surgery (mbbs/mbchb)': 'MBBS',
  mbbs: 'MBBS',
  'nursing': 'NSC',
  'nursing science': 'NSC',
  // DB codes are PHB/PHD (B.Pharm / Pharm.D) — PHA has zero courses.
  pharmacy: 'PHB',
  pharmacology: 'PST',
  physiotherapy: 'PHS',
  'public health': 'PHS',
  'public health science': 'PHS',
  radiography: 'RAD',
  'radiography and radiological science': 'RAD',
  philosophy: 'PHL',
  // Engineering — explicit rows because "(Electrical)"-style suffixes must
  // NOT be parsed as codes (old paren regex turned them into ELECT/MECHA).
  'engineering (electrical)': 'EEE',
  'engineering (mechanical)': 'MEE',
  'engineering (civil)': 'CEE',
  'engineering (chemical)': 'TCH',
  'electrical engineering': 'EEE',
  'electrical and electronic engineering': 'EEE',
  'mechanical engineering': 'MEE',
  'civil engineering': 'CEE',
  'chemical engineering': 'TCH',
  // Arts / social / management — verified against programmes collection.
  economics: 'ECO',
  'mass communication': 'MCM',
  'political science': 'POL',
  law: 'LAW',
  'english language': 'ENG',
  history: 'HIS',
  psychology: 'PSY',
  sociology: 'SOC',
  architecture: 'ARC',
  'estate management': 'ESM',
  geography: 'GEO',
  geology: 'GEY',
  'marine science': 'MSE',
  'environmental science': 'ENS',
  'fine arts': 'FAA',
  'fine and applied arts': 'FAA',
  'performing arts': 'THA',
  'theatre arts': 'THA',
  'library science': 'LIS',
  'library and information science': 'LIS',
  'international relations': 'IRS',
  criminology: 'CSS',
  'criminology and security studies': 'CSS',
  'forensic science': 'FRS',
  'food science & technology': 'FST',
  'food science and technology': 'FST',
  'human kinetics': 'HKE',
  'human kinetics/physical education': 'HKE',
  'social work': 'SWK',
  agriculture: 'AGR',
  'agricultural science': 'AGR',
  // No exact CCMAS match — intentionally unmapped so callers fall back to
  // level-scoped browsing + legacy plan instead of a wrong programme:
  // 'business administration', 'accounting', 'education', 'public administration'.
}

function programmeFor(user) {
  const dept = (user?.department || '').trim()
  if (!dept) return null
  // Label formats that carry an explicit code: "Mathematics (MTH)" or
  // "Mathematics (MTH · Sciences)" → MTH. Uppercase-only so
  // "Engineering (Electrical)" does NOT parse as a code.
  const paren = dept.match(/\(([A-Z]{2,5})\b[^)]*\)\s*$/)
  if (paren) return paren[1].toUpperCase()
  const lower = dept.toLowerCase().replace(/\s+/g, ' ')
  if (DEPT_TO_PROG[lower]) return DEPT_TO_PROG[lower]
  // Fuzzy fallback for variants ("Anatomy", "Human Anatomy", "Biochem",
  // "Med Lab Science", "Medicine and Surgery ...", ...).
  if (lower.includes('anatom')) return 'ANA'
  if (lower.includes('biochem')) return 'BCH'
  if (lower.includes('microbio')) return 'MCB'
  if (lower.includes('medical lab') || lower === 'mls') return 'MLS'
  if (lower.includes('physiolog') && !lower.includes('physiother')) return 'PIO'
  if (lower.includes('nurs')) return 'NSC'
  if (lower.includes('mbbs') || lower.includes('medicine')) return 'MBBS'
  if (lower.includes('pharmacol')) return 'PST'
  if (lower.includes('pharm')) return 'PHB'
  if (lower.includes('physiother')) return 'PHS'
  if (lower.includes('radiograph')) return 'RAD'
  if (lower.includes('public health')) return 'PHS'
  if (lower.includes('human kinetics') || lower === 'hke') return 'HKE'
  if (lower.includes('forensic')) return 'FRS'
  if (lower.includes('criminology')) return 'CSS'
  if (lower.includes('food science')) return 'FST'
  if (lower.includes('social work')) return 'SWK'
  if (lower.includes('international relations')) return 'IRS'
  if (lower.includes('mass communication')) return 'MCM'
  if (lower.includes('estate management')) return 'ESM'
  if (lower.includes('marine science')) return 'MSE'
  if (/\belectrical\b/.test(lower) && lower.includes('engineer')) return 'EEE'
  if (/\bmechanical\b/.test(lower) && lower.includes('engineer')) return 'MEE'
  if (/\bcivil\b/.test(lower) && lower.includes('engineer')) return 'CEE'
  if (/\bchemical\b/.test(lower) && lower.includes('engineer')) return 'TCH'
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
