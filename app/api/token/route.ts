import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

export async function POST(req: NextRequest) {
  try {
    const { room, identity } = await req.json();
    if (!room || !identity) {
      return NextResponse.json({ error: 'room and identity are required' }, { status: 400 });
    }

    const serverUrl = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!serverUrl || !apiKey || !apiSecret) {
      return NextResponse.json({ 
        error: 'LiveKit environment variables not configured. Please set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in your .env.local file. See setup-env.md for instructions.' 
      }, { status: 500 });
    }

    const at = new AccessToken(apiKey, apiSecret, { identity });
    at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true });
    const token = await at.toJwt();

    return NextResponse.json({ url: serverUrl, token });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'token mint failed' }, { status: 500 });
  }
}



