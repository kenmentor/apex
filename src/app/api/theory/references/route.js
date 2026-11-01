import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken, requireAdmin } from '@/lib/auth-server'

function normalizeCourse(code) {
  return (code || '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/^([A-Z]+)(\d+)$/, '$1 $2')
}

const STOP = new Set('the and for with from that this these those are was were has have had not but you your can all any per via into over under about its our out who whom which what when where while will would there their them they then than that these those also such into onto upon de la en el y der die das und the'.split(/\s+/))

function tokens(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w))
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const courseCode = searchParams.get('courseCode')
    const withAnswer = searchParams.get('withAnswer') === 'true'
    // Optional topic filter: only refs matching this topic's keywords.
    const topicTitle = (searchParams.get('title') || '').trim()

    if (!courseCode) {
      return NextResponse.json({ error: 'courseCode required' }, { status: 400 })
    }

    if (withAnswer) {
      const user = await getUserFromToken(request)
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const refsCol = await getCollection('theory_references')
    let refs = await refsCol
      .find({ courseCode: normalizeCourse(courseCode) })
      .sort({ createdAt: -1 })
      .toArray()

    if (topicTitle) {
      const tTokens = [...new Set(tokens(topicTitle))]
      const need = Math.max(1, Math.ceil(tTokens.length * 0.2))
      const normTitle = topicTitle.trim().toLowerCase()
      refs = refs.filter(r => {
        if (String(r.section || '').trim().toLowerCase() === normTitle) return true
        const rToks = [...tokens(r.question), ...tokens((r.mainConcepts || []).join(' ')), ...(r.keywords || []).flatMap(k => tokens(k))]
        return rToks.filter(w => tTokens.includes(w)).length >= need
      })
    }

    const safe = refs.map(r => {
      const doc = {
        _id: r._id.toString(),
        courseCode: r.courseCode,
        section: r.section,
        id: r.id,
        question: r.question,
        mainConcepts: r.mainConcepts,
        keywords: r.keywords,
        difficulty: r.difficulty,
        maxPoints: r.maxPoints || 10,
      }
      if (withAnswer) {
        doc.referenceAnswer = r.referenceAnswer
      }
      return doc
    })

    return NextResponse.json(safe)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch references' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const user = await requireAdmin(request)
    if (!user) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { courseCode, section, id, question, keywords, mainConcepts, referenceAnswer, difficulty, maxPoints } = body

    if (!courseCode || !id || !question || !referenceAnswer) {
      return NextResponse.json({ error: 'Missing required fields: courseCode, id, question, referenceAnswer' }, { status: 400 })
    }

    const refsCol = await getCollection('theory_references')

    const existing = await refsCol.findOne({
      courseCode: normalizeCourse(courseCode),
      id: id.trim(),
    })

    const doc = {
      courseCode: normalizeCourse(courseCode),
      section: section || 'General',
      id: id.trim(),
      question: question.trim(),
      keywords: Array.isArray(keywords) ? keywords : [],
      mainConcepts: Array.isArray(mainConcepts) ? mainConcepts : [],
      referenceAnswer: referenceAnswer.trim(),
      difficulty: difficulty || 'medium',
      maxPoints: maxPoints || 10,
      updatedAt: new Date().toISOString(),
    }

    if (existing) {
      await refsCol.updateOne(
        { _id: existing._id },
        { $set: doc }
      )
      return NextResponse.json({ success: true, updated: true })
    } else {
      doc.createdAt = new Date().toISOString()
      const result = await refsCol.insertOne(doc)
      return NextResponse.json({ success: true, id: result.insertedId.toString() }, { status: 201 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save reference: ' + error.message }, { status: 500 })
  }
}
