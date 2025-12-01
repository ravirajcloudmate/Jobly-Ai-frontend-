import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';

/**
 * POST endpoint to send candidate details to backend agent
 * This includes all candidate information, resume analysis, and interview context
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Extract candidate details from request
    const {
      roomName,
      sessionId,
      candidateId,
      candidateName,
      candidateEmail,
      candidateSkills,
      experience,
      projects,
      resumeAnalysis,
      candidateSummary,
      jobId,
      jobTitle,
      department,
      interviewDate,
      interviewTime,
      agentId,
      agentPrompt
    } = body;

    // Validate required fields
    if (!roomName || !candidateId || !candidateEmail) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          required: ['roomName', 'candidateId', 'candidateEmail']
        },
        { status: 400 }
      );
    }

    console.log('📤 Sending candidate details to backend agent...');
    console.log('📍 Room:', roomName);
    console.log('👤 Candidate:', candidateName || candidateEmail);

    // Fetch complete job posting template if jobId is provided
    let jobPostingTemplate = null;
    if (jobId) {
      try {
        const { data: jobData, error: jobError } = await supabase
          .from('job_postings')
          .select('*')
          .eq('id', jobId)
          .single();
        
        if (!jobError && jobData) {
          jobPostingTemplate = jobData;
          console.log('✅ Job posting template fetched');
        } else {
          console.warn('⚠️ Could not fetch job posting template:', jobError?.message);
        }
      } catch (err) {
        console.warn('⚠️ Error fetching job posting template:', err);
      }
    }

    // Fetch complete agent template if agentId is provided
    let agentTemplate = null;
    if (agentId) {
      try {
        const { data: agentData, error: agentError } = await supabase
          .from('prompt_templates')
          .select('*')
          .eq('id', agentId)
          .single();
        
        if (!agentError && agentData) {
          agentTemplate = agentData;
          console.log('✅ Agent template fetched');
        } else {
          console.warn('⚠️ Could not fetch agent template:', agentError?.message);
        }
      } catch (err) {
        console.warn('⚠️ Error fetching agent template:', err);
      }
    }

    // If agentId not provided but jobId has ai_interview_template, fetch that
    if (!agentTemplate && jobPostingTemplate?.ai_interview_template) {
      try {
        const { data: agentData, error: agentError } = await supabase
          .from('prompt_templates')
          .select('*')
          .eq('id', jobPostingTemplate.ai_interview_template)
          .single();
        
        if (!agentError && agentData) {
          agentTemplate = agentData;
          console.log('✅ Agent template fetched from job posting');
        }
      } catch (err) {
        console.warn('⚠️ Error fetching agent template from job posting:', err);
      }
    }

    // Prepare comprehensive candidate data for backend agent
    const candidateData = {
      // Room and session info
      roomName,
      sessionId: sessionId || `session_${Date.now()}`,
      
      // Basic candidate info
      candidateId,
      candidateName: candidateName || candidateEmail.split('@')[0],
      candidateEmail,
      
      // Candidate profile details
      candidateProfile: {
        name: candidateName,
        email: candidateEmail,
        skills: candidateSkills || '',
        experience: experience || '',
        projects: projects || '',
        summary: candidateSummary || ''
      },
      
      // Resume analysis (from PDF)
      resumeAnalysis: resumeAnalysis || null,
      
      // Job information
      jobInfo: {
        jobId: jobId || 'default-job',
        jobTitle: jobTitle || 'Position',
        department: department || 'General',
        interviewDate: interviewDate || null,
        interviewTime: interviewTime || null
      },
      
      // Agent configuration
      agentConfig: {
        agentId: agentId || 'default-agent',
        agentPrompt: agentPrompt || `Conduct a professional interview for ${candidateName || 'the candidate'} applying for ${jobTitle || 'the position'}.`
      },
      
      // Complete Job Posting Template (full job posting object)
      jobPostingTemplate: jobPostingTemplate,
      
      // Complete Agent Template (full prompt template object)
      agentTemplate: agentTemplate,
      
      // Metadata
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'frontend-api',
        version: '1.0'
      }
    };

    console.log('📋 Candidate data prepared:', {
      roomName: candidateData.roomName,
      candidateId: candidateData.candidateId,
      candidateName: candidateData.candidateName,
      hasResumeAnalysis: !!candidateData.resumeAnalysis,
      hasCandidateSummary: !!candidateData.candidateProfile.summary
    });

    // Send to backend agent endpoint
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const backendResponse = await fetch(`${BACKEND_URL}/agent/candidate-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(candidateData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!backendResponse.ok) {
        const errorText = await backendResponse.text().catch(() => 'Unknown error');
        console.error('❌ Backend error:', backendResponse.status, errorText);
        
        // If endpoint doesn't exist (404), return helpful message
        if (backendResponse.status === 404) {
          return NextResponse.json({
            success: false,
            error: 'Backend endpoint not found',
            message: 'The /agent/candidate-details endpoint is not implemented in your Python backend.',
            note: 'This endpoint is optional - agent can still join with basic info.',
            candidateData: candidateData // Return data so frontend can use it
          }, { status: 404 });
        }
        
        return NextResponse.json({
          success: false,
          error: `Backend returned ${backendResponse.status}`,
          details: errorText
        }, { status: backendResponse.status });
      }

      const backendData = await backendResponse.json();
      console.log('✅ Backend response received:', backendData);

      return NextResponse.json({
        success: true,
        message: 'Candidate details sent to backend agent successfully',
        data: backendData,
        candidateData: candidateData
      });

    } catch (fetchError: any) {
      console.error('❌ Backend connection failed:', fetchError);
      
      // Don't fail completely - return candidate data even if backend is unavailable
      return NextResponse.json({
        success: false,
        error: 'Backend connection failed',
        message: 'Backend server may not be running or endpoint not implemented',
        note: 'The candidate data was prepared but could not be sent to backend.',
        candidateData: candidateData,
        backendUrl: BACKEND_URL,
        details: fetchError.message
      }, { status: 503 });
    }

  } catch (error: any) {
    console.error('❌ Send candidate details error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
}

