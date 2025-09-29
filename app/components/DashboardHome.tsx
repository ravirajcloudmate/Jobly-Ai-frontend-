import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  Users, 
  Briefcase, 
  FileText, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Loader2
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DashboardSkeleton } from './SkeletonLoader';

interface DashboardHomeProps {
  user: any;
  globalRefreshKey?: number;
}

export function DashboardHome({ user, globalRefreshKey }: DashboardHomeProps) {
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
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
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
          setUpcomingTasks([{
            task: 'Complete your profile setup to start hiring',
            priority: 'high',
            due: 'Today'
          }]);
          setSubscriptionData({
            plan: 'Free',
            status: 'active',
            interviewsUsed: 0
          });
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
          setUpcomingTasks([{
            task: 'Set up your company profile to start hiring',
            priority: 'high',
            due: 'Today'
          }]);
          setSubscriptionData({
            plan: (userData as any)?.subscription_plan || 'free',
            status: (userData as any)?.subscription_status || 'active',
            interviewsUsed: 0
          });
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

        // Sort by most recent and limit to 4
        activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setRecentActivity(activities.slice(0, 4));

        // Generate dynamic upcoming tasks based on data
        const tasks = [];
        
        if (reportsResult.data && reportsResult.data.length > 0) {
          tasks.push({
            task: `Review ${reportsResult.data.length} pending candidate reports`,
            priority: 'high',
            due: 'Today'
          });
        }

        if (jobsResult.data && jobsResult.data.length > 0) {
          tasks.push({
            task: `Monitor ${jobsResult.data.length} active job postings for new applications`,
            priority: 'medium',
            due: 'This week'
          });
        }

        if (candidatesResult.data && candidatesResult.data.length > 5) {
          tasks.push({
            task: 'Schedule follow-up interviews for shortlisted candidates',
            priority: 'medium',
            due: 'Tomorrow'
          });
        }

        // Add default task if no specific tasks
        if (tasks.length === 0) {
          tasks.push({
            task: 'Create your first job posting to start hiring',
            priority: 'low',
            due: 'This week'
          });
        }

        setUpcomingTasks(tasks);

        // Set subscription data
        setSubscriptionData({
          plan: (userData as any)?.subscription_plan || 'free',
          status: (userData as any)?.subscription_status || 'active',
          interviewsUsed: interviewsResult.data?.length || 0
        });

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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name || user?.email?.split('@')[0] || 'User'}!</h1>
        <p className="text-muted-foreground">Here's what's happening with your hiring process today.</p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4 mb-8">
        <Button size="lg" className="gap-2" asChild>
          <a href="/?module=jobs&action=create">
          <Plus className="h-4 w-4" />
          Create Job Posting
          </a>
        </Button>
        <Button variant="outline" size="lg" className="gap-2" asChild>
          <a href="/?module=interviews">
            <Users className="h-4 w-4" />
            Start Interview
          </a>
        </Button>
        <Button variant="outline" size="lg" className="gap-2" asChild>
          <a href="/?module=interviews&action=invite">
          <Users className="h-4 w-4" />
          Invite Candidate
          </a>
        </Button>
        <Button variant="outline" size="lg" className="gap-2" asChild>
          <a href="/?module=reports">
          <FileText className="h-4 w-4" />
          View Reports
          </a>
        </Button>
      </div>

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
        {/* Subscription Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Subscription Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Current Plan:</span>
                <Badge variant="secondary">{subscriptionData?.plan || 'Free'}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Interviews Used:</span>
                <span>{subscriptionData?.interviewsUsed || 0} / {subscriptionData?.plan === 'Free' ? '10' : '∞'}</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Plan Usage</span>
                  <span>{subscriptionData?.plan === 'Free' ? `${10 - (subscriptionData?.interviewsUsed || 0)} remaining` : 'Unlimited'}</span>
                </div>
                <Progress 
                  value={subscriptionData?.plan === 'Free' ? ((subscriptionData?.interviewsUsed || 0) / 10) * 100 : 100} 
                  className="h-2" 
                />
              </div>
              <Button variant="outline" size="sm" className="w-full">
                Upgrade Plan
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest interviews and job postings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-3">
                  {activity.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {activity.status === 'in-progress' && <Clock className="h-4 w-4 text-orange-600" />}
                    {activity.status === 'pending' && <Clock className="h-4 w-4 text-orange-600" />}
                  {activity.status === 'active' && <Briefcase className="h-4 w-4 text-blue-600" />}
                  {activity.status === 'ready' && <FileText className="h-4 w-4 text-purple-600" />}
                    {activity.status === 'hired' && <CheckCircle className="h-4 w-4 text-green-600" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.candidate}</p>
                    <p className="text-xs text-muted-foreground">{activity.role}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
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

      {/* Upcoming Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Tasks
          </CardTitle>
          <CardDescription>Action items requiring your attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {upcomingTasks.map((task, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
                <AlertCircle className={`h-4 w-4 mt-0.5 ${
                  task.priority === 'high' ? 'text-red-600' : 
                  task.priority === 'medium' ? 'text-orange-600' : 'text-blue-600'
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{task.task}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={
                      task.priority === 'high' ? 'destructive' : 
                      task.priority === 'medium' ? 'default' : 'secondary'
                    } className="text-xs">
                      {task.priority}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Due: {task.due}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
