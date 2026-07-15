import { NextResponse } from 'next/server'
import { getComparedMetrics } from '@/lib/metrics'

export async function GET() {
  try {
    const data = await getComparedMetrics()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
