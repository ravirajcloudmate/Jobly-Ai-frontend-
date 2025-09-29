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
import { 
  Plus, 
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
  Building
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
    expires_in_hours: 168 // 7 days default
  });

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
      setIsInviteDialogOpen(true);
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

      // Fetch interview invitations (these are the invites we send)
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('interview_invitations')
        .select('*')
        .eq('company_id', userData.company_id)
        .order('created_at', { ascending: false });

      if (invitationsError) {
        console.log('Interview invitations table not available, showing empty state');
        setInterviews([]);
      } else {
        // Get job titles for invitations
        const jobIds = [...new Set((invitationsData || []).map((inv: any) => inv.job_id).filter(Boolean))];
        let jobTitles: { [key: string]: string } = {};
        
        if (jobIds.length > 0) {
          const { data: jobsData } = await supabase
            .from('job_postings')
            .select('id, job_title')
            .in('id', jobIds);
          
          if (jobsData) {
            jobTitles = jobsData.reduce((acc: { [key: string]: string }, job: any) => {
              acc[job.id] = job.job_title;
              return acc;
            }, {});
          }
        }

        // Transform invitation data to display format
        const transformedData = (invitationsData || []).map((inv: any) => ({
          id: inv.id,
          candidateName: inv.candidate_name || inv.candidate_email.split('@')[0],
          email: inv.candidate_email,
          jobTitle: jobTitles[inv.job_id] || 'Position',
          status: getInterviewStatus(inv.status),
          progress: getProgressFromStatus(inv.status),
          invitedDate: inv.created_at,
          completedDate: inv.interview_completed_at,
          duration: inv.interview_duration ? `${inv.interview_duration} min` : null,
      score: null,
          link: inv.interview_link,
          invitation_id: inv.id,
          job_id: inv.job_id,
          type: 'invitation',
          expires_at: inv.expires_at,
          reminder_count: inv.reminder_sent_count || 0
        }));
        
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
  const getInterviewStatus = (dbStatus: string) => {
    switch (dbStatus) {
      case 'completed': return 'Completed';
      case 'in_progress': case 'started': return 'In Progress';
      case 'scheduled': case 'sent': case 'opened': return 'Not Started';
      case 'cancelled': case 'expired': return 'Expired';
      default: return 'Not Started';
    }
  };

  const getProgressFromStatus = (dbStatus: string) => {
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
      case 'Not Started': return <Clock className="h-4 w-4 text-orange-600" />;
      case 'Expired': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'default';
      case 'In Progress': return 'secondary';
      case 'Not Started': return 'outline';
      case 'Expired': return 'destructive';
      default: return 'secondary';
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // TODO: Add toast notification
      console.log('Link copied to clipboard');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleInviteCandidate = async () => {
    if (!user?.id) return;

    try {
      setInviteLoading(true);
      setError('');

      // Validate form
      if (!inviteForm.candidate_email || !inviteForm.job_id) {
        setError('Please fill in all required fields');
        return;
      }

      // Get user's company_id
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) {
        setError('User not linked to company');
        return;
      }

      // Create interview invitation using RPC
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
        console.error('Error creating invitation:', inviteError);
        setError('Failed to create interview invitation');
        return;
      }

      // Send email invitation
      const emailResponse = await fetch('/api/send-interview-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteForm.candidate_email,
          candidateName: inviteForm.candidate_name || inviteForm.candidate_email.split('@')[0],
          interviewLink: invitationData[0]?.interview_link,
          jobTitle: jobPostings.find(job => job.id === inviteForm.job_id)?.job_title || 'Position',
          companyName: user.company || 'Company'
        })
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json().catch(() => ({}));
        console.error('Email sending failed:', errorData);
        setError('Invitation created but email failed to send: ' + (errorData.error || 'Unknown error'));
      } else {
        console.log('Interview invitation sent successfully');
        
        // Show success notification
        const jobTitle = jobPostings.find(job => job.id === inviteForm.job_id)?.job_title || 'Position';
        const candidateName = inviteForm.candidate_name || inviteForm.candidate_email.split('@')[0];
        showNotification(
          'success',
          'Interview invitation sent',
          `${candidateName} has been invited for ${jobTitle} position.`
        );
      }

      // Reset form and close dialog
      setInviteForm({
        candidate_email: '',
        candidate_name: '',
        job_id: '',
        expires_in_hours: 168
      });
      setIsInviteDialogOpen(false);
      await loadInterviews();

    } catch (err) {
      console.error('Error inviting candidate:', err);
      setError('Failed to invite candidate');
    } finally {
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
          <h1 className="text-3xl font-bold mb-2">Interview Management</h1>
          <p className="text-muted-foreground">Track interview links, candidate progress, and manage invitations.</p>
        </div>
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2">
              <Plus className="h-4 w-4" />
              Invite Candidate
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Invite New Candidate</DialogTitle>
              <DialogDescription>Generate interview link and send invitation to candidate</DialogDescription>
            </DialogHeader>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Candidate Email *</label>
                  <Input 
                    placeholder="candidate@email.com" 
                    className="mt-1"
                    value={inviteForm.candidate_email}
                    onChange={(e) => setInviteForm({...inviteForm, candidate_email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Candidate Name</label>
                  <Input 
                    placeholder="John Doe" 
                    className="mt-1"
                    value={inviteForm.candidate_name}
                    onChange={(e) => setInviteForm({...inviteForm, candidate_name: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Job Position *</label>
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

              <div>
                <label className="text-sm font-medium">Invitation Expires In</label>
                <select 
                  className="w-full mt-1 p-2 border border-input rounded-md bg-background"
                  value={inviteForm.expires_in_hours}
                  onChange={(e) => setInviteForm({...inviteForm, expires_in_hours: parseInt(e.target.value)})}
                >
                  <option value={24}>24 Hours</option>
                  <option value={72}>3 Days</option>
                  <option value={168}>7 Days (Recommended)</option>
                  <option value={336}>14 Days</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  className="flex-1 gap-2" 
                  onClick={handleInviteCandidate}
                  disabled={inviteLoading}
                >
                  {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send Invitation
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setIsInviteDialogOpen(false)}
                  disabled={inviteLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
                  <Button onClick={() => setIsInviteDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Invite Your First Candidate
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredInterviews.map((interview) => (
            <Card key={interview.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {interview.candidateName.split(' ').map((n: string) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{interview.candidateName}</h3>
                        {getStatusIcon(interview.status)}
                        <Badge variant={getStatusColor(interview.status) as any}>
                          {interview.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{interview.email}</p>
                      <p className="text-sm font-medium">{interview.jobTitle}</p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Invited: {formatDate(interview.invitedDate)}</p>
                    {interview.completedDate && (
                      <p>Completed: {formatDate(interview.completedDate)}</p>
                    )}
                    {interview.type === 'invitation' && interview.expires_at && (
                      <p className={`${new Date(interview.expires_at) < new Date() ? 'text-red-600' : 'text-orange-600'}`}>
                        Expires: {formatDate(interview.expires_at)}
                      </p>
                    )}
                    {interview.reminder_count > 0 && (
                      <p className="text-blue-600">
                        {interview.reminder_count} reminder{interview.reminder_count > 1 ? 's' : ''} sent
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Interview Progress</span>
                      <span>{interview.progress}%</span>
                    </div>
                    <Progress value={interview.progress} className="h-2" />
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Duration: </span>
                      <span>{interview.duration || 'Not started'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Score: </span>
                      <span>{interview.score ? `${interview.score}%` : 'Pending'}</span>
                    </div>
                    {interview.type === 'invitation' && (
                      <div>
                        <span className="text-muted-foreground">Expires: </span>
                        <span className={new Date(interview.expires_at) < new Date() ? 'text-red-600 font-medium' : 'text-orange-600'}>
                          {formatDate(interview.expires_at)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Link: </span>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 px-2 gap-1 text-blue-600"
                        onClick={() => copyToClipboard(interview.link)}
                      >
                        <Link2 className="h-3 w-3" />
                        Copy
                      </Button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    {interview.status === 'Completed' && interview.type === 'interview' && (
                      <Button size="sm" variant="outline" className="gap-1">
                        <Eye className="h-4 w-4" />
                        View Report
                      </Button>
                    )}
                    {interview.status === 'Not Started' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="gap-1"
                        onClick={() => sendReminder(interview.id, interview.email)}
                      >
                        <Send className="h-4 w-4" />
                        Send Reminder
                      </Button>
                    )}
                    {interview.status === 'Expired' && interview.type === 'invitation' && (
                      <Button size="sm" variant="outline" className="gap-1">
                        <RotateCcw className="h-4 w-4" />
                        Extend Deadline
                      </Button>
                    )}
                    {interview.type === 'invitation' && (
                      <Button size="sm" variant="ghost" className="gap-1 text-blue-600">
                        <Calendar className="h-4 w-4" />
                        Invitation
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="gap-1">
                      <Mail className="h-4 w-4" />
                      Contact
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            ))
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
