'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Users, 
  Clock, 
  Globe,
  Video,
  Mic,
  MessageSquare,
  Eye,
  Loader2,
  AlertCircle,
  CheckCircle,
  Pause,
  Play,
  Search,
  Filter,
  MapPin,
  DollarSign,
  Calendar,
  Building
} from 'lucide-react';
import { Notification } from './Notification';
import { PageSkeleton } from './SkeletonLoader';

interface JobPostingsProps {
  user: any;
  globalRefreshKey?: number;
}

export function JobPostings({ user, globalRefreshKey }: JobPostingsProps) {
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [companyIdState, setCompanyIdState] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [viewingJob, setViewingJob] = useState<any>(null);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
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

  // Form state
  const [formData, setFormData] = useState({
    job_title: '',
    department: '',
    job_description: '',
    ai_interview_template: '',
    interview_mode: 'video',
    interview_language: 'en',
    employment_type: 'full-time',
    experience_level: 'mid-level',
    location: '',
    salary_min: '',
    salary_max: '',
    currency: 'USD',
    is_remote: false,
    interview_duration: '30',
    questions_count: '5',
    difficulty_level: 'medium'
  });

  useEffect(() => {
    loadJobs();
  }, [user?.id, reloadKey]);

  // Respond to global refresh key changes
  useEffect(() => {
    if (globalRefreshKey && globalRefreshKey > 0) {
      console.log('JobPostings: Global refresh triggered');
      setReloadKey(prev => prev + 1); // Use increment to ensure refresh
    }
  }, [globalRefreshKey]);

  // Open create dialog if requested via query param
  useEffect(() => {
    const action = searchParams?.get('action');
    if (action === 'create') {
      resetForm();
      setIsCreateDialogOpen(true);
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

  // Realtime updates for job postings
  useEffect(() => {
    if (!companyIdState) return;
    const channel = supabase.channel(`job-postings-rt-${companyIdState}-${Date.now()}`);
    let timer: any;
    const refresh = () => { 
      clearTimeout(timer); 
      timer = setTimeout(() => {
        console.log('JobPostings: Refreshing data due to real-time update');
        setReloadKey(Date.now());
      }, 300); 
    };
    try {
      channel.on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'job_postings', 
        filter: `company_id=eq.${companyIdState}` 
      }, (payload) => {
        console.log('JobPostings: job_postings changed:', payload.eventType);
        refresh();
      });
      channel.subscribe((status) => {
        console.log('JobPostings realtime subscription status:', status);
      });
    } catch (e) { 
      console.error('JobPostings realtime error:', e); 
    }
    return () => { 
      clearTimeout(timer);
      try { 
        supabase.removeChannel(channel);
        console.log('JobPostings: Removed realtime channel');
      } catch (e) {
        console.warn('JobPostings: Error removing channel:', e);
      }
    };
  }, [companyIdState]);

  // Refresh when tab refocuses
  useEffect(() => {
    const onFocus = () => setReloadKey(Date.now());
    const onVis = () => { if (document.visibilityState === 'visible') setReloadKey(Date.now()); };
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

  const loadJobs = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(''); // Clear any previous errors

      // Get user's company_id first
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
        setError('Unable to load user data');
        setLoading(false);
        return;
      }

      if (!userData?.company_id) {
        console.log('No company_id found for user');
        setJobs([]);
        setLoading(false);
        return;
      }

      // Fetch jobs for the company (without join to avoid foreign key issues)
      const { data: jobsData, error: jobsError } = await supabase
        .from('job_postings')
        .select('*')
        .eq('company_id', userData.company_id)
        .order('created_at', { ascending: false });

      if (jobsError) {
        console.error('Error fetching jobs:', JSON.stringify(jobsError, null, 2));
        
        // If table doesn't exist, show empty state without error message
        if (jobsError.code === '42P01') {
          console.log('job_postings table does not exist yet');
          setJobs([]);
          // Don't show error message, just show empty state
      } else {
          // For other errors, just log them but don't show to user
          console.log('Failed to load jobs, showing empty state');
          setJobs([]);
        }
      } else {
        setJobs(jobsData || []);
      }
    } catch (err) {
      console.error('Error loading jobs:', err);
      // Don't show error to user, just show empty state
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async (isDraft = false) => {
    if (!user?.id) return;

    try {
      setFormLoading(true);
      setError('');

      // Get user's company_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.company_id) {
        setError('Unable to create job: User not linked to company');
        return;
      }

      // Validate required fields
      if (!formData.job_title.trim() || !formData.department.trim() || !formData.job_description.trim() || !formData.ai_interview_template.trim()) {
        setError('Please fill in all required fields');
        return;
      }

      // Create job using RPC function
      const { data: jobId, error: createError } = await supabase
        .rpc('create_job_posting', {
          p_company_id: userData.company_id,
          p_created_by: user.id,
          p_job_title: formData.job_title.trim(),
          p_department: formData.department.trim(),
          p_job_description: formData.job_description.trim(),
          p_ai_interview_template: formData.ai_interview_template.trim(),
          p_interview_mode: formData.interview_mode,
          p_interview_language: formData.interview_language,
          p_employment_type: formData.employment_type,
          p_experience_level: formData.experience_level,
          p_location: formData.location.trim() || null,
          p_salary_min: formData.salary_min ? parseInt(formData.salary_min) : null,
          p_salary_max: formData.salary_max ? parseInt(formData.salary_max) : null,
          p_currency: formData.currency,
          p_is_remote: formData.is_remote,
          p_interview_duration: parseInt(formData.interview_duration) || 30,
          p_questions_count: parseInt(formData.questions_count) || 5,
          p_difficulty_level: formData.difficulty_level
        });

      if (createError) {
        console.error('Error creating job:', createError);
        setError('Failed to create job posting');
        return;
      }

      // Update status if publishing
      if (!isDraft && jobId) {
        const { error: updateError } = await supabase
          .rpc('update_job_posting', {
            p_job_id: jobId,
            p_status: 'active'
          });

        if (updateError) {
          console.error('Error publishing job:', updateError);
          setError('Job created but failed to publish');
        }
      }

      // Show success notification
      const statusText = isDraft ? 'draft' : 'active';
      showNotification(
        'success',
        'Successfully added new job position',
        `${formData.job_title} has been created and ${isDraft ? 'saved as draft' : 'published'}.`
      );

      // Reset form and close dialog
      resetForm();
      setIsCreateDialogOpen(false);
      await loadJobs();
      
    } catch (err) {
      console.error('Error creating job:', err);
      setError('Failed to create job posting');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateJob = async (jobId: string, updates: any) => {
    try {
      setFormLoading(true);
      setError('');

      const { error } = await supabase
        .rpc('update_job_posting', {
          p_job_id: jobId,
          ...updates
        });
      
      if (error) {
        console.error('Error updating job:', error);
        setError('Failed to update job');
      } else {
        // Show success notification for update
        showNotification(
          'success',
          'Job position updated',
          `${formData.job_title} has been successfully updated.`
        );

        setIsEditDialogOpen(false);
        setEditingJob(null);
        await loadJobs();
      }
    } catch (err) {
      console.error('Error updating job:', err);
      setError('Failed to update job');
    } finally {
      setFormLoading(false);
    }
  };

  const openDeleteDialog = (jobId: string) => {
    setDeletingJobId(jobId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteJob = async () => {
    if (!deletingJobId) return;
    
    // Find the job being deleted to get its title
    const jobToDelete = jobs.find(job => job.id === deletingJobId);
    const jobTitle = jobToDelete?.job_title || 'Job position';
    
    try {
      setError('');
      const { error } = await supabase
        .rpc('delete_job_posting', { p_job_id: deletingJobId });
      
      if (error) {
        console.error('Error deleting job:', error);
        setError('Failed to delete job');
      } else {
        // Show delete notification
        showNotification(
          'delete',
          'Deleted your job position',
          `${jobTitle} has been permanently removed.`
        );

        await loadJobs();
        setIsDeleteDialogOpen(false);
        setDeletingJobId(null);
      }
    } catch (err) {
      console.error('Error deleting job:', err);
      setError('Failed to delete job');
    }
  };

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    await handleUpdateJob(jobId, { p_status: newStatus });
  };

  const resetForm = () => {
    setFormData({
      job_title: '',
      department: '',
      job_description: '',
      ai_interview_template: '',
      interview_mode: 'video',
      interview_language: 'en',
      employment_type: 'full-time',
      experience_level: 'mid-level',
      location: '',
      salary_min: '',
      salary_max: '',
      currency: 'USD',
      is_remote: false,
      interview_duration: '30',
      questions_count: '5',
      difficulty_level: 'medium'
    });
  };

  const openViewDialog = (job: any) => {
    setViewingJob(job);
    setIsViewDialogOpen(true);
  };

  const openEditDialog = (job: any) => {
    setEditingJob(job);
    setFormData({
      job_title: job.job_title || '',
      department: job.department || '',
      job_description: job.job_description || '',
      ai_interview_template: job.ai_interview_template || '',
      interview_mode: job.interview_mode || 'video',
      interview_language: job.interview_language || 'en',
      employment_type: job.employment_type || 'full-time',
      experience_level: job.experience_level || 'mid-level',
      location: job.location || '',
      salary_min: job.salary_min ? job.salary_min.toString() : '',
      salary_max: job.salary_max ? job.salary_max.toString() : '',
      currency: job.currency || 'USD',
      is_remote: job.is_remote || false,
      interview_duration: job.interview_duration ? job.interview_duration.toString() : '30',
      questions_count: job.questions_count ? job.questions_count.toString() : '5',
      difficulty_level: job.difficulty_level || 'medium'
    });
    setIsEditDialogOpen(true);
  };

  // Filter jobs based on search and filters
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.job_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.job_description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = filterDepartment === 'all' || job.department === filterDepartment;
    const matchesStatus = filterStatus === 'all' || job.status === filterStatus;
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const templates = [
    { 
      id: 'developer', 
      name: 'Software Developer', 
      template: 'Ask about technical skills, problem-solving abilities, coding practices, experience with frameworks, debugging skills, and system design thinking.'
    },
    { 
      id: 'sales', 
      name: 'Sales Representative', 
      template: 'Focus on communication skills, persuasion techniques, customer relationship management, target achievement, objection handling, and sales process understanding.'
    },
    { 
      id: 'support', 
      name: 'Customer Support', 
      template: 'Evaluate empathy, problem resolution skills, patience, communication clarity, technical troubleshooting, and customer satisfaction focus.'
    },
    { 
      id: 'marketing', 
      name: 'Marketing Manager', 
      template: 'Assess strategic thinking, creativity, analytics understanding, campaign management, brand awareness, and digital marketing expertise.'
    },
    { 
      id: 'hr', 
      name: 'HR Professional', 
      template: 'Test knowledge of recruitment, employee relations, policy development, conflict resolution, performance management, and legal compliance.'
    },
    { 
      id: 'finance', 
      name: 'Finance Analyst', 
      template: 'Examine financial analysis skills, budgeting experience, forecasting abilities, risk assessment, regulatory knowledge, and attention to detail.'
    }
  ];

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'audio': return <Mic className="h-4 w-4" />;
      case 'text': return <MessageSquare className="h-4 w-4" />;
      default: return <Video className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'draft': return 'secondary';
      case 'paused': return 'outline';
      case 'closed': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'draft': return <Clock className="h-4 w-4" />;
      case 'paused': return <Pause className="h-4 w-4" />;
      case 'closed': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatSalary = (min?: number, max?: number, currency = 'USD') => {
    if (!min && !max) return 'Salary not specified';
    if (min && max) return `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}`;
    if (min) return `${currency} ${min.toLocaleString()}+`;
    return `Up to ${currency} ${max?.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const departments = [...new Set(jobs.map(job => job.department))];

  // Show skeleton loader when loading
  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Job Postings</h1>
          <p className="text-muted-foreground">Create and manage job openings with AI interview templates.</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2" onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
              <Plus className="h-4 w-4" />
              Create New Job
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Job Posting</DialogTitle>
              <DialogDescription>Set up a new job posting with AI interview configuration</DialogDescription>
            </DialogHeader>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-6 pt-4">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="job-title">Job Title *</Label>
                  <Input 
                    id="job-title" 
                    placeholder="e.g. Senior Frontend Developer" 
                    className="mt-1"
                    value={formData.job_title}
                    onChange={(e) => setFormData({...formData, job_title: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="department">Department *</Label>
                  <Select value={formData.department} onValueChange={(value) => setFormData({...formData, department: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="engineering">Engineering</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                      <SelectItem value="hr">Human Resources</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="job-description">Job Description *</Label>
                <Textarea 
                  id="job-description" 
                  placeholder="Describe the role, responsibilities, and requirements..."
                  className="mt-1"
                  rows={4}
                  value={formData.job_description}
                  onChange={(e) => setFormData({...formData, job_description: e.target.value})}
                />
              </div>

              {/* Employment Details */}
              <div className="grid grid-cols-3 gap-4">
              <div>
                  <Label>Employment Type</Label>
                  <Select value={formData.employment_type} onValueChange={(value) => setFormData({...formData, employment_type: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full Time</SelectItem>
                      <SelectItem value="part-time">Part Time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Experience Level</Label>
                  <Select value={formData.experience_level} onValueChange={(value) => setFormData({...formData, experience_level: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry-level">Entry Level</SelectItem>
                      <SelectItem value="mid-level">Mid Level</SelectItem>
                      <SelectItem value="senior-level">Senior Level</SelectItem>
                      <SelectItem value="executive">Executive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input 
                    id="location" 
                    placeholder="e.g. New York, NY"
                    className="mt-1"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                  />
                </div>
              </div>

              {/* Salary */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="salary-min">Min Salary</Label>
                  <Input 
                    id="salary-min" 
                    type="number"
                    placeholder="50000"
                    className="mt-1"
                    value={formData.salary_min}
                    onChange={(e) => setFormData({...formData, salary_min: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="salary-max">Max Salary</Label>
                  <Input 
                    id="salary-max" 
                    type="number"
                    placeholder="80000"
                    className="mt-1"
                    value={formData.salary_max}
                    onChange={(e) => setFormData({...formData, salary_max: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Select value={formData.currency} onValueChange={(value) => setFormData({...formData, currency: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="INR">INR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <input 
                    type="checkbox" 
                    id="is-remote"
                    checked={formData.is_remote}
                    onChange={(e) => setFormData({...formData, is_remote: e.target.checked})}
                  />
                  <Label htmlFor="is-remote">Remote Work</Label>
                </div>
              </div>

              {/* AI Interview Template */}
              <div>
                <Label className="text-base">AI Interview Template *</Label>
                <div className="grid grid-cols-1 gap-3 mt-2">
                  {templates.map((template) => (
                    <div key={template.id} className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                      <input 
                        type="radio" 
                        name="template" 
                        value={template.template}
                        checked={formData.ai_interview_template === template.template}
                        onChange={(e) => setFormData({...formData, ai_interview_template: e.target.value})}
                        className="w-4 h-4 mt-1" 
                      />
                      <div className="flex-1">
                        <p className="font-medium">{template.name}</p>
                        <p className="text-sm text-muted-foreground">{template.template}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-start space-x-3 p-3 border rounded-lg">
                    <input 
                      type="radio" 
                      name="template" 
                      value="custom"
                      checked={!templates.some(t => t.template === formData.ai_interview_template) && formData.ai_interview_template !== ''}
                      onChange={() => setFormData({...formData, ai_interview_template: 'custom'})}
                      className="w-4 h-4 mt-1" 
                    />
                    <div className="flex-1">
                      <p className="font-medium">Custom Template</p>
                      <Textarea 
                        placeholder="Write your custom AI interview template..."
                        className="mt-2"
                        rows={3}
                        value={formData.ai_interview_template === 'custom' ? '' : (templates.some(t => t.template === formData.ai_interview_template) ? '' : formData.ai_interview_template)}
                        onChange={(e) => setFormData({...formData, ai_interview_template: e.target.value})}
                        disabled={templates.some(t => t.template === formData.ai_interview_template)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Interview Configuration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Interview Mode</Label>
                  <Select value={formData.interview_mode} onValueChange={(value) => setFormData({...formData, interview_mode: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4" />
                          Video Interview
                        </div>
                      </SelectItem>
                      <SelectItem value="audio">
                        <div className="flex items-center gap-2">
                          <Mic className="h-4 w-4" />
                          Audio Only
                        </div>
                      </SelectItem>
                      <SelectItem value="text">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Text Based
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Language</Label>
                  <Select value={formData.interview_language} onValueChange={(value) => setFormData({...formData, interview_language: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                      <SelectItem value="zh">Chinese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input 
                    id="duration" 
                    type="number"
                    min="10"
                    max="120"
                    className="mt-1"
                    value={formData.interview_duration}
                    onChange={(e) => setFormData({...formData, interview_duration: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="questions">Questions Count</Label>
                  <Input 
                    id="questions" 
                    type="number"
                    min="3"
                    max="15"
                    className="mt-1"
                    value={formData.questions_count}
                    onChange={(e) => setFormData({...formData, questions_count: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Difficulty Level</Label>
                  <Select value={formData.difficulty_level} onValueChange={(value) => setFormData({...formData, difficulty_level: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={() => handleCreateJob(false)} 
                  disabled={formLoading}
                  className="gap-2"
                >
                  {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Create & Publish
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleCreateJob(true)}
                  disabled={formLoading}
                  className="gap-2"
                >
                  {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                  Save as Draft
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={formLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search jobs by title, department, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterDepartment} onValueChange={setFilterDepartment}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(dept => (
              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Jobs Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Jobs ({filteredJobs.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({filteredJobs.filter(j => j.status === 'active').length})</TabsTrigger>
          <TabsTrigger value="draft">Drafts ({filteredJobs.filter(j => j.status === 'draft').length})</TabsTrigger>
          <TabsTrigger value="paused">Paused ({filteredJobs.filter(j => j.status === 'paused').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {filteredJobs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No job postings found</h3>
                <p className="text-muted-foreground mb-4">
                  {jobs.length === 0 ? 'Create your first job posting to start hiring.' : 'Try adjusting your search or filters.'}
                </p>
                {jobs.length === 0 && (
                  <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Your First Job
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredJobs.map((job) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                      <CardTitle className="text-xl">{job.job_title}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building className="h-4 w-4" />
                          {job.department}
                        </span>
                        <span className="capitalize">{job.employment_type}</span>
                      <div className="flex items-center gap-1">
                          {getModeIcon(job.interview_mode)}
                          <span className="capitalize">{job.interview_mode}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Globe className="h-4 w-4" />
                          <span>{job.interview_language.toUpperCase()}</span>
                      </div>
                        {job.is_remote && (
                          <Badge variant="secondary">Remote</Badge>
                        )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                      <Badge variant={getStatusColor(job.status) as any} className="gap-1">
                        {getStatusIcon(job.status)}
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {job.job_description}
                    </p>
                  
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>{formatSalary(job.salary_min, job.salary_max, job.currency)}</span>
                      </div>
                      {job.location && (
                      <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{job.location}</span>
                      </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Created {formatDate(job.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{job.applications_count} applications</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                      <Badge variant="outline">
                          {job.experience_level.replace('-', ' ')}
                        </Badge>
                        <Badge variant="outline">
                          {job.interview_duration}min interview
                        </Badge>
                        <Badge variant="outline">
                          {job.questions_count} questions
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="gap-1"
                          onClick={() => openViewDialog(job)}
                        >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1">
                        <Copy className="h-4 w-4" />
                          Share
                      </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="gap-1"
                          onClick={() => openEditDialog(job)}
                        >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                        {job.status === 'active' ? (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="gap-1 text-orange-600 hover:text-orange-700"
                            onClick={() => handleStatusChange(job.id, 'paused')}
                          >
                            <Pause className="h-4 w-4" />
                            Pause
                          </Button>
                        ) : job.status === 'paused' ? (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="gap-1 text-green-600 hover:text-green-700"
                            onClick={() => handleStatusChange(job.id, 'active')}
                          >
                            <Play className="h-4 w-4" />
                            Activate
                          </Button>
                        ) : null}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="gap-1 text-red-600 hover:text-red-700"
                          onClick={() => openDeleteDialog(job.id)}
                        >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            ))
          )}
        </TabsContent>

        {/* Other tab contents */}
        {['active', 'draft', 'paused'].map(status => (
          <TabsContent key={status} value={status} className="space-y-4">
            {filteredJobs.filter(job => job.status === status).map((job) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                  <CardTitle>{job.job_title}</CardTitle>
                  <CardDescription>
                    {job.department} • {job.applications_count} applications • Created {formatDate(job.created_at)}
                  </CardDescription>
              </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm">
                      <span>{formatSalary(job.salary_min, job.salary_max, job.currency)}</span>
                      <div className="flex items-center gap-1">
                        {getModeIcon(job.interview_mode)}
                        <span className="capitalize">{job.interview_mode}</span>
                      </div>
                      <Badge variant="outline">{job.experience_level.replace('-', ' ')}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(job)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-600"
                        onClick={() => openDeleteDialog(job.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
            </Card>
          ))}
        </TabsContent>
        ))}
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Job Posting</DialogTitle>
            <DialogDescription>Update job posting details and AI interview configuration</DialogDescription>
          </DialogHeader>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Same form as create dialog but for editing */}
          <div className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-job-title">Job Title *</Label>
                <Input 
                  id="edit-job-title" 
                  className="mt-1"
                  value={formData.job_title}
                  onChange={(e) => setFormData({...formData, job_title: e.target.value})}
                />
              </div>
              <div>
                <Label>Department *</Label>
                <Select value={formData.department} onValueChange={(value) => setFormData({...formData, department: value})}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engineering">Engineering</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="hr">Human Resources</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Job Description *</Label>
              <Textarea 
                className="mt-1"
                rows={4}
                value={formData.job_description}
                onChange={(e) => setFormData({...formData, job_description: e.target.value})}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                onClick={() => editingJob && handleUpdateJob(editingJob.id, {
                  p_job_title: formData.job_title,
                  p_department: formData.department,
                  p_job_description: formData.job_description,
                  p_ai_interview_template: formData.ai_interview_template,
                  p_interview_mode: formData.interview_mode,
                  p_interview_language: formData.interview_language,
                  p_employment_type: formData.employment_type,
                  p_experience_level: formData.experience_level,
                  p_location: formData.location || null,
                  p_salary_min: formData.salary_min ? parseInt(formData.salary_min) : null,
                  p_salary_max: formData.salary_max ? parseInt(formData.salary_max) : null,
                  p_currency: formData.currency,
                  p_is_remote: formData.is_remote,
                  p_interview_duration: parseInt(formData.interview_duration) || 30,
                  p_questions_count: parseInt(formData.questions_count) || 5,
                  p_difficulty_level: formData.difficulty_level
                })}
                disabled={formLoading}
                className="gap-2"
              >
                {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Update Job
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setIsEditDialogOpen(false)}
                disabled={formLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Job Posting Details</DialogTitle>
            <DialogDescription>View complete job posting information</DialogDescription>
          </DialogHeader>
          
          {viewingJob && (
            <div className="space-y-6 pt-4">
              {/* Job Header */}
              <div className="border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-900">{viewingJob.job_title}</h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Building className="h-4 w-4" />
                    {viewingJob.department}
                  </span>
                  <span className="capitalize">{viewingJob.employment_type}</span>
                  <span className="capitalize">{viewingJob.experience_level.replace('-', ' ')}</span>
                  {viewingJob.is_remote && <Badge variant="secondary">Remote</Badge>}
                  <Badge variant={getStatusColor(viewingJob.status) as any} className="gap-1">
                    {getStatusIcon(viewingJob.status)}
                    {viewingJob.status.charAt(0).toUpperCase() + viewingJob.status.slice(1)}
                  </Badge>
                </div>
              </div>

              {/* Job Details Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Job Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Department:</span>
                        <span className="font-medium">{viewingJob.department}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Employment Type:</span>
                        <span className="font-medium capitalize">{viewingJob.employment_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Experience Level:</span>
                        <span className="font-medium capitalize">{viewingJob.experience_level.replace('-', ' ')}</span>
                      </div>
                      {viewingJob.location && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Location:</span>
                          <span className="font-medium">{viewingJob.location}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Salary:</span>
                        <span className="font-medium">{formatSalary(viewingJob.salary_min, viewingJob.salary_max, viewingJob.currency)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Interview Configuration</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Mode:</span>
                        <span className="font-medium flex items-center gap-1">
                          {getModeIcon(viewingJob.interview_mode)}
                          {viewingJob.interview_mode.charAt(0).toUpperCase() + viewingJob.interview_mode.slice(1)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Language:</span>
                        <span className="font-medium">{viewingJob.interview_language.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium">{viewingJob.interview_duration} minutes</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Questions:</span>
                        <span className="font-medium">{viewingJob.questions_count} questions</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Difficulty:</span>
                        <span className="font-medium capitalize">{viewingJob.difficulty_level}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Statistics</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Applications:</span>
                        <span className="font-medium">{viewingJob.applications_count || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span className="font-medium">{formatDate(viewingJob.created_at)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Updated:</span>
                        <span className="font-medium">{formatDate(viewingJob.updated_at)}</span>
                      </div>
                      {viewingJob.published_at && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Published:</span>
                          <span className="font-medium">{formatDate(viewingJob.published_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Job Description */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Job Description</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{viewingJob.job_description}</p>
                </div>
              </div>

              {/* AI Interview Template */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">AI Interview Template</h3>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-800 whitespace-pre-wrap">{viewingJob.ai_interview_template}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    openEditDialog(viewingJob);
                  }}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit Job
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsViewDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Delete Job Posting
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this job posting? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex gap-3 pt-4">
            <Button 
              variant="destructive" 
              onClick={handleDeleteJob}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Yes, Delete
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingJobId(null);
              }}
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
