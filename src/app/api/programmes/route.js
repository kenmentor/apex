import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

// GET /api/programmes?q=&discipline=
// All 208 CCMAS programmes: [{ code, name, disciplineCode, discipline }].
// Powers the department picker (students identify with programmes, not disciplines).
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const discipline = (searchParams.get('discipline') || '').trim()

    const [progCol, discCol] = await Promise.all([
      getCollection('programmes').catch(() => null),
      getCollection('disciplines').catch(() => null),
    ])
    if (!progCol) return NextResponse.json({ docs: [] })

    const filter = {}
    if (discipline) filter.disciplineCode = discipline
    const progs = await progCol.find(filter).sort({ name: 1 }).toArray()

    let titles = {}
    if (discCol) {
      const discs = await discCol.find({}).toArray().catch(() => [])
      for (const d of discs) titles[d.code] = d.title || d.code
    }

    const needle = q.toLowerCase()
    const nameCount = {}
    for (const p of progs) nameCount[p.name] = (nameCount[p.name] || 0) + 1
    const docs = progs
      .filter(p => !needle || String(p.name || '').toLowerCase().includes(needle) || String(p.code || '').toLowerCase().includes(needle))
      .map(p => {
        const disc = titles[p.disciplineCode] || p.disciplineCode || null
        // Same programme name can live in two disciplines (e.g. Mathematics
        // in Sciences and in Education) — disambiguate those with discipline.
        const label = nameCount[p.name] > 1 && disc
          ? `${p.name} (${p.code} · ${disc})`
          : `${p.name} (${p.code})`
        return {
          _id: p._id.toString(),
          id: p._id.toString(),
          code: p.code,
          name: p.name,
          label,
          disciplineCode: p.disciplineCode || null,
          discipline: disc,
        }
      })

    return NextResponse.json({ docs })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
