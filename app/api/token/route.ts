import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';
  try {
    const { room, identity, metadata } = await req.json();
    if (!room || !identity) {
      return NextResponse.json({ error: 'room and identity are required' }, { status: 400 });
    }

    const resp = await fetch(`${backendBase}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room, identity, metadata: metadata || 'interview' })
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      return NextResponse.json({ error: errText || 'Failed to generate token' }, { status: resp.status });
    }

    const data = await resp.json();
    return NextResponse.json({ url: data.url, token: data.token, identity: data.identity, room: data.room });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to generate token' }, { status: 500 });
  }
}