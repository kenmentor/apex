import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth-server';

export async function GET(request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ docs: [], unreadCount: 0 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const col = await getCollection('notifications');
    const docs = await col
      .find({ userEmail: user.email })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    const unreadCount = await col.countDocuments({
      userEmail: user.email,
      read: false,
    });

    return NextResponse.json({ docs, unreadCount });
  } catch (err) {
    console.error('GET /api/notifications error:', err);
    return NextResponse.json({ docs: [], unreadCount: 0 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { userEmail, type, title, message, link } = body;

    if (!userEmail || !type || !title || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const col = await getCollection('notifications');
    const doc = {
      userEmail,
      type,
      title,
      message,
      link: link || null,
      read: false,
      createdAt: new Date().toISOString(),
    };

    const result = await col.insertOne(doc);
    return NextResponse.json({ success: true, id: result.insertedId }, { status: 201 });
  } catch (err) {
    console.error('POST /api/notifications error:', err);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, markAll } = body;

    const col = await getCollection('notifications');

    if (markAll) {
      await col.updateMany(
        { userEmail: user.email, read: false },
        { $set: { read: true } }
      );
      return NextResponse.json({ success: true });
    }

    if (id) {
      await col.updateOne(
        { _id: new (await import('mongodb')).ObjectId(id), userEmail: user.email },
        { $set: { read: true } }
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Missing id or markAll' }, { status: 400 });
  } catch (err) {
    console.error('PATCH /api/notifications error:', err);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
