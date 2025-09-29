'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, TrendingUp, Users, Briefcase, FileText, RefreshCcw } from 'lucide-react';
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

  // Respond to global refresh key changes
  useEffect(() => {
    if (globalRefreshKey && globalRefreshKey > 0) {
      console.log('AnalyticsInsights: Global refresh triggered');
      setReloadKey(globalRefreshKey);
    }
  }, [globalRefreshKey]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Use the new analytics function for better performance
      const { data: analyticsData, error: analyticsError } = await supabase
        .rpc('get_company_analytics', { 
          p_company_id: companyId, 
          p_date_range: rangeDays 
        });

      if (analyticsError) {
        console.error('Analytics function error:', analyticsError);
        // Fallback to individual queries
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
      }

      // Load trend data using the new function
      const [jobsTrend, interviewsTrend, reportsTrend] = await Promise.all([
        supabase.rpc('get_analytics_trends', { 
          p_company_id: companyId, 
          p_trend_type: 'jobs', 
          p_days: rangeDays 
        }),
        supabase.rpc('get_analytics_trends', { 
          p_company_id: companyId, 
          p_trend_type: 'interviews', 
          p_days: rangeDays 
        }),
        supabase.rpc('get_analytics_trends', { 
          p_company_id: companyId, 
          p_trend_type: 'reports', 
          p_days: rangeDays 
        })
      ]);

      // Combine trend data
      const trendMap = new Map<string, TrendPoint>();
      
      // Initialize all dates in range
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

      // Fill in actual data
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

      // Load recent events
      const { data: eventsData } = await supabase
        .from('analytics_events')
        .select('id, event_type, event_category, event_action, metadata, created_at, user_id')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(10);

      setEvents(eventsData || []);

    } catch (error) {
      console.error('Error loading analytics:', error);
      await loadAnalyticsFallback();
    } finally {
      setLoading(false);
    }
  };

  const loadAnalyticsFallback = async () => {
    try {
      // Fallback to individual queries if RPC functions are not available
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

      // Simple trend: synthetic distribution over range using counts
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
      const { data: eventsData } = await supabase
        .from('analytics_events')
        .select('id, event_type, event_category, event_action, metadata, created_at, user_id')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(10);

      setEvents(eventsData || []);
    } catch (error) {
      console.error('Fallback analytics loading failed:', error);
    }
  };

  // Realtime updates
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
      const tables = ['job_postings', 'interviews', 'interview_reports', 'analytics_events', 'analytics_metrics', 'analytics_trends'];
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

  // Focus refresh
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

  // Helpers
  const formatNum = (n: number) => new Intl.NumberFormat().format(n);

  const renderMiniChart = (values: number[], color: string) => {
    const width = 140;
    const height = 40;
    const max = Math.max(1, ...values);
    const step = width / Math.max(1, values.length - 1);
    const points = values.map((v, i) => `${i * step},${height - (v / max) * height}`).join(' ');
    return (
      <svg width={width} height={height} className="opacity-80">
        <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
      </svg>
    );
  };

  // Show skeleton loader when loading
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
            <div className="mt-3">{renderMiniChart(trends.map(t => t.jobs), '#3b82f6')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Candidates Interviewed</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNum(stats.totalCandidates)}</div>
            <div className="mt-3">{renderMiniChart(trends.map(t => t.interviews), '#16a34a')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reports Generated</CardTitle>
            <FileText className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNum(stats.totalReports)}</div>
            <div className="mt-3">{renderMiniChart(trends.map(t => t.reports), '#f59e0b')}</div>
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

      {/* Trends & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Activity Trends
            </CardTitle>
            <CardDescription>Overview for the selected date range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Chart Container */}
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="overflow-x-auto">
                  <div className="min-w-[600px]">
                    {/* Chart Area */}
                    <div className="relative h-48 mb-4">
                      {/* Y-axis labels */}
                      <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-muted-foreground pr-2">
                        <span>100</span>
                        <span>75</span>
                        <span>50</span>
                        <span>25</span>
                        <span>0</span>
                      </div>
                      
                      {/* Chart bars */}
                      <div className="ml-8 h-full flex items-end justify-between gap-1">
                        {trends.map((p, idx) => {
                          const maxValue = Math.max(...trends.map(t => Math.max(t.jobs, t.interviews, t.reports)));
                          const jobsHeight = maxValue > 0 ? (p.jobs / maxValue) * 100 : 0;
                          const interviewsHeight = maxValue > 0 ? (p.interviews / maxValue) * 100 : 0;
                          const reportsHeight = maxValue > 0 ? (p.reports / maxValue) * 100 : 0;
                          
                          return (
                            <div key={idx} className="flex flex-col items-center gap-1 flex-1">
                              {/* Stacked bars */}
                              <div className="w-full h-32 flex flex-col justify-end gap-0.5">
                                {/* Jobs bar */}
                                {p.jobs > 0 && (
                                  <div 
                                    className="w-full bg-blue-500 rounded-t-sm transition-all duration-300 hover:bg-blue-600"
                                    style={{ height: `${jobsHeight}%` }}
                                    title={`Jobs: ${p.jobs}`}
                                  />
                                )}
                                {/* Interviews bar */}
                                {p.interviews > 0 && (
                                  <div 
                                    className="w-full bg-green-500 transition-all duration-300 hover:bg-green-600"
                                    style={{ height: `${interviewsHeight}%` }}
                                    title={`Interviews: ${p.interviews}`}
                                  />
                                )}
                                {/* Reports bar */}
                                {p.reports > 0 && (
                                  <div 
                                    className="w-full bg-orange-500 rounded-b-sm transition-all duration-300 hover:bg-orange-600"
                                    style={{ height: `${reportsHeight}%` }}
                                    title={`Reports: ${p.reports}`}
                                  />
                                )}
                              </div>
                              
                              {/* Date label */}
                              <div className="text-[10px] text-muted-foreground text-center leading-tight">
                                {new Date(p.date).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Legend */}
              <div className="flex items-center justify-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-sm" />
                  <span className="text-sm font-medium">Jobs</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-sm" />
                  <span className="text-sm font-medium">Interviews</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-sm" />
                  <span className="text-sm font-medium">Reports</span>
                </div>
              </div>
              
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatNum(trends.reduce((sum, t) => sum + t.jobs, 0))}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Jobs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatNum(trends.reduce((sum, t) => sum + t.interviews, 0))}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Interviews</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {formatNum(trends.reduce((sum, t) => sum + t.reports, 0))}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Reports</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              Recent Events
            </CardTitle>
            <CardDescription>Latest activity across your workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {events.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <div className="text-muted-foreground font-medium">No recent events</div>
                  <div className="text-sm text-muted-foreground mt-1">Activity will appear here as it happens</div>
                </div>
              ) : (
                events.map((ev) => (
                  <div key={ev.id} className="group relative">
                    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                      {/* Event Icon */}
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Calendar className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                      
                      {/* Event Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-foreground">
                              {ev.event_category && ev.event_action 
                                ? `${ev.event_category} ${ev.event_action}`.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                                : ev.event_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Event'
                              }
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(ev.created_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            
                            {/* Metadata */}
                            {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                              <div className="mt-2 space-y-1">
                                {Object.entries(ev.metadata).slice(0, 2).map(([key, value]) => (
                                  <div key={key} className="text-xs text-muted-foreground">
                                    <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span> {String(value)}
                                  </div>
                                ))}
                                {Object.keys(ev.metadata).length > 2 && (
                                  <div className="text-xs text-muted-foreground">
                                    +{Object.keys(ev.metadata).length - 2} more
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* User Badge */}
                          <Badge 
                            variant={ev.user_id ? "secondary" : "outline"} 
                            className="text-xs flex-shrink-0"
                          >
                            {ev.user_id ? ev.user_id.slice(0, 8) : 'System'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


