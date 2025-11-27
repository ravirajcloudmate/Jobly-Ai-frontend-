import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST endpoint to save interview transcript
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      invitation_id,
      room_id,
      company_id,
      job_id,
      transcript,
      started_at,
      ended_at,
      candidate_email,
      candidate_name
    } = body;

    // Validate required fields
    if (!invitation_id || !room_id || !transcript || !Array.isArray(transcript)) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          required: ['invitation_id', 'room_id', 'transcript']
        },
        { status: 400 }
      );
    }

    console.log('💾 Saving interview transcript...');
    console.log('📍 Room:', room_id);
    console.log('👤 Candidate:', candidate_name || candidate_email);
    console.log('📝 Messages:', transcript.length);

    // Calculate duration if both timestamps are provided
    let duration_seconds = null;
    if (started_at && ended_at) {
      const start = new Date(started_at);
      const end = new Date(ended_at);
      duration_seconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    }

    // Check if transcript already exists for this invitation
    const { data: existingTranscript } = await supabase
      .from('interview_transcripts')
      .select('id')
      .eq('invitation_id', invitation_id)
      .maybeSingle();

    let result;
    if (existingTranscript) {
      // Update existing transcript
      const { data, error } = await supabase
        .from('interview_transcripts')
        .update({
          transcript,
          ended_at: ended_at || new Date().toISOString(),
          duration_seconds,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingTranscript.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
      console.log('✅ Transcript updated');
    } else {
      // Create new transcript
      const { data, error } = await supabase
        .from('interview_transcripts')
        .insert({
          invitation_id,
          room_id,
          company_id,
          job_id,
          transcript,
          started_at: started_at || new Date().toISOString(),
          ended_at: ended_at || new Date().toISOString(),
          duration_seconds,
          candidate_email,
          candidate_name
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
      console.log('✅ Transcript saved');
    }

    // Update invitation status to completed if transcript exists
    if (result && !ended_at) {
      await supabase
        .from('interview_invitations')
        .update({
          status: 'completed',
          interview_completed_at: new Date().toISOString()
        })
        .eq('id', invitation_id);
    }

    return NextResponse.json({
      success: true,
      message: 'Transcript saved successfully',
      transcript: result
    });

  } catch (error: any) {
    console.error('❌ Error saving transcript:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save transcript',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve interview transcript
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invitation_id = searchParams.get('invitation_id');
    const room_id = searchParams.get('room_id');

    if (!invitation_id && !room_id) {
      return NextResponse.json(
        { error: 'Either invitation_id or room_id is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('interview_transcripts')
      .select('*');

    if (invitation_id) {
      query = query.eq('invitation_id', invitation_id);
    } else if (room_id) {
      query = query.eq('room_id', room_id);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { error: 'Transcript not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      transcript: data
    });

  } catch (error: any) {
    console.error('❌ Error retrieving transcript:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve transcript',
        details: error.message
      },
      { status: 500 }
    );
  }
}

