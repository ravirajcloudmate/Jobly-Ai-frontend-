import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

/**
 * POST endpoint to save interview transcript
 * Based on guide: saves transcript metadata and individual messages separately
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    
    const {
      invitation_id,
      room_id,
      transcript,
      started_at,
      ended_at,
      candidate_email,
      candidate_name,
      company_id,
      job_id
    } = payload;

    // Validate required fields
    if (!invitation_id || !room_id || !transcript || !Array.isArray(transcript)) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate transcript is not empty
    if (transcript.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No messages in transcript' },
        { status: 400 }
      );
    }

    console.log('💾 Saving interview transcript...');
    console.log('📍 Room:', room_id);
    console.log('👤 Candidate:', candidate_name || candidate_email);
    console.log('📝 Messages:', transcript.length);

    // Use admin client for backend API calls (bypasses RLS)
    const supabase = createAdminClient();

    // 1. Upsert interview transcript record
    const { data: transcriptRecord, error: transcriptError } = await supabase
      .from('interview_transcripts')
      .upsert({
        invitation_id,
        room_id,
        candidate_email,
        candidate_name,
        company_id: company_id || null,
        job_id: job_id || null,
        started_at,
        ended_at,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'invitation_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (transcriptError) {
      console.error('Error saving transcript record:', transcriptError);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to save transcript record', 
          error: transcriptError.message 
        },
        { status: 500 }
      );
    }

    const transcriptId = transcriptRecord.id;

    // 2. Delete old messages for this transcript (if updating)
    const { error: deleteError } = await supabase
      .from('interview_messages')
      .delete()
      .eq('transcript_id', transcriptId);

    if (deleteError) {
      console.error('Error deleting old messages:', deleteError);
      // Continue anyway, might be first time saving
    }

    // 3. Insert all messages
    const messages = transcript.map(msg => ({
      transcript_id: transcriptId,
      speaker: msg.speaker,
      text: msg.text,
      timestamp: msg.timestamp,
      created_at: new Date().toISOString()
    }));

    const { error: messagesError } = await supabase
      .from('interview_messages')
      .insert(messages);

    if (messagesError) {
      console.error('Error saving messages:', messagesError);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to save messages', 
          error: messagesError.message 
        },
        { status: 500 }
      );
    }

    console.log('✅ Transcript saved successfully');

    // Update invitation status to completed
    await supabase
      .from('interview_invitations')
      .update({
        status: 'completed',
        interview_completed_at: new Date().toISOString()
      })
      .eq('id', invitation_id);

    return NextResponse.json({
      success: true,
      message: 'Transcript saved successfully',
      transcript_id: transcriptId
    });

  } catch (error: any) {
    console.error('❌ Error in interview-transcript API:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error', 
        error: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve interview transcript with messages
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invitation_id = searchParams.get('invitation_id');
    const room_id = searchParams.get('room_id');

    if (!invitation_id && !room_id) {
      return NextResponse.json(
        { success: false, message: 'Either invitation_id or room_id is required' },
        { status: 400 }
      );
    }

    // Use admin client for backend API calls (bypasses RLS)
    const supabase = createAdminClient();

    // Get transcript record
    let query = supabase
      .from('interview_transcripts')
      .select('*');

    if (invitation_id) {
      query = query.eq('invitation_id', invitation_id);
    } else if (room_id) {
      query = query.eq('room_id', room_id);
    }

    const { data: transcriptData, error: transcriptError } = await query.maybeSingle();

    if (transcriptError) throw transcriptError;

    if (!transcriptData) {
      return NextResponse.json(
        { success: false, message: 'Transcript not found' },
        { status: 404 }
      );
    }

    // Get messages for this transcript from new interview_messages table
    const { data: messages, error: messagesError } = await supabase
      .from('interview_messages')
      .select('speaker, text, timestamp')
      .eq('transcript_id', transcriptData.id)
      .order('timestamp', { ascending: true });

    let finalMessages: any[] = [];

    if (messagesError) {
      console.error('Error retrieving messages from interview_messages table:', messagesError);
    } else if (messages && messages.length > 0) {
      // Use messages from new table
      finalMessages = messages;
    } else {
      // Fallback to old JSONB transcript column for backward compatibility
      if (transcriptData.transcript && Array.isArray(transcriptData.transcript)) {
        console.log('Using legacy transcript data from JSONB column');
        finalMessages = transcriptData.transcript;
      }
    }

    // Calculate duration if not set
    let duration_seconds = transcriptData.duration_seconds;
    if (!duration_seconds && transcriptData.started_at && transcriptData.ended_at) {
      const start = new Date(transcriptData.started_at);
      const end = new Date(transcriptData.ended_at);
      duration_seconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    }

    // Format response to match expected structure
    return NextResponse.json({
      success: true,
      transcript: {
        ...transcriptData,
        transcript: finalMessages,
        duration_seconds: duration_seconds || null
      }
    });

  } catch (error: any) {
    console.error('❌ Error retrieving transcript:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to retrieve transcript',
        details: error.message
      },
      { status: 500 }
    );
  }
}

