import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

// GET /api/departments — the 16 CCMAS disciplines, each with its programme count.
// Shape stays { docs: [{ code, title, count }] } so existing list UI keeps working.
export async function GET() {
  try {
    const [discCol, progCol] = await Promise.all([
      getCollection('disciplines').catch(() => null),
      getCollection('programmes').catch(() => null),
    ])
    if (!discCol) return NextResponse.json({ docs: [] })

    const discs = await discCol.find({}).sort({ title: 1 }).toArray()
    const counts = {}
    if (progCol) {
      const agg = await progCol.aggregate([{ $group: { _id: '$disciplineCode', n: { $sum: 1 } } }]).toArray().catch(() => [])
      for (const r of agg) counts[r._id] = r.n
    }

    return NextResponse.json({
      docs: discs.map(d => ({
        _id: d._id.toString(),
        id: d._id.toString(),
        code: d.code,
        title: d.title || d.code,
        count: counts[d.code] || 0,
      })),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
