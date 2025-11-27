'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, TrendingUp, Users, Briefcase, FileText, RefreshCcw, Download, Eye, ChevronRight } from 'lucide-react';
import { PageSkeleton } from './SkeletonLoader';

interface AnalyticsInsightsProps {
  user: any;
  globalRefreshKey?: number;
}

type TrendPoint = { date: string; jobs: number; interviews: number; reports: number };

export function AnalyticsInsights({ user, globalRefreshKey }: AnalyticsInsightsProps) {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalJobs: 0, totalCandidates: 0, totalInterviews: 0, totalReports: 0, hireRate: 0 });
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [interviewReports, setInterviewReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  const rangeDays = useMemo(() => (dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90), [dateRange]);

  useEffect(() => {
    (async () => {
      if (!user?.id) return setLoading(false);
      const { data } = await supabase.from('users').select('company_id').eq('id', user.id).maybeSingle();
      setCompanyId(data?.company_id || null);
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!companyId) { setLoading(false); return; }
    loadAnalytics();
  }, [companyId, dateRange, reloadKey]);

  useEffect(() => {
    if (globalRefreshKey && globalRefreshKey > 0) {
      console.log('AnalyticsInsights: Global refresh triggered');
      setReloadKey(globalRefreshKey);
    }
  }, [globalRefreshKey]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Try RPC function, but silently fallback if it doesn't exist
      const { data: analyticsData, error: analyticsError } = await supabase
        .rpc('get_company_analytics', { 
          p_company_id: companyId, 
          p_date_range: rangeDays 
        });

      // If RPC function doesn't exist (42883 error code), use fallback
      if (analyticsError) {
        // Only log if it's not a "function doesn't exist" error
        if (analyticsError.code !== '42883' && analyticsError.code !== 'P0001') {
          console.warn('Analytics function error:', analyticsError.message || analyticsError);
        }
        await loadAnalyticsFallback();
        return;
      }

      if (analyticsData && analyticsData.length > 0) {
        const data = analyticsData[0];
        setStats({
          totalJobs: Number(data.total_jobs) || 0,
          totalCandidates: Number(data.total_candidates) || 0,
          totalInterviews: Number(data.total_interviews) || 0,
          totalReports: Number(data.total_reports) || 0,
          hireRate: Number(data.hire_rate) || 0
        });
      } else {
        // If no data, use fallback
        await loadAnalyticsFallback();
        return;
      }

      // Try trend functions, but fallback if they don't exist
      const [jobsTrend, interviewsTrend, reportsTrend] = await Promise.all([
        supabase.rpc('get_analytics_trends', { 
          p_company_id: companyId, 
          p_trend_type: 'jobs', 
          p_days: rangeDays 
        }).catch(() => ({ data: null, error: null })),
        supabase.rpc('get_analytics_trends', { 
          p_company_id: companyId, 
          p_trend_type: 'interviews', 
          p_days: rangeDays 
        }).catch(() => ({ data: null, error: null })),
        supabase.rpc('get_analytics_trends', { 
          p_company_id: companyId, 
          p_trend_type: 'reports', 
          p_days: rangeDays 
        }).catch(() => ({ data: null, error: null }))
      ]);

      const trendMap = new Map<string, TrendPoint>();
      
      const start = new Date();
      start.setDate(start.getDate() - (rangeDays - 1));
      for (let i = 0; i < rangeDays; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const dateStr = d.toISOString().slice(0, 10);
        trendMap.set(dateStr, {
          date: dateStr,
          jobs: 0,
          interviews: 0,
          reports: 0
        });
      }

      if (jobsTrend.data) {
        jobsTrend.data.forEach((item: any) => {
          const existing = trendMap.get(item.trend_date);
          if (existing) existing.jobs = item.trend_value;
        });
      }
      if (interviewsTrend.data) {
        interviewsTrend.data.forEach((item: any) => {
          const existing = trendMap.get(item.trend_date);
          if (existing) existing.interviews = item.trend_value;
        });
      }
      if (reportsTrend.data) {
        reportsTrend.data.forEach((item: any) => {
          const existing = trendMap.get(item.trend_date);
          if (existing) existing.reports = item.trend_value;
        });
      }

      setTrends(Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date)));

      // Load events (optional - don't fail if table doesn't exist)
      try {
        const { data: eventsData, error: eventsError } = await supabase
          .from('analytics_events')
          .select('id, event_type, event_category, event_action, metadata, created_at, user_id')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!eventsError) {
          setEvents(eventsData || []);
        }
      } catch (err) {
        // Silently ignore if analytics_events table doesn't exist
        setEvents([]);
      }

      // Load interview reports (optional - don't fail if table doesn't exist)
      try {
        const { data: reportsData, error: reportsError } = await supabase
          .from('interview_reports')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (!reportsError) {
          setInterviewReports(reportsData || []);
        } else {
          setInterviewReports([]);
        }
      } catch (err) {
        // Silently ignore if interview_reports table doesn't exist yet
        setInterviewReports([]);
      }

    } catch (error: any) {
      // Only log unexpected errors, not missing RPC functions
      if (error?.code !== '42883' && error?.code !== 'P0001') {
        console.warn('Error loading analytics:', error?.message || error);
      }
      await loadAnalyticsFallback();
    } finally {
      setLoading(false);
    }
  };

  const loadAnalyticsFallback = async () => {
    try {
      const fetchWithFallback = async <T,>(cb: () => Promise<{ data: T; error: any }>, empty: T): Promise<T> => {
        try {
          const { data, error } = await cb();
          if (error) return empty;
          return (data as any) || empty;
        } catch {
          return empty;
        }
      };

      const jobsPromise = fetchWithFallback(() => supabase
        .from('job_postings')
        .select('id', { count: 'exact' })
        .eq('company_id', companyId) as any, { count: 0 } as any);

      const candidatesPromise = fetchWithFallback(() => supabase
        .from('interviews')
        .select('candidate_id', { count: 'exact' })
        .eq('company_id', companyId) as any, { count: 0 } as any);

      const interviewsPromise = fetchWithFallback(() => supabase
        .from('interviews')
        .select('id', { count: 'exact' })
        .eq('company_id', companyId) as any, { count: 0 } as any);

      const reportsPromise = fetchWithFallback(() => supabase
        .from('interview_reports')
        .select('id, recommendation', { count: 'exact' })
        .eq('company_id', companyId) as any, { data: [], count: 0 } as any);

      const [jobs, candidates, interviews, reports] = await Promise.all([
        jobsPromise, candidatesPromise, interviewsPromise, reportsPromise
      ]);

      const hireCount = Array.isArray((reports as any).data) ? (reports as any).data.filter((r: any) => r.recommendation === 'hire').length : 0;
      const totalReports = (reports as any).count || 0;
      const hireRate = totalReports > 0 ? Math.round((hireCount / totalReports) * 100) : 0;

      setStats({
        totalJobs: (jobs as any).count || 0,
        totalCandidates: (candidates as any).count || 0,
        totalInterviews: (interviews as any).count || 0,
        totalReports,
        hireRate
      });

      const points: TrendPoint[] = [];
      const start = new Date();
      start.setDate(start.getDate() - (rangeDays - 1));
      for (let i = 0; i < rangeDays; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        points.push({
          date: d.toISOString().slice(0, 10),
          jobs: 0,
          interviews: 0,
          reports: 0
        });
      }
      setTrends(points);

      // Load events with fallback
      try {
        const { data: eventsData } = await supabase
          .from('analytics_events')
          .select('id, event_type, event_category, event_action, metadata, created_at, user_id')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(10);
        setEvents(eventsData || []);
      } catch {
        setEvents([]);
      }

      // Load interview reports with fallback
      try {
        const { data: reportsData } = await supabase
          .from('interview_reports')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(20);
        setInterviewReports(reportsData || []);
      } catch {
        setInterviewReports([]);
      }
    } catch (error) {
      // Silently handle fallback errors
      console.warn('Fallback analytics loading failed:', error);
    }
  };

  useEffect(() => {
    if (!companyId) return;
    const channel = supabase.channel(`analytics-rt-${companyId}-${Date.now()}`);
    let timer: any;
    const refresh = () => { 
      clearTimeout(timer); 
      timer = setTimeout(() => {
        console.log('AnalyticsInsights: Refreshing data due to real-time update');
        setReloadKey(Date.now());
      }, 300); 
    };
    try {
      const tables = ['job_postings', 'interviews', 'interview_reports', 'analytics_events', 'analytics_metrics', 'analytics_trends', 'interview_transcripts'];
      tables.forEach(table => {
        channel.on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: table, 
          filter: `company_id=eq.${companyId}` 
        }, (payload) => {
          console.log(`AnalyticsInsights: ${table} changed:`, payload.eventType);
          refresh();
        });
      });
      channel.subscribe((status) => {
        console.log('AnalyticsInsights realtime subscription status:', status);
      });
    } catch (e) {
      console.error('AnalyticsInsights realtime error:', e);
    }
    return () => { 
      clearTimeout(timer);
      try { 
        supabase.removeChannel(channel);
        console.log('AnalyticsInsights: Removed realtime channel');
      } catch (e) {
        console.warn('AnalyticsInsights: Error removing channel:', e);
      }
    };
  }, [companyId]);

  useEffect(() => {
    let lastHiddenAt = 0;
    const triggerIfStale = () => {
      const awayMs = Date.now() - lastHiddenAt;
      if (awayMs > 15000) {
        setReloadKey(Date.now());
      }
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

  const formatNum = (n: number) => new Intl.NumberFormat().format(n);

  const viewReport = (report: any) => {
    setSelectedReport(report);
    setIsReportDialogOpen(true);
  };

  const downloadReport = (report: any) => {
    const reportContent = `
INTERVIEW PERFORMANCE REPORT
============================

Candidate Information:
- Name: ${report.candidate_name || 'N/A'}
- Email: ${report.candidate_email}
- Interview Date: ${new Date(report.ended_at).toLocaleString()}
- Duration: ${Math.floor(report.duration_seconds / 60)} minutes ${report.duration_seconds % 60} seconds

Performance Summary:
- Overall Score: ${Math.round(report.total_score)}%
- Questions Asked: ${report.questions_asked}
- Questions Answered: ${report.questions_answered}
- Correct Answers: ${report.correct_answers}
- Wrong Answers: ${report.wrong_answers}
- Partial Answers: ${report.partial_answers || 0}

${report.performance_metrics ? `
Additional Metrics:
- Response Rate: ${report.performance_metrics.response_rate || 0}%
- Accuracy: ${report.performance_metrics.accuracy || 0}%
- Communication Score: ${report.performance_metrics.communication_score || 0}%
- Technical Score: ${report.performance_metrics.technical_score || 0}%
` : ''}

${report.strengths && report.strengths.length > 0 ? `
Strengths:
${report.strengths.map((s: string) => `• ${s}`).join('\n')}
` : ''}

${report.weaknesses && report.weaknesses.length > 0 ? `
Areas for Improvement:
${report.weaknesses.map((w: string) => `• ${w}`).join('\n')}
` : ''}

${report.recommendations ? `
Recommendations:
${report.recommendations}
` : ''}

${report.transcript_summary ? `
Interview Summary:
${report.transcript_summary}
` : ''}

---
Report Generated: ${new Date().toLocaleString()}
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Interview_Report_${report.candidate_name || report.candidate_email}_${new Date(report.ended_at).toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Analytics & Insights</h1>
          <p className="text-muted-foreground">Track performance across jobs, interviews, and hires.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" onClick={() => setReloadKey(Date.now())}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNum(stats.totalJobs)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Candidates Interviewed</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNum(stats.totalCandidates)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reports Generated</CardTitle>
            <FileText className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNum(stats.totalReports)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hire Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.hireRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Based on interview reports</p>
          </CardContent>
        </Card>
      </div>

      {/* Interview Reports Section */}
      <Tabs defaultValue="overview" className="mt-8">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reports">
            All Reports ({interviewReports.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {interviewReports.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  Recent Interview Reports
                </CardTitle>
                <CardDescription>
                  Latest performance analysis from completed interviews
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {interviewReports.slice(0, 5).map((report) => (
                    <div 
                      key={report.id}
                      className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold">{report.candidate_name || report.candidate_email}</h3>
                          <p className="text-sm text-muted-foreground">{report.candidate_email}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(report.ended_at).toLocaleDateString()} • {Math.floor(report.duration_seconds / 60)}m {report.duration_seconds % 60}s
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            {Math.round(report.total_score)}%
                          </div>
                          <p className="text-xs text-muted-foreground">Score</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 mb-3">
                        <div className="bg-blue-50 dark:bg-blue-950/30 rounded p-2 text-center">
                          <p className="text-lg font-bold text-blue-600">{report.questions_asked}</p>
                          <p className="text-xs text-muted-foreground">Questions</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-950/30 rounded p-2 text-center">
                          <p className="text-lg font-bold text-green-600">{report.correct_answers}</p>
                          <p className="text-xs text-muted-foreground">Correct</p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-950/30 rounded p-2 text-center">
                          <p className="text-lg font-bold text-red-600">{report.wrong_answers}</p>
                          <p className="text-xs text-muted-foreground">Wrong</p>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-950/30 rounded p-2 text-center">
                          <p className="text-lg font-bold text-amber-600">{report.partial_answers || 0}</p>
                          <p className="text-xs text-muted-foreground">Partial</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-2"
                          onClick={() => viewReport(report)}
                        >
                          <Eye className="h-4 w-4" />
                          View Details
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-2"
                          onClick={() => downloadReport(report)}
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Reports Yet</h3>
                <p className="text-muted-foreground">
                  Interview reports will appear here after candidates complete their interviews
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                All Interview Reports
              </CardTitle>
              <CardDescription>
                Complete list of interview performance reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              {interviewReports.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Reports Available</h3>
                  <p className="text-muted-foreground">
                    Interview reports will appear here after candidates complete their interviews
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {interviewReports.map((report) => (
                    <div 
                      key={report.id}
                      className="border rounded-lg p-5 hover:bg-muted/30 transition-colors"
                    >
                      {/* Candidate Info Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {report.candidate_name || report.candidate_email}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {report.candidate_email}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Completed: {new Date(report.ended_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-green-600">
                            {Math.round(report.total_score)}%
                          </div>
                          <p className="text-xs text-muted-foreground">Overall Score</p>
                        </div>
                      </div>

                      {/* Performance Metrics Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">Questions</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {report.questions_asked}
                          </p>
                          <p className="text-xs text-muted-foreground">Asked</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">Correct</p>
                          <p className="text-2xl font-bold text-green-600">
                            {report.correct_answers}
                          </p>
                          <p className="text-xs text-muted-foreground">Answers</p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">Wrong</p>
                          <p className="text-2xl font-bold text-red-600">
                            {report.wrong_answers}
                          </p>
                          <p className="text-xs text-muted-foreground">Answers</p>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">Partial</p>
                          <p className="text-2xl font-bold text-amber-600">
                            {report.partial_answers || 0}
                          </p>
                          <p className="text-xs text-muted-foreground">Answers</p>
                        </div>
                      </div>

                      {/* Additional Metrics */}
                      {report.performance_metrics && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          {report.performance_metrics.response_rate !== undefined && (
                            <div className="text-center p-2 bg-muted/50 rounded">
                              <p className="text-xs text-muted-foreground">Response Rate</p>
                              <p className="text-lg font-semibold">{report.performance_metrics.response_rate}%</p>
                            </div>
                          )}
                          {report.performance_metrics.accuracy !== undefined && (
                            <div className="text-center p-2 bg-muted/50 rounded">
                              <p className="text-xs text-muted-foreground">Accuracy</p>
                              <p className="text-lg font-semibold">{report.performance_metrics.accuracy}%</p>
                            </div>
                          )}
                          {report.performance_metrics.communication_score !== undefined && (
                            <div className="text-center p-2 bg-muted/50 rounded">
                              <p className="text-xs text-muted-foreground">Communication</p>
                              <p className="text-lg font-semibold">{report.performance_metrics.communication_score}%</p>
                            </div>
                          )}
                          {report.performance_metrics.technical_score !== undefined && (
                            <div className="text-center p-2 bg-muted/50 rounded">
                              <p className="text-xs text-muted-foreground">Technical</p>
                              <p className="text-lg font-semibold">{report.performance_metrics.technical_score}%</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Strengths & Weaknesses */}
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        {report.strengths && report.strengths.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-green-600 mb-2">
                              💪 Strengths
                            </h4>
                            <ul className="space-y-1">
                              {report.strengths.map((strength: string, idx: number) => (
                                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <span className="text-green-500 mt-0.5">✓</span>
                                  <span>{strength}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {report.weaknesses && report.weaknesses.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-amber-600 mb-2">
                              📝 Areas for Improvement
                            </h4>
                            <ul className="space-y-1">
                              {report.weaknesses.map((weakness: string, idx: number) => (
                                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <span className="text-amber-500 mt-0.5">→</span>
                                  <span>{weakness}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Recommendations */}
                      {report.recommendations && (
                        <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-4 mb-4">
                          <h4 className="text-sm font-semibold text-purple-600 mb-2">
                            💡 Recommendations
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {report.recommendations}
                          </p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-3 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-2"
                          onClick={() => viewReport(report)}
                        >
                          <Eye className="h-4 w-4" />
                          View Full Report
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                          onClick={() => downloadReport(report)}
                        >
                          <Download className="h-4 w-4" />
                          Download Report
                        </Button>
                      </div>

                      {/* Duration */}
                      <div className="mt-3 text-xs text-muted-foreground text-center">
                        Interview Duration: {Math.floor(report.duration_seconds / 60)}m {report.duration_seconds % 60}s
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Report Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              Interview Performance Report
            </DialogTitle>
            <DialogDescription>
              Detailed analysis of candidate performance
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-6">
              {/* Candidate Info */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Candidate Name</p>
                    <p className="text-lg font-semibold">{selectedReport.candidate_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-lg font-semibold">{selectedReport.candidate_email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Interview Date</p>
                    <p className="text-lg font-semibold">
                      {new Date(selectedReport.ended_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Duration</p>
                    <p className="text-lg font-semibold">
                      {Math.floor(selectedReport.duration_seconds / 60)}m {selectedReport.duration_seconds % 60}s
                    </p>
                  </div>
                </div>
              </div>

              {/* Overall Score */}
              <div className="text-center py-6 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Overall Performance Score</p>
                <p className="text-6xl font-bold text-green-600">
                  {Math.round(selectedReport.total_score)}%
                </p>
              </div>

              {/* Performance Details */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Performance Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <p className="text-3xl font-bold text-blue-600">{selectedReport.questions_asked}</p>
                    <p className="text-sm text-muted-foreground mt-1">Questions Asked</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <p className="text-3xl font-bold text-green-600">{selectedReport.correct_answers}</p>
                    <p className="text-sm text-muted-foreground mt-1">Correct Answers</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
                    <p className="text-3xl font-bold text-red-600">{selectedReport.wrong_answers}</p>
                    <p className="text-sm text-muted-foreground mt-1">Wrong Answers</p>
                  </div>
                  <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                    <p className="text-3xl font-bold text-amber-600">{selectedReport.partial_answers || 0}</p>
                    <p className="text-sm text-muted-foreground mt-1">Partial Answers</p>
                  </div>
                </div>
              </div>

              {/* Additional Metrics */}
              {selectedReport.performance_metrics && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Additional Metrics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedReport.performance_metrics.response_rate !== undefined && (
                      <div className="text-center p-4 border rounded-lg">
                        <p className="text-2xl font-bold">{selectedReport.performance_metrics.response_rate}%</p>
                        <p className="text-sm text-muted-foreground mt-1">Response Rate</p>
                      </div>
                    )}
                    {selectedReport.performance_metrics.accuracy !== undefined && (
                      <div className="text-center p-4 border rounded-lg">
                        <p className="text-2xl font-bold">{selectedReport.performance_metrics.accuracy}%</p>
                        <p className="text-sm text-muted-foreground mt-1">Accuracy</p>
                      </div>
                    )}
                    {selectedReport.performance_metrics.communication_score !== undefined && (
                      <div className="text-center p-4 border rounded-lg">
                        <p className="text-2xl font-bold">{selectedReport.performance_metrics.communication_score}%</p>
                        <p className="text-sm text-muted-foreground mt-1">Communication</p>
                      </div>
                    )}
                    {selectedReport.performance_metrics.technical_score !== undefined && (
                      <div className="text-center p-4 border rounded-lg">
                        <p className="text-2xl font-bold">{selectedReport.performance_metrics.technical_score}%</p>
                        <p className="text-sm text-muted-foreground mt-1">Technical Skills</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Strengths & Weaknesses */}
              <div className="grid md:grid-cols-2 gap-6">
                {selectedReport.strengths && selectedReport.strengths.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-green-600 mb-3">💪 Strengths</h3>
                    <ul className="space-y-2">
                      {selectedReport.strengths.map((strength: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                          <span className="text-green-500 text-xl">✓</span>
                          <span className="text-sm">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedReport.weaknesses && selectedReport.weaknesses.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-amber-600 mb-3">📝 Areas for Improvement</h3>
                    <ul className="space-y-2">
                      {selectedReport.weaknesses.map((weakness: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                          <span className="text-amber-500 text-xl">→</span>
                          <span className="text-sm">{weakness}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Recommendations */}
              {selectedReport.recommendations && (
                <div>
                  <h3 className="text-lg font-semibold text-purple-600 mb-3">💡 Hiring Recommendations</h3>
                  <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                    <p className="text-sm leading-relaxed">{selectedReport.recommendations}</p>
                  </div>
                </div>
              )}

              {/* Transcript Summary */}
              {selectedReport.transcript_summary && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">📋 Interview Summary</h3>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {selectedReport.transcript_summary}
                    </p>
                  </div>
                </div>
              )}

              {/* Download Button */}
              <div className="flex justify-end pt-4 border-t">
                <Button
                  className="gap-2 bg-green-600 hover:bg-green-700"
                  onClick={() => downloadReport(selectedReport)}
                >
                  <Download className="h-4 w-4" />
                  Download Full Report
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
