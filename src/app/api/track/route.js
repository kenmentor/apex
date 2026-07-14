import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

export async function POST(request) {
  try {
    const body = await request.json()
    const { event, sessionId, path, isPwa, metadata = {} } = body

    if (!event) {
      return NextResponse.json({ error: 'event required' }, { status: 400 })
    }

    const col = await getCollection('events')
    await col.insertOne({
      event,
      sessionId: sessionId || 'anon',
      path: path || '/',
      isPwa: !!isPwa,
      userAgent: request.headers.get('user-agent') || '',
      metadata,
      timestamp: new Date(),
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
