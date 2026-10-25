import { NextResponse } from 'next/server'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { deriveCloze } from '@/lib/games'

function findFile(dir, key) {
  if (!existsSync(dir)) return null
  const files = readdirSync(dir).filter(f => f.endsWith('.json'))
  return files.find(f => f.replace(/\.json$/, '').toLowerCase() === key) || null
}

const STOP = new Set('about,above,after,again,against,their,there,them,they,what,when,which,while,with,would,these,those,from,that,this,have,has,will,shall,should,there,their,through,under,until,into,over,more,most,other,some,such,only,own,same,than,then,also,each,between,during,before,could,after'.split(','))

// Rule-based cloze: keyword blanking over theory concepts + explanations.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const course = (searchParams.get('course') || '').trim()
    const seed = searchParams.get('seed') || `cloze-${Date.now()}`
    if (!course) return NextResponse.json({ error: 'course required' }, { status: 400 })
    const key = course.replace(/\s+/g, '').toLowerCase()

    const texts = []
    let keywords = []
    const theoryFile = findFile(join(process.cwd(), 'seed-data'), `${key}-theory`)
    if (theoryFile) {
      try {
        const items = JSON.parse(readFileSync(join(process.cwd(), 'seed-data', theoryFile), 'utf-8'))
        for (const t of Array.isArray(items) ? items : []) {
          for (const c of t.mainConcepts || []) texts.push(c)
          for (const k of t.keywords || []) keywords.push(k)
        }
      } catch {}
    }
    const bankFile = findFile(join(process.cwd(), 'data', 'courses'), key)
    if (bankFile) {
      try {
        const bank = JSON.parse(readFileSync(join(process.cwd(), 'data', 'courses', bankFile), 'utf-8'))
        for (const s of bank.sections || []) for (const q of s.questions || []) {
          if (q.explanation) texts.push(q.explanation)
        }
      } catch {}
    }
    if (!keywords.length) {
      // Fallback keywords: frequent long content words in the texts.
      const freq = {}
      for (const t of texts) {
        for (const w of String(t).toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/)) {
          if (w.length > 5 && !STOP.has(w)) freq[w] = (freq[w] || 0) + 1
        }
      }
      keywords = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([w]) => w)
    }

    const items = deriveCloze(texts, keywords, { max: 6, seed })
    if (!items.length) return NextResponse.json({ error: 'Not enough blankable content' }, { status: 404 })
    return NextResponse.json({ course, items })
  } catch (error) {
    return NextResponse.json({ error: 'Cloze failed: ' + error.message }, { status: 500 })
  }
}
