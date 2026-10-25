import { NextResponse } from 'next/server'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { deriveOdd } from '@/lib/games'
import { getCollection } from '@/lib/db'

function findFile(dir, key) {
  if (!existsSync(dir)) return null
  const files = readdirSync(dir).filter(f => f.endsWith('.json'))
  return files.find(f => f.replace(/\.json$/, '').toLowerCase() === key) || null
}

// Rule-based odd-one-out: theory keywords grouped by section — 3 terms
// from one section plus 1 intruder from another. Mongo first, seed-data
// theory file as fallback.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const course = (searchParams.get('course') || '').trim()
    const rounds = Math.max(1, Math.min(15, Number(searchParams.get('rounds')) || 8))
    const seed = searchParams.get('seed') || `odd-${Date.now()}`
    if (!course) return NextResponse.json({ error: 'course required' }, { status: 400 })
    const key = course.replace(/\s+/g, '').toLowerCase()

    const bySection = {}
    const addTerms = (section, keywords) => {
      const name = String(section || 'General').trim()
      bySection[name] = bySection[name] || []
      for (const k of keywords || []) {
        const t = String(k || '').trim()
        if (t.length > 1) bySection[name].push(t)
      }
    }

    try {
      const col = await getCollection('theory_references')
      const docs = await col.find({ courseCode: { $in: [course.toUpperCase(), course.replace(/\s+/g, '').toUpperCase()] } }).toArray()
      for (const d of docs) addTerms(d.section, d.keywords)
    } catch {}

    let sections = Object.entries(bySection).map(([name, terms]) => ({ name, terms }))
    if (sections.filter(s => s.terms.length >= 3).length < 2) {
      const theoryFile = findFile(join(process.cwd(), 'seed-data'), `${key}-theory`)
      if (theoryFile) {
        try {
          const items = JSON.parse(readFileSync(join(process.cwd(), 'seed-data', theoryFile), 'utf-8'))
          if (Array.isArray(items)) {
            for (const t of items) addTerms(t.section, t.keywords)
            sections = Object.entries(bySection).map(([name, terms]) => ({ name, terms }))
          }
        } catch {}
      }
    }

    const sets = deriveOdd(sections, { rounds, seed })
    if (!sets.length) return NextResponse.json({ error: 'Not enough content for odd-one-out' }, { status: 404 })
    return NextResponse.json({ course, sets })
  } catch (error) {
    return NextResponse.json({ error: 'Odd failed: ' + error.message }, { status: 500 })
  }
}
