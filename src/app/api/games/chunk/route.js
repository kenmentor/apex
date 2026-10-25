import { NextResponse } from 'next/server'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getCollection } from '@/lib/db'

// Rule-based chunk source: real definitional text (question explanations)
// from Mongo, falling back to the hand-quality banks in data/courses/.
// The client splits text into pieces with chunkText() and scores with
// scoreOrder(); this route only picks something worth reading.
function normalizeCourse(code) {
  return (code || '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/^([A-Z]+)(\d+)$/, '$1 $2')
}

function sentences(text) {
  return String(text || '')
    .split(/(?<=[.!?;])\s+|\n+/)
    .map(s => s.trim())
    .filter(Boolean)
}

function shorten(s, n = 70) {
  const t = String(s || '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t
}

async function fromMongo(course) {
  try {
    const col = await getCollection('questions')
    const match = course ? { courseCode: { $in: [course, course.replace(/\s+/g, '')] } } : {}
    const cands = await col.aggregate([
      { $match: { ...match, explanation: { $exists: true, $ne: '' } } },
      { $sample: { size: 8 } },
    ]).maxTimeMS(3000).toArray()
    for (const d of cands) {
      if (sentences(d.explanation).length >= 3) return d
    }
    return null
  } catch {
    return null
  }
}

function fromBanks(course) {
  try {
    const dir = join(process.cwd(), 'data', 'courses')
    const files = readdirSync(dir).filter(f => f.endsWith('.json'))
    const wanted = course ? course.replace(/\s+/g, '').toLowerCase() : null
    const targets = wanted
      ? files.filter(f => f.replace(/\.json$/, '').toLowerCase() === wanted)
      : [...files].sort(() => Math.random() - 0.5)
    for (const f of targets) {
      const bank = JSON.parse(readFileSync(join(dir, f), 'utf-8'))
      const pool = []
      for (const s of bank.sections || []) {
        for (const q of s.questions || []) {
          if (q.explanation && sentences(q.explanation).length >= 3) {
            pool.push({ ...q, _course: bank.course_code })
          }
        }
      }
      if (pool.length) return pool[Math.floor(Math.random() * pool.length)]
    }
    return null
  } catch {
    return null
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const rawCourse = (searchParams.get('course') || '').trim()
    const course = rawCourse ? normalizeCourse(rawCourse) : ''

    let doc = await fromMongo(course)
    let source = 'mongo'
    if (!doc) {
      const bank = fromBanks(course)
      if (bank) {
        doc = {
          courseCode: bank._course || course || 'GSS 212',
          id: bank.id,
          question: bank.question,
          explanation: bank.explanation,
          section: bank.section_title || bank.section,
        }
        source = 'bank'
      }
    }
    if (!doc) return NextResponse.json({ error: 'No chunkable text found' }, { status: 404 })

    const courseCode = doc.courseCode || course || 'GSS 212'
    return NextResponse.json({
      courseCode,
      topicId: `chunk-${courseCode.replace(/\s+/g, '')}-${doc.id || 'text'}`,
      title: shorten(doc.question || doc.section || 'Definition'),
      text: doc.explanation,
      pieces: sentences(doc.explanation).length,
      source,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Chunk failed: ' + error.message }, { status: 500 })
  }
}
