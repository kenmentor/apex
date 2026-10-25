import { NextResponse } from 'next/server'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { sampleSprint } from '@/lib/games'

// Rule-based sprint sampler: pulls from the hand-quality MCQ banks in
// data/courses/. No generation, no LLM.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const course = (searchParams.get('course') || '').trim()
    const section = searchParams.get('section') || ''
    const n = Math.max(1, Math.min(20, Number(searchParams.get('n')) || 10))
    const seed = searchParams.get('seed') || `sprint-${Date.now()}`
    if (!course) return NextResponse.json({ error: 'course required (e.g. COS 202)' }, { status: 400 })

    const dir = join(process.cwd(), 'data', 'courses')
    const key = course.replace(/\s+/g, '').toLowerCase()
    const files = readdirSync(dir).filter(f => f.endsWith('.json'))
    const match = files.find(f => f.replace(/\.json$/, '').toLowerCase() === key)
    if (!match) return NextResponse.json({ error: `No bank for ${course}` }, { status: 404 })

    const bank = JSON.parse(readFileSync(join(dir, match), 'utf-8'))
    const picked = sampleSprint(bank.sections || [], { n, section, seed })
    if (!picked.length) return NextResponse.json({ error: 'No questions for that filter' }, { status: 404 })

    return NextResponse.json({
      course,
      timerSeconds: picked.length * 30,
      questions: picked.map(q => ({ id: q.id, question: q.question, options: q.options, section: q._section })),
      // Answers stay server-side in spirit: the client submits letters,
      // the page scores locally then posts correct/total to attempts.
      answers: Object.fromEntries(picked.map(q => [q.id, q.correct_answer])),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Sprint failed: ' + error.message }, { status: 500 })
  }
}
