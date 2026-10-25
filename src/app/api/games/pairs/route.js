import { NextResponse } from 'next/server'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { derivePairs, seededShuffle } from '@/lib/games'

function findFile(dir, key) {
  if (!existsSync(dir)) return null
  const files = readdirSync(dir).filter(f => f.endsWith('.json'))
  return files.find(f => f.replace(/\.json$/, '').toLowerCase() === key) || null
}

// Rule-based pairs: theory keywords↔concepts first, bank Q/A as fallback.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const course = (searchParams.get('course') || '').trim()
    const seed = searchParams.get('seed') || `pairs-${Date.now()}`
    if (!course) return NextResponse.json({ error: 'course required' }, { status: 400 })
    const key = course.replace(/\s+/g, '').toLowerCase()

    let theoryItems = []
    const theoryFile = findFile(join(process.cwd(), 'seed-data'), `${key}-theory`)
    if (theoryFile) {
      try { theoryItems = JSON.parse(readFileSync(join(process.cwd(), 'seed-data', theoryFile), 'utf-8')) } catch {}
      if (!Array.isArray(theoryItems)) theoryItems = []
    }

    let bankQuestions = []
    const bankFile = findFile(join(process.cwd(), 'data', 'courses'), key)
    if (bankFile) {
      try {
        const bank = JSON.parse(readFileSync(join(process.cwd(), 'data', 'courses', bankFile), 'utf-8'))
        for (const s of bank.sections || []) for (const q of s.questions || []) bankQuestions.push(q)
      } catch {}
    }

    const pairs = derivePairs(theoryItems, bankQuestions, { count: 6, seed })
    if (pairs.length < 3) return NextResponse.json({ error: 'Not enough content for pairs' }, { status: 404 })

    // Shuffle term and definition columns independently per seed.
    const terms = seededShuffle(pairs.map((p, i) => i), seed + ':t')
    const defs = seededShuffle(pairs.map((p, i) => i), seed + ':d')
    return NextResponse.json({ course, pairs, terms, defs })
  } catch (error) {
    return NextResponse.json({ error: 'Pairs failed: ' + error.message }, { status: 500 })
  }
}
