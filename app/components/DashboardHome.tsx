import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Users, 
  Briefcase, 
  FileText, 
  TrendingUp,
  Clock,
  Calendar,
  Loader2,
  Bot,
  Mail
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { DashboardSkeleton } from './SkeletonLoader';

interface DashboardHomeProps {
  user: any;
  globalRefreshKey?: number;
}

export function DashboardHome({ user, globalRefreshKey }: DashboardHomeProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [companyIdState, setCompanyIdState] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [stats, setStats] = useState([
    { label: 'Active Job Postings', value: '0', icon: Briefcase, color: 'text-blue-600' },
    { label: 'Candidates Interviewed', value: '0', icon: Users, color: 'text-green-600' },
    { label: 'Pending Reports', value: '0', icon: FileText, color: 'text-orange-600' },
    { label: 'This Month Hires', value: '0', icon: TrendingUp, color: 'text-purple-600' },
  ]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [calendarNotifications, setCalendarNotifications] = useState<any[]>([]);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [pausedJobs, setPausedJobs] = useState<any[]>([]);

  // Radial progress component for stats
  const RadialStat = ({ label, value, percent, colorClass }: { label: string; value: number; percent: number; colorClass: string }) => {
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.max(0, Math.min(100, percent || 0));
    const offset = circumference * (1 - clamped / 100);

    return (
      <div className="flex flex-col items-center justify-center p-4 rounded-xl border bg-background">
        <svg width="100" height="100" viewBox="0 0 100 100" className="mb-2">
          <circle cx="50" cy="50" r={radius} stroke="#E5E7EB" strokeWidth="10" fill="none" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            strokeWidth="10"
            fill="none"
            className={colorClass}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
          />
          <text x="50" y="50" textAnchor="middle" dominantBaseline="central" className="text-xl font-bold fill-current">
            {value}
          </text>
        </svg>
        <div className="text-sm text-muted-foreground text-center leading-tight">{label}</div>
      </div>
    );
  };

  // Two-color donut for Active vs Paused Job Postings
  const ActiveJobsDonut = ({ activeCount, pausedCount }: { activeCount: number; pausedCount: number }) => {
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const total = Math.max(0, (activeCount || 0) + (pausedCount || 0));
    const activeLen = total > 0 ? (activeCount / total) * circumference : 0;
    const pausedLen = total > 0 ? (pausedCount / total) * circumference : 0;
    const baseOffset = 0;
    const activeColor = '#16a34a'; // green
    const pausedColor = '#f59e0b'; // orange
    return (
      <div className="flex flex-col items-center justify-center p-4 rounded-xl border bg-background">
        <svg width="100" height="100" viewBox="0 0 100 100" className="mb-2">
          <circle cx="50" cy="50" r={radius} stroke="#E5E7EB" strokeWidth="10" fill="none" />
          {/* Active segment */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            strokeWidth="10"
            fill="none"
            stroke={activeColor}
            strokeDasharray={`${activeLen} ${circumference - activeLen}`}
            strokeDashoffset={-baseOffset}
            strokeLinecap="butt"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
          />
          {/* Paused segment follows active */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            strokeWidth="10"
            fill="none"
            stroke={pausedColor}
            strokeDasharray={`${pausedLen} ${circumference - pausedLen}`}
            strokeDashoffset={-(baseOffset + activeLen)}
            strokeLinecap="butt"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
          />
          <text x="50" y="50" textAnchor="middle" dominantBaseline="central" className="text-xl font-bold fill-current">
            {total}
          </text>
        </svg>
        <div className="text-sm text-muted-foreground text-center leading-tight">Active vs Paused Jobs</div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1"><span style={{background: activeColor}} className="w-3 h-3 inline-block rounded-full" /> Active: {activeCount}</div>
          <div className="flex items-center gap-1"><span style={{background: pausedColor}} className="w-3 h-3 inline-block rounded-full" /> Paused: {pausedCount}</div>
        </div>
      </div>
    );
  };

  // Fetch dynamic dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);

        // Get user's company_id (try with subscription fields first, fallback without them)
        let userData, userError;
        
        // First try to get all fields including subscription
        const { data: userDataFull, error: userErrorFull } = await supabase
          .from('users')
          .select('company_id, subscription_plan, subscription_status')
          .eq('id', user.id)
          .maybeSingle();

        if (userErrorFull && userErrorFull.code === '42703') {
          // Column doesn't exist, try without subscription fields
          console.log('Subscription columns not found, falling back to basic user data');
          const { data: userDataBasic, error: userErrorBasic } = await supabase
            .from('users')
            .select('company_id')
            .eq('id', user.id)
            .maybeSingle();
          
          userData = userDataBasic;
          userError = userErrorBasic;
        } else {
          userData = userDataFull;
          userError = userErrorFull;
        }

        if (userError) {
          // If user doesn't exist (PGRST116), handle gracefully
          if (userError.code === 'PGRST116') {
            console.log('ℹ️ User not found in database (PGRST116), setting default values');
          } else {
            console.error('Error fetching user data:', JSON.stringify(userError, null, 2));
            console.log('User might not exist in users table or RLS policy might be blocking access');
          }
          
          // Set default values for new users
          setStats([
            { label: 'Active Job Postings', value: '0', icon: Briefcase, color: 'text-blue-600' },
            { label: 'Candidates Interviewed', value: '0', icon: Users, color: 'text-green-600' },
            { label: 'Pending Reports', value: '0', icon: FileText, color: 'text-orange-600' },
            { label: 'This Month Hires', value: '0', icon: TrendingUp, color: 'text-purple-600' },
          ]);
          setRecentActivity([]);
          setCalendarNotifications([]);
          setLoading(false);
          return;
        }

        const companyId = userData?.company_id;
        if (!companyId) {
          console.log('No company_id found for user - setting up default dashboard');
          
          // Set default values for users without company
          setStats([
            { label: 'Active Job Postings', value: '0', icon: Briefcase, color: 'text-blue-600' },
            { label: 'Candidates Interviewed', value: '0', icon: Users, color: 'text-green-600' },
            { label: 'Pending Reports', value: '0', icon: FileText, color: 'text-orange-600' },
            { label: 'This Month Hires', value: '0', icon: TrendingUp, color: 'text-purple-600' },
          ]);
          setRecentActivity([]);
          setCalendarNotifications([]);
          setLoading(false);
          return;
        }

        // Store for realtime subscriptions
        if (companyId !== companyIdState) setCompanyIdState(companyId);

        // Fetch stats in parallel with error handling for missing tables
        const fetchWithFallback = async (tableName: string, query: any) => {
          try {
            return await query;
          } catch (error: any) {
            if (error?.code === '42P01') {
              console.log(`Table ${tableName} does not exist, returning empty result`);
              return { data: [], error: null };
            }
            return { data: [], error };
          }
        };

        const [jobsResult, candidatesResult, interviewsResult, reportsResult] = await Promise.all([
          // Active Job Postings - try job_postings first, fallback to jobs
          fetchWithFallback('job_postings', supabase
            .from('job_postings')
            .select('id')
            .eq('company_id', companyId)
            .eq('status', 'active'))
            .then(result => result.error && result.error.code === '42P01' ? 
              fetchWithFallback('jobs', supabase
                .from('jobs')
                .select('id')
                .eq('company_id', companyId)
                .eq('status', 'active')) : result),
          
          // Total Candidates Interviewed (from interviews) - prefer completed/finished
          fetchWithFallback('interviews', supabase
            .from('interviews')
            .select('candidate_id, status')
            .eq('company_id', companyId)
          ),
          
          // Completed Interviews
          fetchWithFallback('interviews', supabase
            .from('interviews')
            .select('id')
            .eq('company_id', companyId)
            .eq('status', 'completed')),
          
          // Pending Reports (interview_reports has no status column; treat recommendation IS NULL as pending)
          fetchWithFallback('interview_reports', supabase
            .from('interview_reports')
            .select('id')
            .eq('company_id', companyId)
            .is('recommendation', null))
        ]);

        // Also fetch list of jobs for donuts (active & paused)
        const activeJobsListResult = await fetchWithFallback('job_postings', supabase
          .from('job_postings')
          .select('id, job_title, created_at')
          .eq('company_id', companyId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
        );
        setActiveJobs(activeJobsListResult.data || []);

        const pausedJobsListResult = await fetchWithFallback('job_postings', supabase
          .from('job_postings')
          .select('id, job_title, created_at')
          .eq('company_id', companyId)
          .eq('status', 'paused')
          .order('created_at', { ascending: false })
        );
        setPausedJobs(pausedJobsListResult.data || []);

        // Calculate this month's hires (interviews with status 'hired')
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        // Treat hires as interview_reports with recommendation='hire' in current month
        const hiresResult = await fetchWithFallback('interview_reports', supabase
          .from('interview_reports')
          .select('id')
          .eq('company_id', companyId)
          .eq('recommendation', 'hire')
          .gte('created_at', startOfMonth.toISOString()));

        const hiresData = hiresResult.data;

        // Update stats
        // Derive candidate interviewed count (distinct candidates, prefer completed)
        let interviewedCount = 0;
        if (Array.isArray(interviewsResult.data)) {
          const completed = interviewsResult.data.filter((i: any) => i.status === 'completed' || i.status === 'hired');
          const source = completed.length > 0 ? completed : interviewsResult.data;
          const uniqueCandidateIds = new Set<string>();
          for (const row of source) {
            if (row.candidate_id) uniqueCandidateIds.add(row.candidate_id);
          }
          interviewedCount = uniqueCandidateIds.size;
        }

        setStats([
          { label: 'Active Job Postings', value: (jobsResult.data?.length || 0).toString(), icon: Briefcase, color: 'text-blue-600' },
          { label: 'Candidates Interviewed', value: interviewedCount.toString(), icon: Users, color: 'text-green-600' },
          { label: 'Pending Reports', value: (reportsResult.data?.length || 0).toString(), icon: FileText, color: 'text-orange-600' },
          { label: 'This Month Hires', value: (hiresData?.length || 0).toString(), icon: TrendingUp, color: 'text-purple-600' },
        ]);

        // Fetch recent activity (latest interviews and jobs)
        // Recent Interviews (avoid joins/denormalized columns; use minimal fields)
        const recentInterviewsResult = await fetchWithFallback('interviews', supabase
          .from('interviews')
          .select('id, status, created_at, updated_at')
          .eq('company_id', companyId)
          .order('updated_at', { ascending: false })
          .limit(3));

        const recentJobsResult = await fetchWithFallback('job_postings', supabase
          .from('job_postings')
          .select(`
            id,
            job_title,
            status,
            created_at
          `)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(2));

        const recentAgentsResult = await fetchWithFallback('prompt_templates', supabase
          .from('prompt_templates')
          .select('id, name, created_at')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(2));

        const recentInvitationsResult = await fetchWithFallback('interview_invitations', supabase
          .from('interview_invitations')
          .select('id, candidate_name, candidate_email, job_postings(job_title), created_at')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(2));

        // Fallback to jobs table if job_postings doesn't exist
        let recentJobsData = recentJobsResult.data;
        if (recentJobsResult.error && recentJobsResult.error.code === '42P01') {
          const fallbackJobsResult = await fetchWithFallback('jobs', supabase
            .from('jobs')
            .select(`
              id,
              title,
              status,
              created_at
            `)
            .eq('company_id', companyId)
            .order('created_at', { ascending: false })
            .limit(2));
          recentJobsData = fallbackJobsResult.data;
        }

        const recentInterviews = recentInterviewsResult.data;
        const recentJobs = recentJobsData;
        const recentAgents = recentAgentsResult.data;
        const recentInvitations = recentInvitationsResult.data;

        // Combine and format recent activity
        const activities = [];
        
        if (recentInterviews) {
          activities.push(...recentInterviews.map((interview: any) => ({
            type: 'interview',
            candidate: 'Interview updated',
            role: `Status: ${interview.status || 'pending'}`,
            time: getTimeAgo(interview.updated_at || interview.created_at),
            status: interview.status || 'pending'
          })));
        }

        if (recentJobs) {
          activities.push(...recentJobs.map((job: any) => ({
            type: 'job',
            candidate: 'New Job Posted',
            role: job.job_title || job.title || 'Unknown Position',
            time: getTimeAgo(job.created_at),
            status: job.status || 'active'
          })));
        }

        if (recentAgents) {
          activities.push(...recentAgents.map((agent: any) => ({
            type: 'agent',
            candidate: 'New AI Agent Created',
            role: agent.name || 'AI Agent',
            time: getTimeAgo(agent.created_at),
            status: 'created'
          })));
        }

        if (recentInvitations) {
          activities.push(...recentInvitations.map((invite: any) => ({
            type: 'invite',
            candidate: invite.candidate_name || invite.candidate_email || 'Candidate Invited',
            role: invite.job_postings?.job_title || 'Interview Invitation',
            time: getTimeAgo(invite.created_at),
            status: 'invited'
          })));
        }

        // Sort by most recent and limit to 4
        activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setRecentActivity(activities.slice(0, 4));

        // Fetch upcoming calendar events (interviews)
        const upcomingInterviewsResult = await fetchWithFallback('interview_invitations', supabase
          .from('interview_invitations')
          .select(`
            id,
            candidate_name,
            candidate_email,
            interview_date,
            interview_time,
            job_postings (
              job_title
            )
          `)
          .eq('company_id', companyId)
          .not('interview_date', 'is', null)
          .gte('interview_date', new Date().toISOString().split('T')[0])
          .order('interview_date', { ascending: true })
          .order('interview_time', { ascending: true })
          .limit(5));

        const upcomingInterviews = (upcomingInterviewsResult.data || []).map((inv: any) => {
          let normalizedDate = inv.interview_date;
          if (normalizedDate) {
            if (normalizedDate instanceof Date) {
              normalizedDate = normalizedDate.toISOString().split('T')[0];
            } else if (typeof normalizedDate === 'string') {
              normalizedDate = normalizedDate.split('T')[0];
            }
          }

          // Format date for display
          const dateObj = new Date(normalizedDate + 'T00:00:00'); // Add time to avoid timezone issues
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayStr = today.toISOString().split('T')[0];
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = tomorrow.toISOString().split('T')[0];
          
          let dateDisplay = '';
          if (normalizedDate === todayStr) {
            dateDisplay = 'Today';
          } else if (normalizedDate === tomorrowStr) {
            dateDisplay = 'Tomorrow';
          } else {
            dateDisplay = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: dateObj.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
          }

          return {
            id: inv.id,
            candidate_name: inv.candidate_name || inv.candidate_email || 'Candidate',
            job_title: inv.job_postings?.job_title || 'Interview',
            date: normalizedDate,
            dateDisplay: dateDisplay,
            time: inv.interview_time || 'TBD',
            fullDate: dateObj
          };
        });

        setCalendarNotifications(upcomingInterviews);

      } catch (error) {
        console.error('Error fetching dashboard data:', JSON.stringify(error, null, 2));
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.id, reloadKey]);

  // Respond to global refresh key changes
  useEffect(() => {
    if (globalRefreshKey && globalRefreshKey > 0) {
      console.log('DashboardHome: Global refresh triggered');
      setReloadKey(prev => prev + 1); // Use increment to ensure refresh
    }
  }, [globalRefreshKey]);

  // Realtime subscriptions: refresh stats/activity when related tables change
  useEffect(() => {
    if (!companyIdState) return;

    const channel = supabase.channel(`dashboard-rt-${companyIdState}-${Date.now()}`);

    // Helper to refresh with proper debouncing
    let refreshTimeout: any;
    const scheduleRefresh = () => {
      clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        console.log('Dashboard: Refreshing data due to real-time update');
        setReloadKey(Date.now());
      }, 300);
    };

    try {
      // Subscribe to all relevant tables
      const tables = [
        'job_postings',
        'interviews', 
        'interview_reports',
        'interview_invitations',
        'candidates',
        'users',
        'companies',
        'company_branding'
      ];

      tables.forEach(table => {
        channel.on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: table, 
            filter: `company_id=eq.${companyIdState}` 
          },
          (payload) => {
            console.log(`Dashboard: ${table} changed:`, payload.eventType);
            scheduleRefresh();
          }
        );
      });

      // Also listen to user changes for subscription updates
      channel.on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'users', 
          filter: `id=eq.${user?.id}` 
        },
        (payload) => {
          console.log('Dashboard: User data changed:', payload.eventType);
          scheduleRefresh();
        }
      );

      channel.subscribe((status) => {
        console.log('Dashboard realtime subscription status:', status);
      });
    } catch (e) {
      console.error('Dashboard realtime subscription error:', e);
    }

    return () => {
      clearTimeout(refreshTimeout);
      try { 
        supabase.removeChannel(channel);
        console.log('Dashboard: Removed realtime channel');
      } catch (e) {
        console.warn('Dashboard: Error removing channel:', e);
      }
    };
  }, [companyIdState, user?.id]);

  // Refresh on focus/visibility only if tab was away for a while to avoid thrash
  useEffect(() => {
    let lastHiddenAt = 0;
    const triggerIfStale = () => {
      const awayMs = Date.now() - lastHiddenAt;
      if (awayMs > 15000) { // only refresh if away > 15s
        setReloadKey(Date.now());
      }
    };
    const onFocus = () => triggerIfStale();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        lastHiddenAt = Date.now();
      } else if (document.visibilityState === 'visible') {
        triggerIfStale();
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

const getActivityVisuals = (activity: any) => {
  switch (activity.type) {
    case 'job':
      return { Icon: Briefcase, color: 'text-blue-600' };
    case 'agent':
      return { Icon: Bot, color: 'text-purple-600' };
    case 'invite':
      return { Icon: Mail, color: 'text-red-600' };
    case 'interview':
      if (activity.status === 'Completed' || activity.status === 'hired') {
        return { Icon: CheckCircle, color: 'text-green-600' };
      }
      if (activity.status === 'In Progress' || activity.status === 'in-progress') {
        return { Icon: Clock, color: 'text-orange-600' };
      }
      return { Icon: Clock, color: 'text-muted-foreground' };
    default:
      return { Icon: FileText, color: 'text-muted-foreground' };
  }
};

// Helper function to calculate time ago
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} hours ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)} days ago`;
    }
  };

  // Show skeleton loader when loading
  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="p-6">
          {/* Welcome Section */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name || user?.email?.split('@')[0] || 'User'}!</h1>
            <p className="text-muted-foreground">Here's what's happening with your hiring process today.</p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-4">
            <Button
              size="lg"
              className="gap-2"
              onClick={() => router.push('/jobs')}
            >
              <Plus className="h-4 w-4" />
              Create Job Posting
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={() => router.push('/interviews')}
            >
              <Users className="h-4 w-4" />
              Start Interview
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={() => router.push('/interviews?action=invite')}
            >
              <Users className="h-4 w-4" />
              Invite Candidate
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={() => router.push('/reports')}
            >
              <FileText className="h-4 w-4" />
              View Reports
            </Button>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="p-6">

      {/* Stats Overview - Circular Graphs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Active vs Paused Job Postings - two-color donut */}
        <ActiveJobsDonut activeCount={activeJobs.length} pausedCount={pausedJobs.length} />
        {(() => {
          const values = stats.map(s => parseInt(s.value as string, 10) || 0);
          const maxVal = Math.max(0, ...values);
          const toPercent = (v: number) => (maxVal > 0 ? (v / maxVal) * 100 : 0);
          const colorClasses = ['stroke-green-600', 'stroke-orange-600', 'stroke-purple-600'];
          const rest = stats.slice(1);
          return rest.map((s, i) => (
            <RadialStat
              key={s.label}
              label={s.label}
              value={parseInt(s.value as string, 10) || 0}
              percent={toPercent(parseInt(s.value as string, 10) || 0)}
              colorClass={colorClasses[i] || 'stroke-blue-600'}
            />
          ));
        })()}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Calendar Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Upcoming Interviews
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/calendar')}
                className="text-xs"
              >
                View Calendar
              </Button>
            </CardTitle>
            <CardDescription>Your scheduled interviews and events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {calendarNotifications.length > 0 ? (
                calendarNotifications.map((notification, index) => (
                  <div 
                    key={notification.id || index} 
                    className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() => router.push('/calendar')}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <Calendar className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{notification.candidate_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{notification.job_title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {notification.dateDisplay}
                        </Badge>
                        {notification.time && notification.time !== 'TBD' && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {notification.time}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No upcoming interviews</p>
                  <p className="text-xs">Schedule interviews to see them here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates from jobs, interviews, and AI agents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-3">
                  {(() => {
                    const { Icon, color } = getActivityVisuals(activity);
                    return <Icon className={`h-4 w-4 ${color}`} />;
                  })()}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.candidate}</p>
                    <p className="text-xs text-muted-foreground">{activity.role}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
                </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                  <p className="text-xs">Start by creating a job posting or scheduling an interview</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      </div> {/* End of scrollable content */}
    </div>
  );
}
