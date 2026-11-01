import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

// GET /api/content-departments
// Departments we actually have courses for: distinct course codes across
// all study-content collections, grouped by code prefix, joined with the
// departments collection for display titles. Powers the signup/settings
// department picker (+ an "Others" free-text fallback on the client).
export async function GET() {
  try {
    const [questionsCol, videosCol, theoryCol, readingsCol, materialsCol, deptsCol] = await Promise.all([
      getCollection('questions').catch(() => null),
      getCollection('videos').catch(() => null),
      getCollection('theory_references').catch(() => null),
      getCollection('readings').catch(() => null),
      getCollection('user_materials').catch(() => null),
      getCollection('departments').catch(() => null),
    ])

    const codes = new Set()
    const liveOnly = { status: { $nin: ['pending', 'rejected', 'revoked'] } }
    for (const [col, field, live] of [[questionsCol, 'courseCode', true], [videosCol, 'courseCode', false], [theoryCol, 'courseCode', false], [readingsCol, 'courseCode', true], [materialsCol, 'courseCode', true]]) {
      if (!col) continue
      const vals = await col.distinct(field, live ? liveOnly : {}).catch(() => [])
      for (const v of vals) {
        const c = String(v || '').trim().toUpperCase()
        if (c) codes.add(c)
      }
    }

    // Attribute courses to departments via the curriculum map first
    // (e.g. CLP 211 belongs to MED), falling back to the code prefix.
    const courseToDept = new Map()
    try {
      const entries = await getCollection('curriculum').then(c => c.find({}).toArray()).catch(() => [])
      for (const e of entries || []) {
        const dept = String(e.department_code || '').trim().toUpperCase()
        for (const cc of e.course_codes || []) {
          courseToDept.set(String(cc).trim().toUpperCase(), dept)
        }
      }
    } catch {}

    const byDept = new Map()
    for (const full of codes) {
      const dept = courseToDept.get(full) || full.split(/\s+/)[0]
      if (!dept) continue
      if (!byDept.has(dept)) byDept.set(dept, new Set())
      byDept.get(dept).add(full)
    }

    const titles = new Map()
    if (deptsCol) {
      const docs = await deptsCol.find({}).toArray().catch(() => [])
      for (const d of docs) {
        if (d.code) titles.set(String(d.code).toUpperCase(), d.title || d.code)
      }
    }

    const out = [...byDept.entries()].map(([code, set]) => ({
      code,
      title: titles.get(code) || code,
      courses: set.size,
    }))
    out.sort((a, b) => b.courses - a.courses || a.code.localeCompare(b.code))
    return NextResponse.json(out)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
