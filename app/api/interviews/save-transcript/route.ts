import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * POST endpoint to save interview transcript
 * Receives: { interview_id, room_id, transcript }
 * Saves to interview_transcripts table
 * 
 * URL: POST /api/interviews/save-transcript
 */
export async function POST(req: NextRequest) {
  console.log('📥 POST /api/interviews/save-transcript - Request received');
  
  try {
    const body = await req.json();
    console.log('📦 Request body keys:', Object.keys(body));
    const { interview_id, room_id, transcript } = body;

    // Validate required fields
    if (!interview_id || !transcript) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: interview_id and transcript are required" },
        { status: 400 }
      );
    }
    
    // room_id is optional - if not provided, we'll try to fetch it from sessions
    // or skip it if database requires UUID format

    // Validate transcript is an array
    if (!Array.isArray(transcript)) {
      return NextResponse.json(
        { success: false, message: "Transcript must be an array of messages" },
        { status: 400 }
      );
    }

    // Map interview_id to invitation_id (database uses invitation_id)
    // Accept both interview_id and invitation_id for compatibility
    const invitation_id = body.invitation_id || interview_id;

    // Validate that invitation_id is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(invitation_id)) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid interview_id format. Must be a valid UUID.",
          error: `Expected UUID format, got: "${invitation_id}". Example: "550e8400-e29b-41d4-a716-446655440000"`,
          received_id: invitation_id
        },
        { status: 400 }
      );
    }

    console.log('💾 Saving interview transcript...');
    console.log('📍 Room:', room_id);
    console.log('🆔 Interview ID (invitation_id):', invitation_id);
    console.log('📝 Messages:', transcript.length);

    // Use admin client for backend API calls (bypasses RLS)
    const supabase = createAdminClient();

    // Try to get room_id from interview_sessions table if it exists
    // This ensures we use the correct room_id format (might be UUID in some cases)
    let finalRoomId = room_id || null;
    
    try {
      const { data: sessionData } = await supabase
        .from('interview_sessions')
        .select('room_id')
        .eq('invitation_id', invitation_id)
        .maybeSingle();

      if (sessionData && (sessionData as any).room_id) {
        finalRoomId = (sessionData as any).room_id;
        console.log('✅ Found room_id from interview_sessions:', finalRoomId);
      } else {
        console.log('⚠️ No session found, using provided room_id');
      }
    } catch (sessionError) {
      console.warn('⚠️ Could not fetch room_id from sessions, using provided:', sessionError);
    }

    // Prepare upsert data
    // IMPORTANT: Database room_id column is UUID type, not VARCHAR
    // If room_id is not UUID format, we'll use invitation_id as room_id (workaround)
    let roomIdForDb = finalRoomId || room_id;
    
    // Check if room_id is UUID format
    const isRoomIdUUID = roomIdForDb && uuidRegex.test(roomIdForDb);
    
    if (!isRoomIdUUID) {
      // Database requires UUID for room_id, but we have string format
      // Workaround: Use invitation_id as room_id since it's a valid UUID
      // This maintains the relationship while satisfying the database constraint
      console.log('⚠️ room_id is not UUID format, using invitation_id as room_id (workaround)');
      console.log('   Original room_id:', roomIdForDb);
      console.log('   Using invitation_id as room_id:', invitation_id);
      roomIdForDb = invitation_id;
    }

    const upsertData: any = {
      invitation_id, // Map interview_id to invitation_id (UUID)
      room_id: roomIdForDb, // Must be UUID format
      transcript, // Save as JSONB in 'transcript' column
      updated_at: new Date().toISOString()
    };

    console.log('✅ Final room_id for database (UUID):', upsertData.room_id);

    console.log('🔍 Final upsert data:', {
      invitation_id: upsertData.invitation_id,
      room_id: upsertData.room_id,
      transcript_length: transcript.length
    });

    // Save transcript to interview_transcripts table
    const { data, error } = await supabase
      .from("interview_transcripts")
      .upsert(upsertData, {
        onConflict: 'invitation_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase error:", error);
      return NextResponse.json(
        { success: false, message: "Failed to save transcript", error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Transcript saved successfully');

    // Update invitation status to completed (optional - don't fail if this fails)
    try {
      await (supabase
        .from('interview_invitations') as any)
        .update({
          status: 'completed',
          interview_completed_at: new Date().toISOString()
        })
        .eq('id', invitation_id);
      console.log('✅ Updated invitation status to completed');
    } catch (updateError) {
      console.warn('⚠️ Failed to update invitation status (non-critical):', updateError);
      // Continue anyway, transcript is saved successfully
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Transcript saved successfully',
      data,
      status: 'saved' // Response status indicator
    });

  } catch (err: any) {
    console.error("❌ SERVER ERROR:", err);
    return NextResponse.json(
      { success: false, message: "Server error", error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
