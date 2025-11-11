'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Filter, 
  Link2, 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle,
  Play,
  Pause,
  RotateCcw,
  Eye,
  Send,
  Loader2,
  AlertCircle,
  Calendar,
  User,
  Building,
  X,
  Upload,
  FileText,
  Sparkles,
  Save,
  Trash2,
  UserPlus,
  TvMinimalPlay
} from 'lucide-react';
import { Notification } from './Notification';

interface InterviewManagementProps {
  user: any;
  globalRefreshKey?: number;
}

export function InterviewManagement({ user, globalRefreshKey }: InterviewManagementProps) {
  const searchParams = useSearchParams();
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [companyIdState, setCompanyIdState] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [jobPostings, setJobPostings] = useState<any[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  
  // Invitation form state
  const [inviteForm, setInviteForm] = useState({
    candidate_email: '',
    candidate_name: '',
    job_id: '',
    expires_in_hours: 168, // 7 days default
    candidate_skills: '',
    experience: '',
    interview_date: '',
    interview_time: '',
    candidate_projects: ''
  });

  // Side drawer state
  const [isSideDrawerOpen, setIsSideDrawerOpen] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [resumeAnalysis, setResumeAnalysis] = useState<any>(null);

  // View-only dialog state
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState<any | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingInvitation, setIsDeletingInvitation] = useState(false);

  // Generate combined summary using both profile details and PDF
  const generateCombinedSummary = async (formData: any, pdfFile: File | null) => {
    setIsGeneratingSummary(true);
    setError(''); // Clear previous errors
    
    try {
      // Check if we have required data
      if (!formData.candidate_name || !formData.candidate_email) {
        throw new Error('Please fill in candidate name and email first');
      }

      if (!pdfFile) {
        throw new Error('Please upload a PDF resume first');
      }

      console.log('Generating combined summary from profile and PDF...');
      
      // First, analyze the PDF to extract content
      let analysis;
      try {
        console.log('Analyzing PDF file:', pdfFile.name);
        const formDataForPdf = new FormData();
        formDataForPdf.append('file', pdfFile);

        const pdfResponse = await fetch('/api/analyze-resume', {
          method: 'POST',
          body: formDataForPdf
        });

        if (!pdfResponse.ok) {
          throw new Error(`PDF Analysis Error: ${pdfResponse.status}`);
        }

        const pdfData = await pdfResponse.json();
        analysis = pdfData.analysis; // Extract the analysis from the response
        setResumeAnalysis(analysis); // Store for later use
        console.log('PDF analysis successful:', analysis);
        
        // Validate that we got meaningful analysis
        if (!analysis || (!analysis.candidateInfo && !analysis.skills && !analysis.experience)) {
          throw new Error('PDF analysis returned empty or invalid data');
        }
        
      } catch (apiError) {
        console.error('PDF analysis failed:', apiError);
        const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown error';
        throw new Error(`Failed to analyze PDF: ${errorMessage}. Please ensure the PDF is readable and try again.`);
      }
      
      // Now generate combined summary using both profile data and PDF analysis
      console.log('Sending combined data to API:', {
        formData: formData,
        analysisKeys: Object.keys(analysis),
        analysisSample: {
          candidateInfo: analysis.candidateInfo,
          skills: analysis.skills,
          experience: analysis.experience?.length || 0,
          projects: analysis.projects?.length || 0
        }
      });
      
      const response = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formData: formData,
          analysis: analysis
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', response.status, errorData);
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      const data = await response.json();
      const summary = data.summary || 'Failed to generate summary';
      
      console.log('Combined summary generated successfully');
      setGeneratedSummary(summary);
      
      // Save summary to database
      try {
        await saveCandidateSummary(formData, summary);
      } catch (dbError) {
        console.warn('Failed to save to database, but summary was generated:', dbError);
        // Don't throw here, just log the warning
      }
      
    } catch (error) {
      console.error('Error generating summary:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate profile summary. Please try again.';
      setError(errorMessage);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Send candidate details to backend agent
  const sendCandidateDetailsToBackend = async (
    roomId: string,
    invitationData: any,
    jobData: any,
    agentData: any,
    generatedSummary: string,
    resumeAnalysis: any
  ) => {
    try {
      console.log('📤 Sending candidate details to backend...');
      
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';
      
      const response = await fetch(`${BACKEND_URL}/agent/candidate-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // 👇 these key names must match backend expectations
          roomName: roomId,
          candidateName: invitationData.candidate_name || invitationData.candidate_email.split('@')[0],
          candidateEmail: invitationData.candidate_email,
          candidateSkills: invitationData.candidate_skills || '',
          experience: invitationData.experience || '',
          candidateProjects: invitationData.candidate_projects || '',
          candidateSummary: generatedSummary || '',
          resumeAnalysis: resumeAnalysis || null,
          jobId: invitationData.job_id,
          jobTitle: jobData.job_title,
          jobDepartment: jobData.department,
          interviewDate: invitationData.interview_date || '',
          interviewTime: invitationData.interview_time || '',
          
          // 👇 most important key — backend will read this
          agentPrompt: agentData?.prompt_text || jobData.ai_interview_template_prompt || '',

          interviewMode: jobData.interview_mode || 'Standard',
          difficultyLevel: jobData.difficulty_level || 'Medium',
        }),
      });

      if (response.ok) {
        console.log('✅ Candidate details sent successfully');
        return true;
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('❌ Failed to send candidate details:', response.status, errorText);
        return false;
      }
    } catch (error: any) {
      console.error('❌ Error sending candidate details:', error);
      return false;
    }
  };

  // Get LiveKit token for candidate
  const getLivekitToken = async (roomId: string, candidateIdentity: string) => {
    try {
      console.log('🎫 Getting LiveKit token...', { roomId, candidateIdentity });
      
      const response = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room: roomId,
          identity: candidateIdentity,
          metadata: 'interview'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to get LiveKit token:', response.status, errorData);
        return null;
      }

      const tokenData = await response.json();
      console.log('✅ LiveKit token generated successfully');
      return tokenData;
    } catch (error: any) {
      console.error('❌ Error getting LiveKit token:', error);
      return null;
    }
  };

  // Delete interview/invitation (removes from DB and refreshes list)
  const openDeleteInvitationDialog = (invitationId: string, candidateName: string) => {
    setError('');
    setDeleteTarget({
      id: invitationId,
      name: candidateName
    });
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteInterview = async () => {
    if (!deleteTarget?.id) return;

    try {
      setIsDeletingInvitation(true);
      setError('');

      const response = await fetch(`/api/interview-invitations/${deleteTarget.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData?.error ||
          errorData?.details ||
          'Failed to delete invitation. Please try again.';
        throw new Error(errorMessage);
      }

      await loadInterviews();
      showNotification('success', 'Deleted', 'Invitation deleted successfully.');
    } catch (e) {
      console.error('Failed to delete interview:', e);
      setError('Failed to delete invitation');
    } finally {
      setIsDeletingInvitation(false);
      setIsDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  // View invitation details (read-only)
  const openViewInvitation = async (invitationId: string) => {
    try {
      setError('');
      // Fetch invitation
      const { data: inv, error: invErr } = await supabase
        .from('interview_invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (invErr) {
        console.error('Failed to load invitation', invErr);
        setError('Failed to load invitation');
        return;
      }

      // Fetch summary if present
      let summaryRow = null;
      const { data: summaryByInvitation } = await supabase
        .from('candidate_summaries')
        .select('*')
        .eq('invitation_id', invitationId)
        .limit(1)
        .maybeSingle();

      if (summaryByInvitation) {
        summaryRow = summaryByInvitation;
      } else if (inv?.candidate_email) {
        const { data: summaryByEmail } = await supabase
          .from('candidate_summaries')
          .select('*')
          .eq('candidate_email', inv.candidate_email)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (summaryByEmail) {
          summaryRow = summaryByEmail;
        }
      }

      setViewRecord({ invitation: inv, summary: summaryRow });
      setIsViewDialogOpen(true);
    } catch (e) {
      console.error('View load error', e);
      setError('Failed to load details');
    }
  };

  // Handle file upload - just store the file, don't generate summary yet
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file);
      setError(''); // Clear any previous errors
      console.log('PDF file uploaded:', file.name);
    } else {
      setError('Please upload a valid PDF file.');
    }
  };

  // Save candidate summary to database
  const saveCandidateSummary = async (formData: any, summary: string, invitationId?: string | null) => {
    try {
      console.log('💾 Attempting to save candidate summary...');
      
      const summaryRecord = {
        candidate_name: formData.candidate_name || null,
        candidate_email: formData.candidate_email,
        job_id: formData.job_id || null,
        skills: formData.candidate_skills || null,
        experience: formData.experience || null,
        projects: formData.candidate_projects || null,
        interview_date: formData.interview_date || null,
        interview_time: formData.interview_time || null,
        summary: summary,
        created_by: user.id,
        company_id: companyIdState || null,
        invitation_id: invitationId || null
      };

      let targetSummaryId: string | null = null;

      // Try to find an existing summary to update (priority: invitation_id > email)
      if (invitationId) {
        const { data: existingByInvitation } = await supabase
          .from('candidate_summaries')
          .select('id')
          .eq('invitation_id', invitationId)
          .maybeSingle();
        if (existingByInvitation?.id) {
          targetSummaryId = existingByInvitation.id;
        }
      }

      if (!targetSummaryId) {
        let query = supabase
          .from('candidate_summaries')
          .select('id')
          .eq('candidate_email', formData.candidate_email)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!invitationId) {
          query = query.is('invitation_id', null);
        }

        const { data: existingByEmail } = await query.maybeSingle();
        if (existingByEmail?.id) {
          targetSummaryId = existingByEmail.id;
        }
      }

      let error;
      if (targetSummaryId) {
        const { error: updateError } = await supabase
          .from('candidate_summaries')
          .update(summaryRecord)
          .eq('id', targetSummaryId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('candidate_summaries')
          .insert([summaryRecord]);
        error = insertError;
      }

      if (error) {
        // Check if table doesn't exist (PGRST205 error code)
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          console.warn('⚠️ candidate_summaries table does not exist. Summary generated but not saved to database.');
          console.warn('💡 Create the table in Supabase to enable saving summaries.');
          // Don't show error to user - summary was still generated
          return;
        }
        
        // For other errors, just log
        console.warn('⚠️ Could not save summary to database:', error.message);
        return;
      }
      
      console.log('✅ Candidate summary saved to database');
      showNotification('success', 'Summary generated and saved!', '');

      if (invitationId) {
        await supabase
          .from('interview_invitations')
          .update({ summary })
          .eq('id', invitationId);
      }
    } catch (error) {
      console.error('❌ Error saving summary:', error);
      // Don't propagate error - summary was still generated successfully
    }
  };

  const linkCandidateSummaryToInvitation = async (
    invitationId: string,
    formData: any,
    summary?: string | null
  ) => {
    if (!invitationId || !formData?.candidate_email) return;
    try {
      const { data: existingSummary } = await supabase
        .from('candidate_summaries')
        .select('id')
        .eq('candidate_email', formData.candidate_email)
        .is('invitation_id', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingSummary?.id) {
        await supabase
          .from('candidate_summaries')
          .update({
            invitation_id: invitationId,
            job_id: formData.job_id || null,
            candidate_name: formData.candidate_name || null,
            summary: summary || generatedSummary || null,
            skills: formData.candidate_skills || null,
            experience: formData.experience || null,
            projects: formData.candidate_projects || null,
            interview_date: formData.interview_date || null,
            interview_time: formData.interview_time || null,
            company_id: companyIdState || null,
            created_by: user.id
          })
          .eq('id', existingSummary.id);

        if (summary || generatedSummary) {
          await supabase
            .from('interview_invitations')
            .update({ summary: summary || generatedSummary || null })
            .eq('id', invitationId);
        }
      } else if (summary || generatedSummary) {
        await saveCandidateSummary(formData, summary || generatedSummary, invitationId);
      }
    } catch (err) {
      console.warn('⚠️ Failed to link summary to invitation:', err);
    }
  };


  // Notification state
  const [notification, setNotification] = useState<{
    isVisible: boolean;
    type: 'success' | 'error' | 'delete';
    title: string;
    message: string;
  }>({
    isVisible: false,
    type: 'success',
    title: '',
    message: ''
  });

  useEffect(() => {
    loadInterviews();
    loadJobPostings();
  }, [user?.id, reloadKey]);

  // Respond to global refresh key changes
  useEffect(() => {
    if (globalRefreshKey && globalRefreshKey > 0) {
      console.log('InterviewManagement: Global refresh triggered');
      setReloadKey(prev => prev + 1); // Use increment to ensure refresh
    }
  }, [globalRefreshKey]);

  // Open invite dialog if requested via query param
  useEffect(() => {
    const action = searchParams?.get('action');
    if (action === 'invite') {
      setIsSideDrawerOpen(true);
    }
  }, [searchParams]);

  // Resolve and cache company_id for realtime filters
  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();
      if (data?.company_id) setCompanyIdState(data.company_id);
    })();
  }, [user?.id]);

  // Realtime updates for invitations and interviews
  useEffect(() => {
    if (!companyIdState) return;
    const channel = supabase.channel(`interviews-rt-${companyIdState}-${Date.now()}`);
    let timer: any;
    const refresh = () => { 
      clearTimeout(timer); 
      timer = setTimeout(() => {
        console.log('InterviewManagement: Refreshing data due to real-time update');
        setReloadKey(Date.now());
      }, 300); 
    };
    try {
      channel.on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'interview_invitations', 
        filter: `company_id=eq.${companyIdState}` 
      }, (payload) => {
        console.log('InterviewManagement: interview_invitations changed:', payload.eventType);
        refresh();
      });
      channel.on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'interviews', 
        filter: `company_id=eq.${companyIdState}` 
      }, (payload) => {
        console.log('InterviewManagement: interviews changed:', payload.eventType);
        refresh();
      });
      channel.subscribe((status) => {
        console.log('InterviewManagement realtime subscription status:', status);
      });
    } catch (e) { 
      console.error('InterviewManagement realtime error:', e); 
    }
    return () => { 
      clearTimeout(timer);
      try { 
        supabase.removeChannel(channel);
        console.log('InterviewManagement: Removed realtime channel');
      } catch (e) {
        console.warn('InterviewManagement: Error removing channel:', e);
      }
    };
  }, [companyIdState]);

  // Refresh on focus/visibility only if tab was away for a while
  useEffect(() => {
    let lastHiddenAt = 0;
    const triggerIfStale = () => {
      const awayMs = Date.now() - lastHiddenAt;
      if (awayMs > 15000) setReloadKey(Date.now());
    };
    const onFocus = () => triggerIfStale();
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        lastHiddenAt = Date.now();
      } else if (document.visibilityState === 'visible') {
        triggerIfStale();
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  // Helper function to show notifications
  const showNotification = (type: 'success' | 'error' | 'delete', title: string, message: string) => {
    setNotification({
      isVisible: true,
      type,
      title,
      message
    });
  };

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isVisible: false }));
  };

  const loadInterviews = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Get user's company_id first
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.company_id) {
        console.error('Error fetching user data:', userError);
        setInterviews([]);
        setLoading(false);
        return;
      }

      // Fetch interview invitations with session data
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('interview_invitations')
        .select(`
          *,
          job_postings!inner(job_title, department, ai_interview_template, interview_mode, difficulty_level),
          interview_sessions(id, status, started_at, ended_at, duration_seconds, session_token, room_id)
        `)
        .eq('company_id', userData.company_id)
        .order('created_at', { ascending: false });

      if (invitationsError) {
        console.log('Interview invitations table not available, showing empty state');
        setInterviews([]);
      } else {

        // Transform invitation data to display format
        const transformedData = (invitationsData || []).map((inv: any) => {
          const session = inv.interview_sessions?.[0]; // Get the first session if exists
          
          return {
            id: inv.id,
            companyBrandingId: inv.company_branding_id || null,
            candidateName: inv.candidate_name || inv.candidate_email.split('@')[0],
            email: inv.candidate_email,
            jobTitle: inv.job_postings?.job_title || 'Position',
            jobDepartment: inv.job_postings?.department || '',
            jobMode: inv.job_postings?.interview_mode || '',
            jobDifficulty: inv.job_postings?.difficulty_level || '',
            status: getInterviewStatus(inv.status, session?.status),
            progress: getProgressFromStatus(inv.status, session?.status),
            invitedDate: inv.created_at,
            completedDate: inv.interview_completed_at || session?.ended_at,
            link: inv.interview_link,
            invitation_id: inv.id,
            job_id: inv.job_id,
            type: 'invitation',
            expires_at: inv.expires_at,
            reminder_count: inv.reminder_sent_count || 0,
            // Session data
            sessionId: session?.id,
            sessionStatus: session?.status,
            sessionToken: session?.session_token,
            roomId: session?.room_id,
            startedAt: session?.started_at,
            duration: session?.duration_seconds,
            // New fields from Invite Candidate form
            candidate_skills: inv.candidate_skills || '',
            experience: inv.experience || '',
            interview_date: inv.interview_date || '',
            interview_time: inv.interview_time || '',
            candidate_projects: inv.candidate_projects || ''
          };
        });
        
        setInterviews(transformedData);
      }
    } catch (err) {
      console.error('Error loading interviews:', err);
      setInterviews([]);
    } finally {
      setLoading(false);
    }
  };

  const loadJobPostings = async () => {
    if (!user?.id) return;

    try {
      // Get user's company_id
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) return;

      // Fetch active job postings
      const { data: jobsData } = await supabase
        .from('job_postings')
        .select('id, job_title, department, ai_interview_template, interview_mode, interview_duration, questions_count, difficulty_level')
        .eq('company_id', userData.company_id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      setJobPostings(jobsData || []);
    } catch (err) {
      console.error('Error loading job postings:', err);
      setJobPostings([]);
    }
  };

  // Helper functions to transform status
  const getInterviewStatus = (dbStatus: string, sessionStatus?: string) => {
    // Priority: session status > invitation status
    if (sessionStatus) {
      switch (sessionStatus) {
        case 'completed': return 'Completed';
        case 'active': return 'In Progress';
        case 'waiting': return 'Waiting for Candidate';
        case 'cancelled': return 'Cancelled';
        default: return 'Session Ready';
      }
    }
    
    switch (dbStatus) {
      case 'completed': return 'Completed';
      case 'in_progress': case 'started': return 'In Progress';
      case 'scheduled': case 'sent': case 'opened': return 'Not Started';
      case 'cancelled': case 'expired': return 'Expired';
      default: return 'Not Started';
    }
  };

  const getProgressFromStatus = (dbStatus: string, sessionStatus?: string) => {
    // Priority: session status > invitation status
    if (sessionStatus) {
      switch (sessionStatus) {
        case 'completed': return 100;
        case 'active': return 75;
        case 'waiting': return 25;
        case 'cancelled': return 0;
        default: return 10;
      }
    }
    
    switch (dbStatus) {
      case 'completed': return 100;
      case 'in_progress': case 'started': return 60;
      case 'opened': return 20;
      case 'sent': return 10;
      case 'scheduled': return 5;
      default: return 0;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'In Progress': return <Play className="h-4 w-4 text-blue-600" />;
      case 'Waiting for Candidate': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'Session Ready': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Not Started': return <Clock className="h-4 w-4 text-orange-600" />;
      case 'Expired': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'Cancelled': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'default';
      case 'In Progress': return 'secondary';
      case 'Waiting for Candidate': return 'outline';
      case 'Session Ready': return 'default';
      case 'Not Started': return 'outline';
      case 'Expired': return 'destructive';
      case 'Cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showNotification('success', 'Link copied', 'Interview link copied to clipboard');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      showNotification('error', 'Copy failed', 'Failed to copy link to clipboard');
    }
  };

  const openInterviewLink = (roomId: string) => {
    // Use room_id instead of session_id
    const interviewUrl = `/interview-room/${roomId}`;
    window.open(interviewUrl, '_blank');
  };

  // Helper function to generate secure token
  const generateSecureToken = () => {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const handleInviteCandidate = async () => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    try {
      setInviteLoading(true);
      setError('');

      // Validate form
      if (!inviteForm.candidate_email || !inviteForm.job_id) {
        setError('Please fill in all required fields (Email and Job Posting)');
        setInviteLoading(false);
        return;
      }

      // Get user's company_id
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) {
        setError('User not linked to company. Please contact administrator.');
        setInviteLoading(false);
        return;
      }

      // Get job details with agent information
      const { data: jobData } = await supabase
        .from('job_postings')
        .select('*, ai_interview_template')
        .eq('id', inviteForm.job_id)
        .single();

      if (!jobData) {
        setError('Job posting not found. Please select a valid job.');
        setInviteLoading(false);
        return;
      }

      // Get agent prompt template - MUST be UUID to properly link
      let agentData = null;
      let agentId: string | null = null;
      let agentPromptText = 'Conduct a professional interview for the position.';

      // Check if ai_interview_template is a valid UUID
      const templateIdValue = jobData.ai_interview_template?.trim();
      const isUUID = templateIdValue && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(templateIdValue);

      if (isUUID) {
        // Valid UUID - query prompt_templates
        const { data: templateData } = await supabase
          .from('prompt_templates')
          .select('*')
          .eq('id', templateIdValue)
          .maybeSingle();
        
        if (templateData) {
          agentData = templateData;
          agentId = templateData.id;  // UUID from database
          agentPromptText = templateData.prompt_text || agentPromptText;
          console.log('✅ Found template in database:', agentId);
        } else {
          console.error('⚠️ Template not found in database:', templateIdValue);
          setError(`Selected AI interview template (${templateIdValue}) not found. Please update the job posting with a valid template.`);
          setInviteLoading(false);
          return;
        }
      } else {
        // Not a UUID - this is a problem
        console.error('❌ Invalid template ID format:', templateIdValue);
        setError(`Invalid template ID format. The job posting references "${templateIdValue}" which is not a valid template UUID. Please update the job posting to use a saved template from the database.`);
        setInviteLoading(false);
        return;
      }

      console.log('📋 Job Data:', jobData);
      console.log('🤖 Agent Data:', agentData);
      console.log('🔗 Agent ID (UUID):', agentId);

      // Generate unique room ID for LiveKit
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('🏠 Generated Room ID:', roomId);
      console.log('🎫 Generated Session Token:', sessionToken);

      // Create interview invitation in database
      const { data: invitationData, error: inviteError } = await supabase
        .rpc('create_interview_invitation', {
          p_company_id: userData.company_id,
          p_job_id: inviteForm.job_id,
          p_created_by: user.id,
          p_candidate_email: inviteForm.candidate_email,
          p_candidate_name: inviteForm.candidate_name || null,
          p_expires_in_hours: inviteForm.expires_in_hours
        });

      if (inviteError) {
        console.error('❌ Error creating invitation:', inviteError);
        setError('Failed to create interview invitation: ' + (inviteError.message || 'Unknown error'));
        setInviteLoading(false);
        return;
      }

      console.log('✅ Invitation created:', invitationData);
      console.log('📋 Invitation data type:', typeof invitationData);
      console.log('📋 Invitation data structure:', JSON.stringify(invitationData, null, 2));

      // Get invitation ID - RPC returns array with {invitation_id, interview_link, interview_token}
      let invitationId;
      if (Array.isArray(invitationData) && invitationData.length > 0) {
        // RPC function returns array with invitation_id property
        invitationId = invitationData[0].invitation_id;
      } else if (invitationData && typeof invitationData === 'object' && invitationData.invitation_id) {
        // Handle single object response
        invitationId = invitationData.invitation_id;
      } else if (invitationData && typeof invitationData === 'object' && invitationData.id) {
        // Fallback for direct id property
        invitationId = invitationData.id;
      } else {
        // Last resort fallback
        invitationId = invitationData;
      }

      console.log('🆔 Extracted invitation ID:', invitationId);

      if (!invitationId) {
        console.error('❌ No invitation ID found in response:', invitationData);
        setError('Failed to create invitation. Please try again.');
        setInviteLoading(false);
        return;
      }

      if (generatedSummary) {
        await linkCandidateSummaryToInvitation(invitationId, inviteForm, generatedSummary);
      }

      // Update extra optional fields
      const { error: updateError } = await supabase
        .from('interview_invitations')
        .update({
          candidate_skills: inviteForm.candidate_skills || null,
          experience: inviteForm.experience || null,
          interview_date: inviteForm.interview_date || null,
          interview_time: inviteForm.interview_time || null,
          candidate_projects: inviteForm.candidate_projects || null
        })
        .eq('id', invitationId);

      if (updateError) {
        console.warn('⚠️ Failed to update extra fields:', updateError);
      }

      // Prepare session data
      const sessionData = {
        invitation_id: invitationId,
        job_id: inviteForm.job_id,
        agent_id: agentData?.id || jobData.ai_interview_template || 'default-agent',
        agent_prompt: agentData?.prompt_text || 'Conduct a professional interview for the position.',
        candidate_email: inviteForm.candidate_email,
        candidate_name: inviteForm.candidate_name || inviteForm.candidate_email.split('@')[0],
        room_id: roomId,
        session_token: sessionToken,
        status: 'waiting',
        video_enabled: true,
        audio_enabled: true
      };

      console.log('📝 Attempting to insert session:', sessionData);

      // Try to create session - but don't fail if table doesn't exist
      let sessionId = sessionToken; // Fallback to token if insert fails
      
      try {
        const { data: session, error: sessionError } = await supabase
          .from('interview_sessions')
          .insert([sessionData])
          .select()
          .single();

        if (sessionError) {
          // Log detailed error
          console.error('⚠️ Session creation error:', sessionError);
          console.error('⚠️ Session error details:', {
            message: sessionError.message,
            details: sessionError.details,
            hint: sessionError.hint,
            code: sessionError.code,
          });

          // Check if table doesn't exist
          if (sessionError.code === '42P01' || sessionError.message?.includes('does not exist')) {
            console.warn('⚠️ interview_sessions table does not exist. Creating link without session record.');
            showNotification(
              'error',
              'Warning',
              'Interview sessions table not found. Please create the table in Supabase.'
            );
          } else {
            throw sessionError;
          }
        } else {
          sessionId = session?.id || sessionToken;
          console.log('✅ Session created with ID:', sessionId);
        }
      } catch (sessionErr: any) {
        console.error('❌ Session insert failed:', sessionErr);
        console.error('❌ Session error details:', {
          message: sessionErr.message,
          details: sessionErr.details,
          hint: sessionErr.hint,
          code: sessionErr.code,
        });
        // Continue anyway - we can still send invitation
      }

      // Send candidate details to backend agent
      const candidateDetailsSent = await sendCandidateDetailsToBackend(roomId, inviteForm, jobData, agentData, generatedSummary, resumeAnalysis);
      
      // Get LiveKit token only after candidate details are successfully sent to backend
      if (candidateDetailsSent) {
        const candidateIdentity = `candidate-${inviteForm.candidate_email.split('@')[0]}-${Date.now()}`;
        const tokenData = await getLivekitToken(roomId, candidateIdentity);
        
        if (!tokenData) {
          console.warn('⚠️ Failed to get LiveKit token, but continuing with invitation creation');
        } else {
          console.log('✅ LiveKit token obtained successfully');
        }
      } else {
        console.warn('⚠️ Candidate details not sent to backend, skipping LiveKit token generation');
      }

      // Generate interview link
      const interviewLink = `${window.location.origin}/interview-room/${roomId}`;
      console.log('🔗 Interview Link:', interviewLink);

      // Update invitation with interview link
      const { error: linkUpdateError } = await supabase
        .from('interview_invitations')
        .update({
          interview_link: interviewLink
        })
        .eq('id', invitationId);

      if (linkUpdateError) {
        console.warn('⚠️ Failed to update interview link:', linkUpdateError);
      }

      // Send email invitation
      let emailSent = false;
      try {
        console.log('📧 Attempting to send invitation email...');
        const emailResponse = await fetch('/api/send-interview-invitation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: inviteForm.candidate_email,
            candidateName: inviteForm.candidate_name || inviteForm.candidate_email.split('@')[0],
            interviewLink: interviewLink,
            jobTitle: jobData.job_title,
            companyName: user.company || 'Company'
          })
        });

        if (emailResponse.ok) {
          emailSent = true;
          console.log('✅ Interview invitation email sent successfully');
        } else {
          const errorData = await emailResponse.json().catch(() => ({}));
          console.error('❌ Email sending failed:', errorData);
        }
      } catch (emailError) {
        console.error('❌ Email error:', emailError);
      }

      // Show success notification
      if (emailSent) {
        showNotification(
          'success',
          'Interview invitation sent',
          `${inviteForm.candidate_name || inviteForm.candidate_email} has been invited for ${jobData.job_title} position.`
        );
      } else {
        // Copy link to clipboard as fallback
        try {
          await navigator.clipboard.writeText(interviewLink);
          showNotification(
            'success',
            'Invitation created',
            `Invitation created! Link copied to clipboard. Please share with ${inviteForm.candidate_name || inviteForm.candidate_email}.`
          );
        } catch {
          showNotification(
            'success',
            'Invitation created',
            `Invitation created successfully! Interview link: ${interviewLink.substring(0, 50)}...`
          );
        }
      }

      // Reset form and close dialog
      setInviteForm({
        candidate_email: '',
        candidate_name: '',
        job_id: '',
        expires_in_hours: 168,
        candidate_skills: '',
        experience: '',
        interview_date: '',
        interview_time: '',
        candidate_projects: ''
      });
      setUploadedFile(null);
      setGeneratedSummary('');
      setResumeAnalysis(null);
      setIsSideDrawerOpen(false);
      
      // Reload interviews
      await loadInterviews();

      // Reset loading state
      setInviteLoading(false);

    } catch (err: any) {
      console.error('❌ Error inviting candidate:', err);
      setError('Failed to invite candidate: ' + (err.message || 'Unknown error'));
      setInviteLoading(false);
    }
  };

  const sendReminder = async (interviewId: string, candidateEmail: string) => {
    try {
      // Find the interview to get context
      const interview = interviews.find(i => i.id === interviewId);
      if (!interview) {
        console.error('Interview not found');
        return;
      }

      // Update reminder count in database (if interview_invitations table exists)
      try {
        await supabase.rpc('send_interview_reminder', { p_invitation_id: interviewId });
      } catch (dbError) {
        console.log('RPC function not available, skipping database update');
      }

      // Send reminder email
      const emailResponse = await fetch('/api/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: candidateEmail,
          candidateName: interview.candidateName,
          interviewLink: interview.link,
          jobTitle: interview.jobTitle,
          companyName: user.company || 'Company'
        })
      });

      if (emailResponse.ok) {
        console.log('Reminder sent successfully');
        
        // Show success notification
        showNotification(
          'success',
          'Reminder sent',
          `Interview reminder sent to ${interview.candidateName}.`
        );
        
        await loadInterviews(); // Refresh data
      } else {
        const errorData = await emailResponse.json().catch(() => ({}));
        console.error('Failed to send reminder:', errorData);
        setError('Failed to send reminder: ' + (errorData.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error sending reminder:', err);
      setError('Failed to send reminder');
    }
  };

  // Filter interviews based on search and status
  const filteredInterviews = interviews.filter(interview => {
    const matchesSearch = interview.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         interview.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         interview.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || interview.status.toLowerCase().replace(' ', '') === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Remove individual loading state - use global blue progress line instead

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-[#e30d0d] text-white px-3 py-1 rounded-md font-semibold">INTERVIEW</div>
            <h1 className="text-3xl font-bold"> Management</h1>
          </div>
          <p className="text-muted-foreground">Track interview links, candidate progress, and manage invitations.</p>
        </div>
        <Button 
          size="lg" 
          className="gap-2 bg-[#e30d0d] hover:bg-[#c50c0c] text-white"
          onClick={() => setIsSideDrawerOpen(true)}
        >
          <UserPlus className="h-4 w-4" />
          Invite Candidate
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search candidates by name, email, or job title..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="px-3 py-2 border border-input rounded-md bg-background"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="inprogress">In Progress</option>
          <option value="notstarted">Not Started</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Interviews ({filteredInterviews.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({filteredInterviews.filter(i => i.status === 'Completed').length})</TabsTrigger>
          <TabsTrigger value="progress">In Progress ({filteredInterviews.filter(i => i.status === 'In Progress').length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({filteredInterviews.filter(i => i.status === 'Not Started').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {filteredInterviews.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No interviews found</h3>
                <p className="text-muted-foreground mb-4">
                  {interviews.length === 0 ? 'Start by inviting candidates for interviews.' : 'Try adjusting your search or filters.'}
                </p>
                {interviews.length === 0 && (
                  <Button onClick={() => setIsSideDrawerOpen(true)} className="gap-2 bg-[#e30d0d] hover:bg-[#c50c0c] text-white">
                    <UserPlus className="h-4 w-4" />
                    Invite Your First Candidate
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredInterviews.map((interview) => (
                <Card key={interview.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {interview.candidateName.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm leading-tight">{interview.candidateName}</h3>
                          {getStatusIcon(interview.status)}
                          <Badge variant={getStatusColor(interview.status) as any} className="text-[10px]">
                            {interview.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{interview.email}</p>
                        <Badge variant="secondary" className="mt-2 text-[10px] font-medium">{interview.jobTitle}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground">Invited: {formatDate(interview.invitedDate)}</p>
                      {interview.type === 'invitation' && (
                        interview.interview_date ? (
                          <p className="text-[11px] text-green-700">{formatDate(interview.interview_date)}{interview.interview_time ? ` • ${interview.interview_time}` : ''}</p>
                        ) : (
                          interview.expires_at && (
                            <p className={`text-[11px] ${new Date(interview.expires_at) < new Date() ? 'text-red-600' : 'text-orange-600'}`}>{formatDate(interview.expires_at)}</p>
                          )
                        )
                      )}
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {(interview.roomId || interview.link) && (
                        <Button 
                          size="sm" 
                          variant="default"
                          className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white text-[11px]"
                          onClick={() => {
                            if (interview.roomId) {
                              window.open(`/interview-room/${interview.roomId}`, '_blank');
                            } else if (interview.link) {
                              window.open(interview.link, '_blank');
                            }
                          }}
                          title="Join interview"
                        >
                          <TvMinimalPlay className="h-3 w-3" />
                          Join Interview
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="h-7 px-2 text-blue-600"
                        onClick={() => copyToClipboard(interview.link)}
                        title="Copy link"
                      >
                        <Link2 className="h-3 w-3" />
                        <span className="text-[11px]">Copy</span>
                      </Button>
                      {interview.status === 'Not Started' && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => sendReminder(interview.id, interview.email)}
                          title="Send reminder"
                        >
                          <Send className="h-3 w-3" />
                          <span className="text-[11px]">Remind</span>
                        </Button>
                      )}
                    </div>
                    {interview.type === 'invitation' && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          title="View"
                          onClick={() => openViewInvitation(interview.invitation_id || interview.id)}
                        >
                          <Eye className="h-3 w-3" />
                          <span className="text-[11px]">View</span>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-600 hover:text-red-700"
                          title="Delete Invitation"
                          onClick={() =>
                            openDeleteInvitationDialog(
                              interview.invitation_id || interview.id,
                              interview.candidateName
                            )
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Session Status Info */}
                  {interview.sessionId && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Session:</span>
                          <Badge variant="outline" className="text-[10px]">
                            {interview.sessionStatus || 'waiting'}
                          </Badge>
                        </div>
                        {interview.startedAt && (
                          <span className="text-gray-500">
                            Started: {formatDate(interview.startedAt)}
                          </span>
                        )}
                        {interview.duration && (
                          <span className="text-green-600 font-medium">
                            {Math.floor(interview.duration / 60)}m {interview.duration % 60}s
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {filteredInterviews.filter(interview => interview.status === 'Completed').map((interview) => (
            <Card key={interview.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{interview.candidateName.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{interview.candidateName}</h3>
                      <p className="text-sm text-muted-foreground">{interview.jobTitle}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">{interview.score}%</p>
                    <p className="text-sm text-muted-foreground">{interview.duration}</p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          {filteredInterviews.filter(interview => interview.status === 'In Progress').map((interview) => (
            <Card key={interview.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{interview.candidateName.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{interview.candidateName}</h3>
                      <p className="text-sm text-muted-foreground">{interview.jobTitle}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Progress value={interview.progress} className="w-24 h-2 mb-1" />
                    <p className="text-sm text-muted-foreground">{interview.progress}% complete</p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {filteredInterviews.filter(interview => interview.status === 'Not Started').map((interview) => (
            <Card key={interview.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{interview.candidateName.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{interview.candidateName}</h3>
                      <p className="text-sm text-muted-foreground">{interview.jobTitle}</p>
                    </div>
                  </div>
                    <Button size="sm" className="gap-1" onClick={() => sendReminder(interview.id, interview.email)}>
                    <Send className="h-4 w-4" />
                    Remind
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

        {/* Side Drawer for Invite Candidate */}
        {isSideDrawerOpen && (
          <div className="fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div 
              className="flex-1 bg-black/20 backdrop-blur-sm"
              onClick={() => setIsSideDrawerOpen(false)}
            />
            
            {/* Drawer Panel */}
            <div className="w-full max-w-2xl bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-xl">
              <div className="flex h-full flex-col">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-6 py-4">
                  <div>
                    <h2 className="text-xl font-semibold">Invite New Candidate</h2>
                    <p className="text-sm text-muted-foreground">Create comprehensive candidate profile</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSideDrawerOpen(false)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <p className="text-red-800 text-sm">{error}</p>
                    </div>
                  )}

                  <div className="space-y-6">
                    {/* Basic Information */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Basic Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Candidate Name *</label>
                          <Input 
                            placeholder="John Doe" 
                            className="mt-1"
                            value={inviteForm.candidate_name}
                            onChange={(e) => setInviteForm({...inviteForm, candidate_name: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Candidate Email *</label>
                          <Input 
                            placeholder="candidate@email.com" 
                            className="mt-1"
                            value={inviteForm.candidate_email}
                            onChange={(e) => setInviteForm({...inviteForm, candidate_email: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Job Information */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Job Information</h3>
                      <div>
                        <label className="text-sm font-medium">Job Posting *</label>
                        <select 
                          className="w-full mt-1 p-2 border border-input rounded-md bg-background"
                          value={inviteForm.job_id}
                          onChange={(e) => setInviteForm({...inviteForm, job_id: e.target.value})}
                        >
                          <option value="">Select a job position</option>
                          {jobPostings.map(job => (
                            <option key={job.id} value={job.id}>
                              {job.job_title} - {job.department}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Skills and Experience */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Skills & Experience</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Candidate Skills</label>
                          <Input 
                            placeholder="React, JavaScript, Node.js, Python..." 
                            className="mt-1"
                            value={inviteForm.candidate_skills}
                            onChange={(e) => setInviteForm({...inviteForm, candidate_skills: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Experience</label>
                          <Input 
                            placeholder="5 years in software development..." 
                            className="mt-1"
                            value={inviteForm.experience}
                            onChange={(e) => setInviteForm({...inviteForm, experience: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Interview Schedule */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Interview Schedule</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Interview Date</label>
                          <Input 
                            type="date"
                            className="mt-1"
                            value={inviteForm.interview_date}
                            onChange={(e) => setInviteForm({...inviteForm, interview_date: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Interview Time</label>
                          <Input 
                            type="time"
                            className="mt-1"
                            value={inviteForm.interview_time}
                            onChange={(e) => setInviteForm({...inviteForm, interview_time: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Projects */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Candidate Projects</h3>
                      <div>
                        <label className="text-sm font-medium">Projects</label>
                        <textarea 
                          placeholder="E-commerce platform, Mobile app, API development..."
                          className="w-full mt-1 p-2 border border-input rounded-md bg-background h-20 resize-none"
                          value={inviteForm.candidate_projects}
                          onChange={(e) => setInviteForm({...inviteForm, candidate_projects: e.target.value})}
                        />
                      </div>
                    </div>

                    {/* Profile Summary Generation */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Profile Summary</h3>
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <Button
                            onClick={() => generateCombinedSummary(inviteForm, uploadedFile)}
                            disabled={isGeneratingSummary || !inviteForm.candidate_name || !inviteForm.candidate_email || !uploadedFile}
                            className="flex-1 gap-2"
                          >
                            {isGeneratingSummary ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Generating Combined Summary...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4" />
                                Generate Combined Summary
                              </>
                            )}
                          </Button>
                        </div>
                        
                        {!uploadedFile && (
                          <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                            ⚠️ Please upload a PDF resume to generate the summary
                          </p>
                        )}
                        
                        {uploadedFile && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <p className="text-sm text-green-800">
                              ✓ PDF uploaded: <span className="font-medium">{uploadedFile.name}</span>
                            </p>
                            <p className="text-xs text-green-600 mt-1">
                              Ready to generate combined summary with profile + PDF content
                            </p>
                          </div>
                        )}

                        {/* PDF Upload */}
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-600 mb-2">
                            <span className="font-medium text-red-600">*Required:</span> Upload candidate's resume PDF
                          </p>
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="pdf-upload"
                          />
                          <label
                            htmlFor="pdf-upload"
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Choose PDF File
                          </label>
                          {uploadedFile && (
                            <p className="text-xs text-green-600 mt-2">
                              ✓ {uploadedFile.name} uploaded successfully
                            </p>
                          )}
                        </div>

                        {/* Generated Summary Display */}
                        {generatedSummary && (
                          <div className="bg-gray-50 border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">Generated Combined Summary</h4>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setGeneratedSummary('')}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-xs text-gray-500 mb-2">
                              ✓ Generated from profile details + PDF resume analysis
                            </p>
                            <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-60 overflow-y-auto">
                              {generatedSummary}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t px-6 py-4">
                  <div className="flex gap-3">
                    <Button
                      onClick={handleInviteCandidate}
                      disabled={inviteLoading || !inviteForm.candidate_email || !inviteForm.job_id}
                      className="flex-1 gap-2 bg-[#e30d0d] hover:bg-[#c50c0c] text-white"
                    >
                      {inviteLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending Invite...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Invite Candidate
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsSideDrawerOpen(false)}
                      disabled={inviteLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View-only dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl overflow-hidden">
            <DialogHeader>
              <DialogTitle>Invitation Details</DialogTitle>
              <DialogDescription>Read-only view of candidate and summary</DialogDescription>
            </DialogHeader>
          {viewRecord && (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Candidate Name</div>
                    <div className="font-medium">{viewRecord.invitation.candidate_name || '—'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Candidate Email</div>
                    <div className="font-medium break-words">{viewRecord.invitation.candidate_email}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Interview Date</div>
                    <div className="font-medium">{viewRecord.invitation.interview_date ? formatDate(viewRecord.invitation.interview_date) : '—'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Interview Time</div>
                    <div className="font-medium">{viewRecord.invitation.interview_time || '—'}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-muted-foreground">Skills</div>
                    <div className="font-medium whitespace-pre-wrap break-words">{viewRecord.invitation.candidate_skills || '—'}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-muted-foreground">Experience</div>
                    <div className="font-medium whitespace-pre-wrap">{viewRecord.invitation.experience || '—'}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-muted-foreground">Projects</div>
                    <div className="font-medium whitespace-pre-wrap">{viewRecord.invitation.candidate_projects || '—'}</div>
                  </div>
                </div>

                {/* Summary section */}
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Generated Summary</h4>
                    {viewRecord.summary?.created_at ? (
                      <span className="text-xs text-muted-foreground">Saved {formatDate(viewRecord.summary.created_at)}</span>
                    ) : (
                      viewRecord.invitation.summary && (
                        <span className="text-xs text-muted-foreground">Saved in invitation</span>
                      )
                    )}
                  </div>
                  <div className="text-sm whitespace-pre-wrap bg-muted/30 rounded-md p-3">
                    {viewRecord.summary?.summary || viewRecord.invitation.summary || 'No summary saved'}
                  </div>
                </div>

                {/* PDF note */}
                <div className="border-t pt-3 text-xs text-muted-foreground">
                  PDF uploaded at invite time is used for this summary (stored as text extraction). Original file storage is not retained in DB.
                </div>
              </div>
            </ScrollArea>
          )}
          </DialogContent>
        </Dialog>
      {/* Delete confirmation dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
            <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Delete Invitation
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the invitation for{' '}
              <span className="font-semibold">{deleteTarget?.name || 'this candidate'}</span>? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button
              variant="destructive"
              onClick={handleDeleteInterview}
              disabled={isDeletingInvitation}
              className="gap-2"
            >
              {isDeletingInvitation ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Yes, Delete
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeleteTarget(null);
              }}
              disabled={isDeletingInvitation}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Notification */}
      <Notification
        type={notification.type}
        title={notification.title}
        message={notification.message}
        isVisible={notification.isVisible}
        onClose={closeNotification}
        autoClose={true}
        duration={3000}
      />
    </div>
  );
}
