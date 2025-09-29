import { NextRequest, NextResponse } from 'next/server';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

export async function POST(req: NextRequest) {
  try {
    const { roomName, candidateId, jobId } = await req.json();
    
    if (!roomName) {
      return NextResponse.json({ error: 'roomName is required' }, { status: 400 });
    }

    const serverUrl = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!serverUrl || !apiKey || !apiSecret) {
      return NextResponse.json({ 
        error: 'LiveKit environment variables not configured' 
      }, { status: 500 });
    }

    // Create token for the AI interview agent
    const agentIdentity = `interview-agent-${Date.now()}`;
    const at = new AccessToken(apiKey, apiSecret, { identity: agentIdentity });
    at.addGrant({ 
      room: roomName, 
      roomJoin: true, 
      canPublish: true, 
      canSubscribe: true, 
      canPublishData: true 
    });
    const agentToken = await at.toJwt();

    // Initialize Room Service Client to manage the room
    const roomService = new RoomServiceClient(serverUrl, apiKey, apiSecret);

    try {
      // Create the room if it doesn't exist
      await roomService.createRoom({
        name: roomName,
        maxParticipants: 10,
        metadata: JSON.stringify({
          type: 'interview',
          candidateId: candidateId || 'unknown',
          jobId: jobId || 'unknown',
          startedAt: new Date().toISOString(),
          status: 'waiting_for_agent'
        })
      });
    } catch (error: any) {
      // Room might already exist, that's okay
      console.log('Room creation info:', error.message);
    }

    // Trigger backend agent to join
    try {
      console.log('🤖 Triggering AI agent to join interview room:', roomName);
      
      // Call your actual Python backend
      const agentResponse = await fetch('http://localhost:8000/start-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName,
          candidateId,
          jobId
        })
      });

      if (agentResponse.ok) {
        const agentData = await agentResponse.json();
        console.log('✅ Python backend agent service started:', agentData);
      } else {
        console.warn('⚠️ Python backend agent service failed to start, but continuing...');
      }

      // In a real implementation, you would call your actual backend AI service:
      // Example: await fetch('http://your-backend-url/start-interview', {
      //   method: 'POST',
      //   headers: { 
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${process.env.BACKEND_API_KEY}`
      //   },
      //   body: JSON.stringify({ 
      //     roomName, 
      //     agentToken, 
      //     candidateId, 
      //     jobId,
      //     livekitUrl: process.env.LIVEKIT_URL,
      //     livekitApiKey: process.env.LIVEKIT_API_KEY,
      //     livekitApiSecret: process.env.LIVEKIT_API_SECRET
      //   })
      // });

    } catch (error: any) {
      console.error('Failed to trigger backend agent:', error);
      // Don't fail the request if agent trigger fails
    }

    return NextResponse.json({ 
      success: true,
      roomName,
      agentToken,
      message: 'Interview started successfully. AI agent will join shortly.'
    });

  } catch (e: any) {
    console.error('Start interview error:', e);
    return NextResponse.json({ 
      error: e?.message || 'Failed to start interview' 
    }, { status: 500 });
  }
}
