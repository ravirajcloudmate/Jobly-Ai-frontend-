import { NextRequest, NextResponse } from 'next/server';
import { RoomServiceClient } from 'livekit-server-sdk';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomName = searchParams.get('room');
    const candidateId = searchParams.get('candidateId');

    if (!roomName && !candidateId) {
      return NextResponse.json({ error: 'room or candidateId parameter is required' }, { status: 400 });
    }

    const serverUrl = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!serverUrl || !apiKey || !apiSecret) {
      return NextResponse.json({ 
        error: 'LiveKit environment variables not configured' 
      }, { status: 500 });
    }

    // Try to get status from Python backend first
    if (candidateId) {
      try {
        const backendResponse = await fetch(`http://localhost:8000/interview-status/${candidateId}`);
        if (backendResponse.ok) {
          const backendData = await backendResponse.json();
          console.log('✅ Backend status:', backendData);
          
          return NextResponse.json({
            status: 'success',
            roomName: roomName || `interview-${candidateId}`,
            agentConnected: backendData.agentConnected || false,
            candidateConnected: true,
            participantCount: backendData.agentConnected ? 2 : 1,
            currentQuestion: backendData.currentQuestion || null,
            interviewProgress: backendData.interviewProgress || 0,
            aiAnalysis: backendData.aiAnalysis || null,
            isListening: backendData.isListening || false,
            isAgentSpeaking: backendData.isAgentSpeaking || false,
            participants: [
              {
                identity: `candidate-${candidateId}`,
                name: 'Candidate',
                isAgent: false,
                isCandidate: true,
                joinedAt: new Date().toISOString()
              },
              ...(backendData.agentConnected ? [{
                identity: 'interview-agent',
                name: 'AI Interviewer',
                isAgent: true,
                isCandidate: false,
                joinedAt: new Date().toISOString()
              }] : [])
            ]
          });
        }
      } catch (error) {
        console.log('Backend status check failed, falling back to LiveKit:', error);
      }
    }

    // Fallback to LiveKit room status if backend is not available
    const roomService = new RoomServiceClient(serverUrl, apiKey, apiSecret);

    try {
      // Get room information
      const rooms = await roomService.listRooms([roomName]);
      const room = rooms.find(r => r.name === roomName);

      if (!room) {
        return NextResponse.json({ 
          status: 'room_not_found',
          participants: [],
          agentConnected: false 
        });
      }

      // Get participants in the room
      const participants = await roomService.listParticipants(roomName);
      
      // Check if AI agent is connected (participants with identity starting with 'interview-agent')
      let agentConnected = participants.some(p => 
        p.identity?.startsWith('interview-agent')
      );

      // Also check room metadata for agent status (for mock agents)
      const roomMetadata = room.metadata ? JSON.parse(room.metadata) : null;
      if (roomMetadata?.status === 'agent_connected') {
        agentConnected = true;
      }

      const candidateConnected = participants.some(p => 
        p.identity?.startsWith('candidate')
      );

      return NextResponse.json({
        status: 'success',
        roomName,
        participants: participants.map(p => ({
          identity: p.identity,
          name: p.name,
          isAgent: p.identity?.startsWith('interview-agent') || false,
          isCandidate: p.identity?.startsWith('candidate') || false,
          joinedAt: p.joinedAt ? new Date(Number(p.joinedAt)).toISOString() : null
        })),
        agentConnected,
        candidateConnected,
        participantCount: participants.length,
        roomMetadata: roomMetadata
      });

    } catch (error: any) {
      console.error('Error getting room status:', error);
      return NextResponse.json({ 
        status: 'error',
        error: error.message,
        agentConnected: false 
      }, { status: 500 });
    }

  } catch (e: any) {
    console.error('Agent status error:', e);
    return NextResponse.json({ 
      error: e?.message || 'Failed to get agent status' 
    }, { status: 500 });
  }
}
