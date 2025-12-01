import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';

/**
 * API endpoint to trigger agent auto-join when candidate joins
 * This is called automatically when candidate connects to the interview room
 */
export async function POST(req: NextRequest) {
  try {
    const { roomId, sessionId, jobId, agentId, agentPrompt, candidateName } = await req.json();

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    console.log('🤖 Triggering agent join for room:', roomId);

    // Fetch complete interview data from database
    let interviewData = null;
    
    if (sessionId) {
      // Fetch from interview_sessions with all relations
      const { data: sessionData, error: sessionError } = await supabase
        .from('interview_sessions')
        .select(`
          *,
          interview_invitations (
            *,
            job_postings (
              *,
              prompt_templates:ai_interview_template (*)
            )
          ),
          prompt_templates:agent_id (*)
        `)
        .eq('id', sessionId)
        .single();
      
      if (!sessionError && sessionData) {
        interviewData = sessionData;
      }
    } else if (jobId) {
      // If no sessionId, fetch from job_postings and interview_invitations
      const { data: jobData, error: jobError } = await supabase
        .from('job_postings')
        .select(`
          *,
          prompt_templates:ai_interview_template (*)
        `)
        .eq('id', jobId)
        .single();
      
      if (!jobError && jobData) {
        // Try to find invitation by job_id
        const { data: invitationData } = await supabase
          .from('interview_invitations')
          .select('*')
          .eq('job_id', jobId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        interviewData = {
          job_id: jobId,
          agent_id: jobData.ai_interview_template,
          interview_invitations: invitationData ? {
            ...invitationData,
            job_postings: jobData
          } : null,
          prompt_templates: jobData.prompt_templates
        };
      }
    }

    console.log('📊 Complete interview data:', JSON.stringify(interviewData, null, 2));

    // Extract all necessary data
    const invitation = interviewData?.interview_invitations;
    const job = invitation?.job_postings || interviewData?.job_postings;
    const promptTemplate = interviewData?.prompt_templates || job?.prompt_templates || invitation?.prompt_templates;
    
    // Prepare complete agent data with all details
    const agentData = {
      // Room & Session Info
      roomName: roomId,
      sessionId: sessionId || null,
      
      // Candidate Details
      candidateId: interviewData?.candidate_email || invitation?.candidate_email || 'candidate',
      candidateName: candidateName || interviewData?.candidate_name || invitation?.candidate_name || 'Candidate',
      candidateEmail: interviewData?.candidate_email || invitation?.candidate_email || '',
      candidateSkills: invitation?.candidate_skills || '',
      candidateExperience: invitation?.experience || '',
      candidateProjects: invitation?.candidate_projects || '',
      
      // Job Details
      jobId: jobId || interviewData?.job_id || job?.id || 'default-job',
      jobTitle: job?.job_title || '',
      jobDepartment: job?.department || '',
      jobDescription: job?.job_description || '',
      employmentType: job?.employment_type || '',
      experienceLevel: job?.experience_level || '',
      location: job?.location || '',
      salaryMin: job?.salary_min || null,
      salaryMax: job?.salary_max || null,
      currency: job?.currency || 'USD',
      isRemote: job?.is_remote || false,
      
      // Interview Settings
      interviewMode: invitation?.interview_mode || job?.interview_mode || 'video',
      interviewLanguage: invitation?.interview_language || job?.interview_language || 'en',
      interviewDuration: invitation?.interview_duration || job?.interview_duration || 30,
      questionsCount: invitation?.questions_count || job?.questions_count || 5,
      difficultyLevel: invitation?.difficulty_level || job?.difficulty_level || 'medium',
      interviewDate: invitation?.interview_date || null,
      interviewTime: invitation?.interview_time || null,
      
      // Agent/Prompt Template Details
      agentId: agentId || interviewData?.agent_id || job?.ai_interview_template || promptTemplate?.id || 'default-agent',
      agentPrompt: agentPrompt || interviewData?.agent_prompt || promptTemplate?.prompt_text || {},
      promptTemplateName: promptTemplate?.name || '',
      promptTemplateDescription: promptTemplate?.description || '',
      promptTemplateCategory: promptTemplate?.category || 'technical',
      promptTemplateLevel: promptTemplate?.level || 'mid',
      promptTemplateDuration: promptTemplate?.duration_minutes || 45,
      
      // Complete prompt_text JSONB object
      promptText: promptTemplate?.prompt_text || {
        duration: 45,
        greeting_message: `Hello ${candidateName || 'Candidate'}, welcome to your interview!`,
        interviewer_instructions: `Conduct a professional interview for ${job?.job_title || 'the position'}.`,
        technical_questions: [],
        default_questions: [],
        positive_feedback: [],
        neutral_feedback: [],
        error_messages: {}
      },
      
      // Complete Job Posting Template (full job posting object)
      jobPostingTemplate: job ? {
        id: job.id,
        company_id: job.company_id,
        created_by: job.created_by,
        job_title: job.job_title,
        department: job.department,
        job_description: job.job_description,
        ai_interview_template: job.ai_interview_template,
        interview_mode: job.interview_mode,
        interview_language: job.interview_language,
        employment_type: job.employment_type,
        experience_level: job.experience_level,
        location: job.location,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        currency: job.currency,
        status: job.status,
        is_remote: job.is_remote,
        applications_count: job.applications_count,
        interview_duration: job.interview_duration,
        questions_count: job.questions_count,
        difficulty_level: job.difficulty_level,
        created_at: job.created_at,
        updated_at: job.updated_at,
        published_at: job.published_at,
        expires_at: job.expires_at
      } : null,
      
      // Complete Agent Template (full prompt template object)
      agentTemplate: promptTemplate ? {
        id: promptTemplate.id,
        company_id: promptTemplate.company_id,
        created_by: promptTemplate.created_by,
        name: promptTemplate.name,
        target_role: promptTemplate.target_role,
        description: promptTemplate.description,
        assessment: promptTemplate.assessment,
        category: promptTemplate.category,
        level: promptTemplate.level,
        duration_minutes: promptTemplate.duration_minutes,
        position: promptTemplate.position,
        prompt_text: promptTemplate.prompt_text,
        usage_count: promptTemplate.usage_count,
        rating: promptTemplate.rating,
        is_active: promptTemplate.is_active,
        created_at: promptTemplate.created_at,
        updated_at: promptTemplate.updated_at
      } : null
    };

    console.log('📋 Agent join data:', agentData);

    // Call Python backend to start agent
    try {
      const backendResponse = await fetch(`${BACKEND_URL}/agent/join`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentData),
        // Don't wait too long - agent will connect async
        signal: AbortSignal.timeout(5000)
      });

      if (backendResponse.ok) {
        const responseData = await backendResponse.json();
        console.log('✅ Agent join request sent:', responseData);
        
        return NextResponse.json({
          success: true,
          message: 'Agent join request sent',
          agentStatus: 'connecting'
        });
      } else {
        const errorData = await backendResponse.json().catch(() => ({}));
        console.warn('⚠️ Agent join request failed:', errorData);
        
        // Don't fail the request - agent might still connect
        return NextResponse.json({
          success: true,
          message: 'Agent join request sent (response pending)',
          warning: errorData.error || 'Backend response not ok'
        });
      }
    } catch (backendError: any) {
      // Don't fail if backend is temporarily unavailable
      console.warn('⚠️ Agent join backend error (non-critical):', backendError.message);
      
      return NextResponse.json({
        success: true,
        message: 'Agent will connect automatically',
        note: 'Backend connection pending'
      });
    }

  } catch (error: any) {
    console.error('❌ Agent join endpoint error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to trigger agent join' },
      { status: 500 }
    );
  }
}

