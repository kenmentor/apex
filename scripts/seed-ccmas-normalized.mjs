// Stage 2: normalize CCMAS *.json (data-raw/ccmas/) into atomic collections.
//
//   curriculum_courses  (metadata + outcomes + labwork + section/topic ID lists)
//   curriculum_sections (own docs, immutable IDs, parent courseCode)
//   curriculum_topics   (own docs, immutable IDs, parent sectionId + courseCode)
//
// Rules honored: reference-never-embed, IDs are forever (deterministic slugs),
// no deletes (upsert only). Re-runnable against any DB via MONGODB_URI,
// so the exact same script seeds staging and production.
//
// Multi-discipline: loops over every data-raw/ccmas/*.json (computing, sciences,
// ...). Shared courses (MTH 101, PHY 101, COS 101, GST 111, ...) resolve to the
// SAME global atom IDs across disciplines; sections/topics accumulate
// programmes[] + disciplines[] via $addToSet. Course-links stay per
// {code, level, programmeCode} so each programme keeps its own metadata row.
// Detail lookup is global: a table row in one discipline can use the detail
// block from another (e.g. Sciences COS 202 <- Computing COS 202).
import { MongoClient } from 'mongodb'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz'
const SRC_DIR = join(__dirname, '..', '..', 'data-raw', 'ccmas')

const slug = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')

// Programme short codes (dominant table prefix per programme).
const PROG_CODES = {
  // Computing (existing)
  'Computer Science': 'COS',
  'Cybersecurity': 'CYB',
  'Data Science': 'DTS',
  'Information and Communication': 'ICT',
  'Information and Communication Technology': 'ICT',
  'Information Systems': 'INS',
  'Information Technology': 'IFT',
  'Software Engineering': 'SEN',
  // Sciences
  'Applied Geophysics': 'GPH',
  'Biochemistry': 'BCH',
  'Biology': 'BIO',
  'Biotechnology': 'BTG',
  'Botany': 'BOT',
  'Brewing Science and Technology': 'BST',
  'Chemistry': 'CHM',
  'Environmental Management and Toxicology': 'EMT',
  'Forensic Science': 'FRS',
  'Geology': 'GEY',
  'Industrial Chemistry': 'ICH',
  'Industrial Mathematics': 'IMT',
  'Industrial Physics': 'IPH',
  'Marine Science': 'MSE',
  'Maritime Science': 'MTS',
  'Mathematics': 'MTH',
  'Medical Physics': 'MPH',
  'Medicinal Chemistry': 'MCM',
  'Meteorology': 'MET',
  'Microbiology': 'MCB',
  'Petroleum Chemistry': 'PCM',
  'Physics with Electronics': 'PHE',
  'Physics': 'PHY',
  'Science Laboratory Technology': 'SLT',
  'Statistics': 'STA',
  'Zoology': 'ZOO',
  // Engineering and Technology
  'Aerospace Engineering': 'AAE',
  'Agricultural and Biosystems Engineering': 'ABE',
  'Automotive Engineering': 'TAE',
  'Biomedical Engineering': 'BME',
  'Chemical Engineering': 'TCH',
  'Civil Engineering': 'CEE',
  'Computer Engineering': 'CPE',
  'Electrical Engineering': 'TEL',
  'Electronic Engineering': 'ELE',
  'Electrical and Electronic Engineering': 'EEE',
  'Environmental Engineering': 'EVE',
  'Food Engineering': 'FDE',
  'Food Science and Technology': 'FST',
  'Information and Communication Engineering': 'ICE',
  'Industrial and Production Engineering': 'IPE',
  'Marine and Offshore Engineering': 'MAR',
  'Materials and Metallurgical Engineering': 'MME',
  'Mineral Processing and Chemical Metallurgical Engineering': 'MPE',
  'Mechanical Engineering': 'MEE',
  'Mechatronics Engineering': 'MCE',
  'Metallurgical Engineering': 'MTE',
  'Materials Engineering': 'MAT',
  'Mining Engineering': 'MNE',
  'Natural Gas Engineering': 'GNG',
  'Nuclear Engineering': 'NUE',
  'Petrochemical Engineering': 'PCE',
  'Petroleum and Gas Engineering': 'PGE',
  'Petroleum Engineering': 'PEE',
  'Railway Engineering': 'RAE',
  'Structural Engineering': 'STE',
  'Systems Engineering': 'SSG',
  'Telecommunications Engineering': 'TEE',
  'Water Resources Engineering': 'WRE',
  'Wood Products Engineering': 'WPE',
  // Environmental Sciences
  'Building': 'BUD',
  'Clothing and Textile Design': 'CLT',
  'Environmental Management': 'EVM',
  'ENVIRONMENTAL STANDARDS': 'ENS',
  'Estate management': 'ESM',
  'Fashion design': 'FAD',
  'Fine and Applied Arts': 'FAA',
  'Geography': 'GEO',
  'Industrial design': 'IND',
  'Quantity Surveying': 'QTS',
  'Surveying and Geoinformatics': 'SVG',
  'Urban and Regional Planning': 'URP',
  // Agriculture (official Table 1 codes; FAA/FST intentionally shared with
  // Environmental/Engineering — disciplines[] disambiguates)
  'Agribusiness': 'AGB',
  'Agricultural Science': 'AGR',
  'Agricultural Economics': 'AGE',
  'Agricultural Extension': 'AGX',
  'Animal Science': 'ANS',
  'Crop Science': 'CPS',
  'Family and Consumer Sciences': 'FCS',
  'Fisheries and Aquaculture': 'FAA',
  'Food Science and Technology': 'FST',
  'Forest Resources and Wildlife Management': 'FWM',
  'Horticulture and Landscape Management': 'HLM',
  'Soil Science': 'SOS',
  'Water Resources Management and Agro-Meteorology': 'WMA',
  // Allied Health Sciences (p23 abbreviations; SLT shared with Sciences —
  // disciplines[] disambiguates, same as FAA/FST)
  'Audiology': 'AUD',
  'Complementary and Alternative Medicine': 'CAM',
  'Dental Technology': 'DNT',
  'Dental Therapy': 'DTH',
  'Environmental Health Science': 'EHS',
  'Health Care Administration and Hospital Management': 'HAM',
  'Health Information Management': 'HIM',
  'Information Technology and Health Informatics': 'ITH',
  'Medical Laboratory Science': 'MLS',
  'Nursing Science': 'NSC',
  'Human Nutrition and Dietetics': 'NUT',
  'Occupational Therapy': 'OPT',
  'Pharmacology': 'PST',
  'Prosthetics and Orthotics': 'POT',
  'Public Health': 'PHS',
  'Radiography': 'RAD',
  'Speech-Language Therapy': 'SLT',
  // Architecture
  'Architecture': 'ARC',
  'Architectural Technology': 'ATE',
  'Furniture Design': 'FUD',
  'Interior Architecture and Design': 'IAD',
  'Landscape Architecture': 'LAA',
  'Naval Architecture': 'NARC',
  // Arts (FAC = shared Faculty of Arts courses)
  'Arabic': 'ARA',
  'Archaeology': 'ARC',
  'African Tradition Religion': 'ATR',
  'Chinese Studies': 'CHS',
  'Christian Religious Studies': 'CRS',
  'Christian Theology': 'CTH',
  'Classics': 'CLC',
  'Efik': 'EFK',
  'English Language and Literature': 'LIT',
  'Film Production': 'FIP',
  'Folklore Studies': 'FLS',
  'Hausa': 'HAU',
  'History/History and Diplomatic Studies': 'HIS',
  'Ibibio': 'IBI',
  'Igbo': 'IGB',
  'Islamic Studies': 'ISS',
  'Linguistics': 'LIN',
  'Modern European Languages': 'MEL',
  'Modern European Languages B.A': 'MEL',
  'Modern European Languages': 'MEL',
  'Modern European Languages (Russian)': 'RUS',
  'Music': 'MUS',
  'Philosophy': 'PHL',
  'Religious Studies': 'REL',
  'Shariah': 'SHA',
  'Sharīcah': 'SHA',
  'Theatre Arts': 'THA',
  'Yoruba': 'YOU',
  'Yorùbá': 'YOU',
  // Basic Medical Sciences
  'Human Anatomy': 'ANA',
  'Physiology': 'PIO',
  // Education
  'Adult and Continuing Education': 'EAE',
  'Agricultural Education': 'AGE',
  'Arabic': 'ARA',
  'Biology': 'BIO',
  'Business Education': 'BUE',
  'Chemistry': 'CHM',
  'Christian Religious Studies': 'CRS',
  'Computer Science': 'COS',
  'Creative Arts Education': 'CAE',
  'Early Childhood Education': 'ECE',
  'Economics': 'ECO',
  'Educational Management': 'EDM',
  'Efik-Ibibio Education': 'EDI',
  'English Language/Literature': 'ENG',
  'Entreprenuership Education': 'EPE',
  'Environmental Education': 'EDE',
  'French': 'FRE',
  'Geography': 'GEO',
  'Guidance and Counselling': 'GCE',
  'Hausa': 'HAU',
  'History': 'HIS',
  'Home Economics': 'EHO',
  'Human Kinetics/Physical Education': 'HKE',
  'Igbo': 'IGB',
  'Integrated Science': 'EIS',
  'Islamic Studies': 'ISS',
  'Language Arts and Communication': 'CLA',
  'Library and Information Science': 'LIS',
  'Mathematics': 'MTH',
  'Music': 'MUS',
  'Physics': 'PHY',
  'Political Science': 'POL',
  'Primary Education': 'PED',
  'Social Studies and Civic Education': 'ESS',
  'Special Needs Education': 'ESP',
  'Sustainable Development Studies': 'SDS',
  'Technology Education': 'ITE',
  'Educational Technology': 'ETE',
  // Law
  'Law': 'LAW',
  'Common and Islamic Law Combined': 'ICL',
  // Medicine and Dentistry
  'Medicine and Surgery (MBBS/MBChB)': 'MBBS',
  'Dental Surgery (BDS/BChD)': 'BDS',
  // Pharmacy
  'Pharmacy (B.Pharm)': 'PHB',
  'Pharmacy (Pharm.D)': 'PHD',
  // Veterinary Medicine
  'Veterinary Medicine (DVM)': 'DVM',
  // Social Sciences (SSC = shared faculty courses)
  'Criminology and Security Studies': 'CSS',
  'Demography and Social Statistics': 'DSS',
  'Development Studies': 'DES',
  'Economics': 'ECO',
  'International Relations': 'IRS',
  'Peace Studies and Conflict Resolution': 'PCR',
  'Petroleum Economics and Policy Studies': 'PEP',
  'Political Science': 'POL',
  'Politics, Philosophy and Economics (PPE)': 'PPE',
  'Psychology': 'PSY',
  'Social Standards': 'SST',
  'Social Work': 'SWK',
  'Sociology': 'SOC',
  'Yorùbá': 'YOE',
  // Communication and Media Studies (CMS = shared faculty courses)
  'Advertising': 'ADV',
  'Broadcasting': 'BCJ',
  'Development Communication Studies': 'DCS',
  'Film & Multimedia': 'FMM',
  'Information and Media Studies': 'ISM',
  'Journalism and Media Studies': 'JMS',
  'Mass Communication': 'MCM',
  'Public Relations': 'PRS',
  'Strategic Communication': 'STC',
}

// Known document typos: alias detail blocks onto their table codes.
const DETAIL_ALIASES = {
  'DTS 322': 'DST 322', // computing doc typo (detail filed under DST 322)
}

function splitTopics(contents) {
  // No cap: every CCMAS sentence is a topic. Fidelity over brevity.
  return String(contents || '')
    .split(/(?<=[.;])\s+|\n+/)
    .map(s => s.trim().replace(/\s+/g, ' '))
    .filter(s => s.length > 3 && !/^this course is\b/i.test(s))
}

function progCodeFor(name) {
  if (PROG_CODES[name]) return PROG_CODES[name]
  const words = String(name || '').replace(/^B\.Sc\.\s+/i, '').split(' ').filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase()
  return words.map(w => w[0]).join('').slice(0, 4).toUpperCase()
}

async function main() {
  const files = readdirSync(SRC_DIR).filter(f => f.endsWith('.json')).sort()
  if (!files.length) throw new Error(`no CCMAS json found in ${SRC_DIR}`)
  const datasets = files.map(f => ({
    file: f,
    data: JSON.parse(readFileSync(join(SRC_DIR, f), 'utf-8')),
  }))

  // Global detail index across ALL disciplines (shared-course resolution).
  // Consensus-wins: service courses (GST, ENT, MTH, ...) repeat near-identical
  // blocks under every programme section; the most FREQUENT identical block
  // wins. This rejects polluted outliers (a block that absorbed a neighbour's
  // outcomes is unique, never the consensus). Tie-break: most topics, then
  // first seen. Deterministic and stable across re-runs and new disciplines.
  // NOTE: keep in sync with scripts/verify-ccmas.mjs (same rule).
  const topicCount = (d) => String(d.contents || '').split(/(?<=[.;])\s+|\n+/)
    .map(s => s.trim()).filter(s => s.length > 3).length
  const blockKey = (d) => String(d.contents || '').toLowerCase().replace(/\s+/g, ' ').trim()
    + '||' + (d.outcomes || []).join('||').toLowerCase().replace(/\s+/g, ' ').trim()
  const grouped = new Map()
  for (const { data } of datasets) {
    for (const d of data.course_details || []) {
      if (!grouped.has(d.code)) grouped.set(d.code, [])
      grouped.get(d.code).push(d)
    }
  }
  const detailsByCode = new Map()
  for (const [code, variants] of grouped) {
    const freq = new Map()
    for (const v of variants) freq.set(blockKey(v), (freq.get(blockKey(v)) || 0) + 1)
    let best = variants[0]
    let bestScore = [-1, -1]
    for (const v of variants) {
      const s = [freq.get(blockKey(v)), topicCount(v)]
      if (s[0] > bestScore[0] || (s[0] === bestScore[0] && s[1] > bestScore[1])) { best = v; bestScore = s }
    }
    detailsByCode.set(code, best)
  }
  // Apply known aliases so table codes resolve even when the detail block
  // was filed under a typo code.
  for (const [canonical, alias] of Object.entries(DETAIL_ALIASES)) {
    if (!detailsByCode.has(canonical) && detailsByCode.has(alias)) {
      detailsByCode.set(canonical, detailsByCode.get(alias))
    }
  }

  const c = new MongoClient(URI, { connectTimeoutMS: 15000, serverSelectionTimeoutMS: 15000 })
  await c.connect()
  const db = c.db()
  console.log('DB:', db.databaseName)

  // Indexes for the upsert filters below (idempotent). Without these the
  // ladder phase degrades into collection scans as the DB grows department
  // by department.
  // Keys widened to name+discipline / code+level+programme+discipline when
  // same-named programmes met across disciplines (Food Science and
  // Technology). Drop superseded unique indexes first (ignore if absent).
  for (const [col, name] of [['programmes', 'name_1'], ['curriculum_courses', 'code_1_level_1_programmeCode_1']]) {
    try { await db.collection(col).dropIndex(name) } catch { /* already gone */ }
  }
  await Promise.all([
    db.collection('disciplines').createIndex({ code: 1 }, { unique: true }),
    db.collection('programmes').createIndex({ name: 1, disciplineCode: 1 }, { unique: true }),
    db.collection('curriculum_courses').createIndex({ code: 1, level: 1, programmeCode: 1, disciplineCode: 1 }, { unique: true }),
    db.collection('curriculum_sections').createIndex({ id: 1 }, { unique: true }),
    db.collection('curriculum_topics').createIndex({ id: 1 }, { unique: true }),
    db.collection('topic_activities').createIndex({ courseCode: 1, topicId: 1, kind: 1, origin: 1, auto: 1 }),
  ])

  let nCourses = 0, nSections = 0, nTopics = 0, nProgs = 0

  // Batched writes: tens of thousands of topic/ladder upserts would take
  // many minutes as individual round-trips; bulkWrite keeps re-runs fast.
  const sectionOps = [], topicOps = [], courseOps = []
  const validCourses = new Set()
  const validProgrammes = new Set()
  async function flush(col, ops) {
    if (!ops.length) return 0
    const res = await db.collection(col).bulkWrite(ops.splice(0, ops.length), { ordered: false })
    return (res.upsertedCount || 0) + (res.modifiedCount || 0) + (res.matchedCount || 0)
  }
  async function flushAll() {
    await flush('curriculum_sections', sectionOps)
    await flush('curriculum_topics', topicOps)
    await flush('curriculum_courses', courseOps)
  }

  for (const { file, data } of datasets) {
    const discipline = data.discipline || file.replace(/\.json$/, '')
    await db.collection('disciplines').updateOne(
      { code: discipline },
      { $set: { code: discipline, title: discipline, source: data.source, updatedAt: new Date().toISOString() } },
      { upsert: true }
    )

    for (const prog of data.programmes || []) {
      const progCode = progCodeFor(prog.name)
      // Keyed by name+discipline: 'Food Science and Technology' exists in
      // both Engineering and Agriculture with different courses.
      await db.collection('programmes').updateOne(
        { name: prog.name, disciplineCode: discipline },
        { $set: { name: prog.name, code: progCode, disciplineCode: discipline, overview: prog.overview || '', philosophy: prog.philosophy || '', objectives: prog.objectives || [], updatedAt: new Date().toISOString() } },
        { upsert: true }
      )
      validProgrammes.add(`${prog.name}|||${discipline}`)
      nProgs += 1

      for (const [level, tab] of Object.entries(prog.levels || {})) {
        const levelLabel = `${level} Level`;
        for (const row of tab.courses || []) {
          const code = row.code
          const det = detailsByCode.get(code)
            || (prog.courseDetails || []).find(x => x.code === code)
          const sem = null // CCMAS tables carry no semester; universities set per session
          const sections = [{ id: `${slug(code)}-S1`, title: 'Course Contents', order: 0 }]
          const topics = splitTopics(det ? det.contents : '').map((t, i) => ({
            id: `${slug(code)}-S1-T${i + 1}`, sectionId: `${slug(code)}-S1`, title: t, order: i,
          }))

          sectionOps.push({
            updateOne: {
              filter: { id: sections[0].id },
              update: {
                $set: { ...sections[0], courseCode: code, level: levelLabel, origin: 'core', updatedAt: new Date().toISOString() },
                $addToSet: { programmes: progCode, disciplines: discipline },
              },
              upsert: true,
            },
          })
          nSections += 1

          for (const t of topics) {
            topicOps.push({
              updateOne: {
                filter: { id: t.id },
                update: {
                  $set: { ...t, courseCode: code, level: levelLabel, origin: 'core', updatedAt: new Date().toISOString() },
                  $addToSet: { programmes: progCode, disciplines: discipline },
                },
                upsert: true,
              },
            })
            nTopics += 1
          }

          validCourses.add(`${code}|||${levelLabel}|||${progCode}|||${discipline}`)
          courseOps.push({
            updateOne: {
              filter: { code, level: levelLabel, programmeCode: progCode, disciplineCode: discipline },
              update: {
                $set: {
                  code, title: row.title || (det ? det.title : code),
                  units: row.units ?? (det ? det.units : null),
                  status: row.status || (det ? det.status : null),
                  LH: row.LH ?? (det ? det.LH : null), PH: row.PH ?? (det ? det.PH : null),
                  semester: sem, level: levelLabel, programmeCode: progCode, disciplineCode: discipline,
                  core: true, university: null,
                  outcomes: det ? det.outcomes || [] : [],
                  labwork: det ? det.lab || '' : '',
                  sections: sections.map(s => s.id), topics: topics.map(t => t.id),
                  updatedAt: new Date().toISOString(),
                },
              },
              upsert: true,
            },
          })
          nCourses += 1
          if (sectionOps.length + topicOps.length + courseOps.length >= 1500) await flushAll()
        }
      }
      await flushAll()
    }
  }
  await flushAll()

  // Reconcile: extraction improvements across runs can orphan docs from
  // older runs — e.g. a course row that moved level. Valid course links are
  // exactly what the current sources emit; ccmas-managed docs (those with a
  // programmeCode) outside that set are stale. Topics/sections/ladder pinned
  // only by surviving course docs are collected too. University/official
  // content (university != null, origin != 'core') and legacy docs without a
  // programmeCode are never deleted.
  const staleCourseIds = []
  for (const c of await db.collection('curriculum_courses').find({ programmeCode: { $exists: true }, university: null }).project({ code: 1, level: 1, programmeCode: 1, disciplineCode: 1 }).toArray()) {
    if (!validCourses.has(`${c.code}|||${c.level}|||${c.programmeCode}|||${c.disciplineCode}`)) staleCourseIds.push(c._id)
  }
  let gcC = { deletedCount: 0 }
  if (staleCourseIds.length) gcC = await db.collection('curriculum_courses').deleteMany({ _id: { $in: staleCourseIds } })
  // Stale programme docs: renamed programmes ('Information and Communication'
  // -> '... Technology'). Only docs with a name field are managed here, so
  // legacy nameless docs are preserved.
  const staleProgIds = []
  for (const p of await db.collection('programmes').find({ name: { $exists: true } }).project({ name: 1, disciplineCode: 1 }).toArray()) {
    if (!validProgrammes.has(`${p.name}|||${p.disciplineCode}`)) staleProgIds.push(p._id)
  }
  let gcP = { deletedCount: 0 }
  if (staleProgIds.length) gcP = await db.collection('programmes').deleteMany({ _id: { $in: staleProgIds } })
  const refTopics = new Set()
  const refSections = new Set()
  for (const c of await db.collection('curriculum_courses').find({}).project({ topics: 1, sections: 1 }).toArray()) {
    for (const t of c.topics || []) refTopics.add(t)
    for (const s of c.sections || []) refSections.add(s)
  }
  const gcT = await db.collection('curriculum_topics').deleteMany({ origin: 'core', id: { $nin: [...refTopics] } })
  const gcS = await db.collection('curriculum_sections').deleteMany({ origin: 'core', id: { $nin: [...refSections] } })
  const gcA = await db.collection('topic_activities').deleteMany({ origin: 'core', auto: true, topicId: { $nin: [...refTopics] } })
  if (gcC.deletedCount + gcP.deletedCount + gcT.deletedCount + gcS.deletedCount + gcA.deletedCount > 0) {
    console.log(`reconciled: removed ${gcC.deletedCount} stale course-links, ${gcP.deletedCount} stale programmes, ${gcT.deletedCount} stale topics, ${gcS.deletedCount} stale sections, ${gcA.deletedCount} stale ladder slots.`)
  }

  // Programmes that share common 100-level courses reference the same atoms:
  // nothing extra to do — IDs are global, links resolve regardless of programme
  // or discipline (programmes[]/disciplines[] accumulate via $addToSet).
  // Standard ladder per topic (auto-generated placeholders officials enrich later).
  // $setOnInsert keyed with auto:true so real content never collides.
  let nActs = 0
  const ladderOps = []
  const allTopics = await db.collection('curriculum_topics').find({}).toArray()
  for (const t of allTopics) {
    const ladder = [
      { kind: 'learn', title: `Read: ${t.title}`, payload: {}, order: 0 },
      { kind: 'drill', title: `Drill: ${t.title}`, payload: {}, order: 1 },
      { kind: 'prove', title: `Prove: ${t.title}`, payload: { passMark: 80 }, order: 2 },
    ]
    for (const a of ladder) {
      ladderOps.push({
        updateOne: {
          filter: { courseCode: t.courseCode, topicId: t.id, kind: a.kind, origin: 'core', auto: true },
          update: { $setOnInsert: { ...a, courseCode: t.courseCode, topicId: t.id, origin: 'core', status: 'approved', auto: true, createdBy: 'seed', updatedAt: new Date().toISOString() } },
          upsert: true,
        },
      })
      nActs += 1
      if (ladderOps.length >= 2000) {
        await db.collection('topic_activities').bulkWrite(ladderOps.splice(0, ladderOps.length), { ordered: false })
      }
    }
  }
  if (ladderOps.length) await db.collection('topic_activities').bulkWrite(ladderOps.splice(0, ladderOps.length), { ordered: false })

  console.log(`normalized: ${datasets.length} disciplines, ${nProgs} programme-links, ${nCourses} course-links, ${nSections} sections, ${nTopics} topics, ${nActs} ladder slots.`)
  console.log('Note: semester is null (CCMAS tables carry no semester) — set per university session.');
  await c.close()
}

main().catch(e => { console.error('seed-ccmas-normalized failed:', e.message); process.exit(1) })
