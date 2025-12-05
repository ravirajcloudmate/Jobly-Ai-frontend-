import { NextRequest, NextResponse } from 'next/server';
import { WebhookReceiver, AccessToken } from 'livekit-server-sdk';

const apiKey = process.env.LIVEKIT_API_KEY!;
const apiSecret = process.env.LIVEKIT_API_SECRET!;
const projectId = process.env.LIVEKIT_PROJECT_ID || '';

// Initialize the webhook receiver
const receiver = new WebhookReceiver(apiKey, apiSecret);

/**
 * Generate Analytics JWT token for LiveKit Cloud API access
 */
async function generateAnalyticsToken(): Promise<string> {
  const at = new AccessToken(apiKey, apiSecret, {
    ttl: '24h'  // Token valid for 24 hours
  });
  
  // Add roomList grant for Analytics API
  at.addGrant({ roomList: true });
  
  const token = await at.toJwt();
  console.log('🔑 Generated Analytics Token:', token.substring(0, 50) + '...');
  return token;
}

/**
 * List all sessions from LiveKit Cloud API
 */
async function listAllSessionsFromLiveKit(projectId: string, limit: number = 100) {
  const token = await generateAnalyticsToken();
  
  const endpoint = `https://cloud-api.livekit.io/api/project/${projectId}/sessions/?limit=${limit}`;
  
  console.log('📋 Listing all sessions from LiveKit Cloud API...');
  console.log('📍 Endpoint:', endpoint);
  console.log('📊 Limit:', limit);
  
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Failed to list sessions:', response.status, errorText);
    throw new Error(`Failed to list sessions: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  console.log('✅ All Sessions from LiveKit:');
  console.log('📊 Total Sessions:', Array.isArray(data) ? data.length : 'N/A');
  console.log(JSON.stringify(data, null, 2));
  
  return data;
}

export async function POST(request: NextRequest) {
  try {
    // Get the raw body as text (required for webhook validation)
    const rawBody = await request.text();
    
    // Get the Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      console.error('❌ Missing Authorization header');
      return NextResponse.json(
        { error: 'Missing Authorization header' },
        { status: 401 }
      );
    }

    // Validate and decode the webhook event
    const event = await receiver.receive(rawBody, authHeader);
    
    // Console log the received webhook event
    console.log('📥 LiveKit Webhook Received:');
    console.log('Event Type:', event.event);
    console.log('Full Event Body:', JSON.stringify(event, null, 2));
    
    // Return success response
    return NextResponse.json({ 
      success: true,
      event: event.event 
    }, { status: 200 });
    
  } catch (error) {
    console.error('❌ Error processing LiveKit webhook:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process webhook',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 400 }
    );
  }
}

/**
 * GET endpoint to list all LiveKit sessions
 * Requires project_id as query parameter or LIVEKIT_PROJECT_ID environment variable
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const project_id = searchParams.get('project_id') || projectId;

    if (!project_id) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'project_id query parameter or LIVEKIT_PROJECT_ID env variable is required' 
        },
        { status: 400 }
      );
    }

    console.log('📋 Listing all LiveKit sessions...');
    const sessions = await listAllSessionsFromLiveKit(project_id, 100);
    
    return NextResponse.json({
      success: true,
      source: 'livekit_cloud_api',
      sessions: sessions,
      count: Array.isArray(sessions) ? sessions.length : 0
    });

  } catch (error: any) {
    console.error('❌ Error listing sessions:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to list sessions',
        details: error.message
      },
      { status: 500 }
    );
  }
}

