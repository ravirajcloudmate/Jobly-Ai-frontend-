import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST endpoint to save interview performance report
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      invitation_id,
      room_id,
      company_id,
      job_id,
      candidate_email,
      candidate_name,
      questions_asked,
      questions_answered,
      correct_answers,
      wrong_answers,
      partial_answers,
      total_score,
      performance_metrics,
      strengths,
      weaknesses,
      recommendations,
      transcript_summary,
      duration_seconds,
      started_at,
      ended_at
    } = body;

    // Validate required fields
    if (!invitation_id || !company_id || !job_id) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          required: ['invitation_id', 'company_id', 'job_id']
        },
        { status: 400 }
      );
    }

    console.log('💾 Saving interview performance report...');
    console.log('👤 Candidate:', candidate_name || candidate_email);
    console.log('📊 Score:', total_score);

    // Check if report already exists
    const { data: existingReport } = await supabase
      .from('interview_reports')
      .select('id')
      .eq('invitation_id', invitation_id)
      .maybeSingle();

    let result;
    const reportData = {
      invitation_id,
      room_id,
      company_id,
      job_id,
      candidate_email,
      candidate_name,
      questions_asked: questions_asked || 0,
      questions_answered: questions_answered || 0,
      correct_answers: correct_answers || 0,
      wrong_answers: wrong_answers || 0,
      partial_answers: partial_answers || 0,
      total_score: total_score || 0,
      performance_metrics: performance_metrics || {},
      strengths: strengths || [],
      weaknesses: weaknesses || [],
      recommendations: recommendations || '',
      transcript_summary: transcript_summary || '',
      duration_seconds: duration_seconds || 0,
      started_at: started_at || new Date().toISOString(),
      ended_at: ended_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (existingReport) {
      // Update existing report
      const { data, error } = await supabase
        .from('interview_reports')
        .update(reportData)
        .eq('id', existingReport.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
      console.log('✅ Report updated');
    } else {
      // Create new report
      const { data, error } = await supabase
        .from('interview_reports')
        .insert({
          ...reportData,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
      console.log('✅ Report created');
    }

    // Update invitation status to completed with final score
    await supabase
      .from('interview_invitations')
      .update({
        status: 'completed',
        interview_completed_at: ended_at || new Date().toISOString(),
        final_score: total_score
      })
      .eq('id', invitation_id);

    // Update interview session status
    if (room_id) {
      await supabase
        .from('interview_sessions')
        .update({
          status: 'completed',
          ended_at: ended_at || new Date().toISOString(),
          duration_seconds: duration_seconds
        })
        .eq('room_id', room_id);
    }

    // Create analytics event
    try {
      await supabase
        .from('analytics_events')
        .insert({
          company_id,
          event_type: 'interview_completed',
          event_category: 'interview',
          event_action: 'completed',
          metadata: {
            invitation_id,
            candidate_email,
            score: total_score,
            questions: questions_asked,
            duration: duration_seconds
          }
        });
    } catch (err) {
      console.warn('Failed to create analytics event:', err);
    }

    return NextResponse.json({
      success: true,
      message: 'Interview report saved successfully',
      report: result
    });

  } catch (error: any) {
    console.error('❌ Error saving interview report:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save interview report',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve interview report
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invitation_id = searchParams.get('invitation_id');
    const company_id = searchParams.get('company_id');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Single report by invitation_id
    if (invitation_id) {
      const { data, error } = await supabase
        .from('interview_reports')
        .select('*')
        .eq('invitation_id', invitation_id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return NextResponse.json(
          { error: 'Report not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        report: data
      });
    }

    // All reports for company
    if (company_id) {
      const { data, error } = await supabase
        .from('interview_reports')
        .select('*')
        .eq('company_id', company_id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        reports: data || []
      });
    }

    return NextResponse.json(
      { error: 'Either invitation_id or company_id is required' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('❌ Error retrieving interview report:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve interview report',
        details: error.message
      },
      { status: 500 }
    );
  }
}


