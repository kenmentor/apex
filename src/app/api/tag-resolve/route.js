import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'
import { ObjectId } from 'mongodb'

// GET /api/tag-resolve?kind=course|quiz|material&ref=...
// Resolves a material tag into a rich card payload.
function courseHref(code) {
  return `/courses/${String(code || '').toLowerCase().replace(/\s+/g, '')}`
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const kind = (searchParams.get('kind') || '').toLowerCase()
    const ref = (searchParams.get('ref') || '').trim()
    if (!['course', 'quiz', 'material'].includes(kind) || !ref) {
      return NextResponse.json({ error: 'kind + ref required' }, { status: 400 })
    }

    if (kind === 'material') {
      if (!ObjectId.isValid(ref)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      const postsCol = await getCollection('space_posts')
      const post = await postsCol.findOne({ _id: new ObjectId(ref) })
      if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      // Don't leak invite-only group materials to outsiders.
      try {
        const spaces = await getCollection('spaces')
        const space = await spaces.findOne({ _id: new ObjectId(post.spaceId) }, { projection: { name: 1, visibility: 1, members: 1 } })
        let email = null
        try { email = (await getUserFromToken(request))?.email || null } catch {}
        if (space?.visibility === 'invite' && !(space.members || []).includes(email)) {
          return NextResponse.json({ error: 'Not found' }, { status: 404 })
        }
        return NextResponse.json({
          kind, ref,
          title: post.title || (post.content || '').slice(0, 60) || 'Shared material',
          subtitle: `${post.authorName || 'Member'}${space?.name ? ` · ${space.name}` : ''}`,
          mediaKind: post.media?.[0]?.type || 'text',
          href: `/feed/${ref}`,
        })
      } catch {
        return NextResponse.json({
          kind, ref,
          title: post.title || (post.content || '').slice(0, 60) || 'Shared material',
          subtitle: post.authorName || 'Member',
          mediaKind: post.media?.[0]?.type || 'text',
          href: `/feed/${ref}`,
        })
      }
    }

    // course + quiz resolve against the courses catalogue.
    const code = ref.toUpperCase().replace(/\s+/g, ' ').trim()
    const coursesCol = await getCollection('courses')
    const course = await coursesCol.findOne({
      $or: [{ code }, { code: code.replace(/\s+/g, '') }],
    })
    if (!course) return NextResponse.json({ error: 'Not found', kind, ref }, { status: 404 })
    const questionsCol = await getCollection('questions')
    const count = await questionsCol.countDocuments({ courseCode: course.code })
    if (kind === 'course') {
      return NextResponse.json({
        kind, ref,
        title: `${course.code}${course.title ? ` — ${course.title}` : ''}`,
        subtitle: `${count} practice questions`,
        href: courseHref(course.code),
      })
    }
    return NextResponse.json({
      kind, ref,
      title: `${course.code} Quiz`,
      subtitle: `${count} questions · timed · scored`,
      href: `${courseHref(course.code)}/quiz`,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
