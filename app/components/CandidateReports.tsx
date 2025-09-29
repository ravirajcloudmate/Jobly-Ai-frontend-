'use client';

import { useState, useEffect } from "react";
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Download,
  FileText,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  BarChart3,
  Loader2,
  Search,
  Filter,
  Calendar,
  User,
  Building,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";
import { Notification } from './Notification';
import { PageSkeleton } from './SkeletonLoader';

interface CandidateReportsProps {
  user: any;
  globalRefreshKey?: number;
}

export function CandidateReports({
  user,
  globalRefreshKey,
}: CandidateReportsProps) {
  const searchParams = useSearchParams();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [companyIdState, setCompanyIdState] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRecommendation, setFilterRecommendation] = useState('all');
  const [filterDateRange, setFilterDateRange] = useState('all');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

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
    loadReports();
  }, [user?.id, reloadKey]);

  // Respond to global refresh key changes
  useEffect(() => {
    if (globalRefreshKey && globalRefreshKey > 0) {
      console.log('CandidateReports: Global refresh triggered');
      setReloadKey(prev => prev + 1); // Use increment to ensure refresh
    }
  }, [globalRefreshKey]);

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

  // Realtime updates for interview reports
  useEffect(() => {
    if (!companyIdState) return;
    const channel = supabase.channel(`reports-rt-${companyIdState}-${Date.now()}`);
    let timer: any;
    const refresh = () => { 
      clearTimeout(timer); 
      timer = setTimeout(() => {
        console.log('CandidateReports: Refreshing data due to real-time update');
        setReloadKey(Date.now());
      }, 300); 
    };
    try {
      channel.on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'interview_reports', 
        filter: `company_id=eq.${companyIdState}` 
      }, (payload) => {
        console.log('CandidateReports: interview_reports changed:', payload.eventType);
        refresh();
      });
      channel.subscribe((status) => {
        console.log('CandidateReports realtime subscription status:', status);
      });
    } catch (e) { 
      console.error('CandidateReports realtime error:', e); 
    }
    return () => { 
      clearTimeout(timer);
      try { 
        supabase.removeChannel(channel);
        console.log('CandidateReports: Removed realtime channel');
      } catch (e) {
        console.warn('CandidateReports: Error removing channel:', e);
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

  const loadReports = async () => {
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
        setReports([]);
        setLoading(false);
        return;
      }

      // Fetch interview reports for the company
      const { data: reportsData, error: reportsError } = await supabase
        .from('interview_reports')
        .select(`
          *,
          interviews!inner(
            id,
            type,
            scheduled_at,
            completed_at,
            duration_minutes,
            transcript
          ),
          candidates!inner(
            id,
            full_name,
            email,
            resume_url
          ),
          jobs!inner(
            id,
            title,
            description
          ),
          reviewed_by_user:users!reviewed_by(
            full_name
          )
        `)
        .eq('company_id', userData.company_id)
        .order('created_at', { ascending: false });

      if (reportsError) {
        console.error('Error fetching reports:', reportsError);
        
        // If interview_reports table doesn't exist, show empty state
        if (reportsError.code === '42P01') {
          console.log('interview_reports table does not exist yet');
          setReports([]);
        } else {
          setError('Failed to load reports');
        }
      } else {
        // Transform reports data
        const transformedData = (reportsData || []).map((report: any) => ({
          id: report.id,
          candidateName: report.candidates?.full_name || 'Unknown Candidate',
          email: report.candidates?.email || 'unknown@email.com',
          jobTitle: report.jobs?.title || 'Unknown Position',
          interviewDate: report.interviews?.completed_at || report.created_at,
          overallScore: report.overall_score ? Math.round(report.overall_score * 10) : 0,
      scores: {
            communication: report.communication_score ? Math.round(report.communication_score * 10) : 0,
            technical: report.technical_score ? Math.round(report.technical_score * 10) : 0,
            confidence: 75, // Default value as not in schema
            problemSolving: report.cultural_fit_score ? Math.round(report.cultural_fit_score * 10) : 0,
          },
          strengths: report.ai_analysis?.strengths || [],
          improvements: report.ai_analysis?.weaknesses || [],
          transcript: report.interviews?.transcript ? "Available" : "Not Available",
          recommendation: getRecommendationText(report.recommendation),
          interviewDuration: report.interviews?.duration_minutes || 0,
          interviewType: report.interviews?.type || 'ai',
          reviewedBy: report.reviewed_by_user?.full_name || null,
          reviewedAt: report.reviewed_at,
          humanFeedback: report.human_feedback,
          aiAnalysis: report.ai_analysis,
          candidateId: report.candidate_id,
          interviewId: report.interview_id,
          jobId: report.job_id
        }));
        
        setReports(transformedData);
      }
    } catch (err) {
      console.error('Error loading reports:', err);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert database recommendation to display text
  const getRecommendationText = (dbRecommendation: string) => {
    switch (dbRecommendation) {
      case 'hire': return 'Strong Hire';
      case 'maybe': return 'Consider';
      case 'no_hire': return 'No Hire';
      default: return 'Pending Review';
    }
  };

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

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case "Strong Hire":
        return "default";
      case "Hire":
        return "secondary";
      case "Consider":
        return "outline";
      case "No Hire":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80)
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (score >= 60)
      return <Minus className="h-4 w-4 text-orange-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-orange-600";
    return "text-red-600";
  };

  // Filter reports based on search and filters
  const filteredReports = reports.filter(report => {
    const matchesSearch = report.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRecommendation = filterRecommendation === 'all' || 
                                 report.recommendation.toLowerCase().replace(' ', '') === filterRecommendation;
    
    const matchesDateRange = filterDateRange === 'all' || checkDateRange(report.interviewDate, filterDateRange);
    
    return matchesSearch && matchesRecommendation && matchesDateRange;
  });

  const checkDateRange = (dateString: string, range: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    switch (range) {
      case 'week': return diffDays <= 7;
      case 'month': return diffDays <= 30;
      case 'quarter': return diffDays <= 90;
      default: return true;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const exportReport = async (reportId: string, format: "pdf" | "excel") => {
    try {
      const report = reports.find(r => r.id === reportId);
      if (!report) return;

      // In a real implementation, this would generate and download the file
      console.log(`Exporting report for ${report.candidateName} as ${format}`);
      
      showNotification(
        'success',
        'Report exported',
        `${report.candidateName}'s report has been exported as ${format.toUpperCase()}.`
      );
      
      // TODO: Implement actual file generation and download
    } catch (err) {
      console.error('Error exporting report:', err);
      showNotification('error', 'Export failed', 'Failed to export report. Please try again.');
    }
  };

  const openViewDialog = (report: any) => {
    setSelectedReport(report);
    setIsViewDialogOpen(true);
  };

  // Show skeleton loader when loading
  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            Candidate Reports
          </h1>
          <p className="text-muted-foreground">
            Detailed scorecards, transcripts, and AI-generated
            insights.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Compare Candidates
          </Button>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => showNotification('success', 'Export started', 'All reports are being exported. Download will begin shortly.')}
          >
            <Download className="h-4 w-4" />
            Export All
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search candidates by name, email, or job title..."
            className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="px-3 py-2 border border-input rounded-md bg-background"
          value={filterRecommendation}
          onChange={(e) => setFilterRecommendation(e.target.value)}
        >
          <option value="all">All Recommendations</option>
          <option value="stronghire">Strong Hire</option>
          <option value="consider">Consider</option>
          <option value="nohire">No Hire</option>
          <option value="pendingreview">Pending Review</option>
        </select>
        <select 
          className="px-3 py-2 border border-input rounded-md bg-background"
          value={filterDateRange}
          onChange={(e) => setFilterDateRange(e.target.value)}
        >
          <option value="all">All Time</option>
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
          <option value="quarter">Last Quarter</option>
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
          <TabsTrigger value="all">
            All Reports ({filteredReports.length})
          </TabsTrigger>
          <TabsTrigger value="strong">
            Strong Hire (
            {
              filteredReports.filter(
                (r) => r.recommendation === "Strong Hire",
              ).length
            }
            )
          </TabsTrigger>
          <TabsTrigger value="consider">
            Consider (
            {
              filteredReports.filter(
                (r) => r.recommendation === "Consider",
              ).length
            }
            )
          </TabsTrigger>
          <TabsTrigger value="nohire">
            No Hire (
            {
              filteredReports.filter(
                (r) => r.recommendation === "No Hire",
              ).length
            }
            )
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {filteredReports.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No reports found</h3>
                <p className="text-muted-foreground mb-4">
                  {reports.length === 0 ? 'Complete interviews to generate candidate reports.' : 'Try adjusting your search or filters.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredReports.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {report.candidateName
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold">
                          {report.candidateName}
                        </h3>
                        <Badge
                          variant={
                            getRecommendationColor(
                              report.recommendation,
                            ) as any
                          }
                        >
                          {report.recommendation}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">
                        {report.jobTitle}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Interview Date: {formatDate(report.interviewDate)}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {report.interviewDuration}min
                        </span>
                        <span className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {report.interviewType.toUpperCase()}
                        </span>
                        {report.reviewedBy && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            Reviewed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="h-5 w-5 text-yellow-500 fill-current" />
                      <span className="text-2xl font-bold">
                        {report.overallScore}
                      </span>
                      <span className="text-muted-foreground">
                        /100
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Overall Score
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Score Breakdown */}
                  <div>
                    <h4 className="font-semibold mb-4">
                      Score Breakdown
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(report.scores as Record<string, number>).map(
                        ([skill, score], _index) => (
                          <div
                            key={skill}
                            className="space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm capitalize">
                                {skill
                                  .replace(/([A-Z])/g, " $1")
                                  .trim()}
                              </span>
                              <div className="flex items-center gap-1">
                                {getScoreIcon(Number(score))}
                                <span
                                  className={`text-sm font-medium ${getScoreColor(Number(score))}`}
                                >
                                  {score}%
                                </span>
                              </div>
                            </div>
                            <Progress value={Number(score)} className="h-2" />
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  {/* Strengths and Improvements */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3 text-green-700">
                        Key Strengths
                      </h4>
                      <ul className="space-y-2">
                        {report.strengths.map(
                          (strength: string, index: number) => (
                            <li
                              key={index}
                              className="flex items-start gap-2 text-sm"
                            >
                              <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0" />
                              {strength}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3 text-orange-700">
                        Areas for Improvement
                      </h4>
                      <ul className="space-y-2">
                        {report.improvements.map(
                          (improvement: string, index: number) => (
                            <li
                              key={index}
                              className="flex items-start gap-2 text-sm"
                            >
                              <div className="w-2 h-2 bg-orange-600 rounded-full mt-2 flex-shrink-0" />
                              {improvement}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-4 border-t">
                    <Button 
                      size="sm" 
                      className="gap-2"
                      onClick={() => openViewDialog(report)}
                    >
                      <Eye className="h-4 w-4" />
                      View Full Report
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      disabled={report.transcript === "Not Available"}
                    >
                      <FileText className="h-4 w-4" />
                      View Transcript
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => exportReport(report.id, "pdf")}
                    >
                      <Download className="h-4 w-4" />
                      Export PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => exportReport(report.id, "excel")}
                    >
                      <Download className="h-4 w-4" />
                      Export Excel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="strong" className="space-y-4">
          {filteredReports
            .filter(
              (report) =>
                report.recommendation === "Strong Hire",
            )
            .map((report) => (
              <Card key={report.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {report.candidateName
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">
                          {report.candidateName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {report.jobTitle}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-600">
                        {report.overallScore}%
                      </p>
                      <Badge variant="default">
                        Strong Hire
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="consider" className="space-y-4">
          {filteredReports
            .filter(
              (report) => report.recommendation === "Consider",
            )
            .map((report) => (
              <Card key={report.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {report.candidateName
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">
                          {report.candidateName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {report.jobTitle}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-orange-600">
                        {report.overallScore}%
                      </p>
                      <Badge variant="outline">Consider</Badge>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="nohire" className="space-y-4">
          {filteredReports
            .filter(
              (report) => report.recommendation === "No Hire",
            )
            .map((report) => (
              <Card key={report.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                        {report.candidateName
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")}
                        {report.candidateName
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">
                          {report.candidateName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {report.jobTitle}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-red-600">
                        {report.overallScore}%
                      </p>
                      <Badge variant="destructive">No Hire</Badge>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
        </TabsContent>
      </Tabs>

      {/* View Report Dialog */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {selectedReport.candidateName} - Interview Report
              </h2>
              <Button 
                variant="ghost" 
                onClick={() => setIsViewDialogOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-6 w-6" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Candidate Info */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-3">Candidate Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{selectedReport.candidateName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium">{selectedReport.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Position:</span>
                      <span className="font-medium">{selectedReport.jobTitle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Interview Date:</span>
                      <span className="font-medium">{formatDate(selectedReport.interviewDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">{selectedReport.interviewDuration} minutes</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-3">Overall Assessment</h3>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-3xl font-bold mb-2">{selectedReport.overallScore}%</div>
                    <Badge variant={getRecommendationColor(selectedReport.recommendation) as any}>
                      {selectedReport.recommendation}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Detailed Scores */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-3">Detailed Scores</h3>
                  <div className="space-y-3">
                    {Object.entries(selectedReport.scores).map(([skill, score]) => (
                      <div key={skill} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">
                            {skill.replace(/([A-Z])/g, " $1").trim()}
                          </span>
                          <span className={`font-medium ${getScoreColor(score as number)}`}>
                            {score as number}%
                          </span>
                        </div>
                        <Progress value={score as number} className="h-2" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Analysis */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-3 text-green-700">Key Strengths</h3>
                <ul className="space-y-2">
                  {selectedReport.strengths.map((strength: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0" />
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-3 text-orange-700">Areas for Improvement</h3>
                <ul className="space-y-2">
                  {selectedReport.improvements.map((improvement: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-2 h-2 bg-orange-600 rounded-full mt-2 flex-shrink-0" />
                      {improvement}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Human Feedback */}
            {Boolean(selectedReport.humanFeedback) && (
              <div className="mt-6">
                <h3 className="font-semibold text-lg mb-3">Human Reviewer Feedback</h3>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-800">{selectedReport.humanFeedback}</p>
                  {selectedReport.reviewedBy && (
                    <p className="text-xs text-blue-600 mt-2">
                      Reviewed by {selectedReport.reviewedBy} on {formatDate(selectedReport.reviewedAt)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6 pt-4 border-t">
              <Button onClick={() => exportReport(selectedReport.id, "pdf")} className="gap-2">
                <Download className="h-4 w-4" />
                Export PDF
              </Button>
              <Button variant="outline" onClick={() => exportReport(selectedReport.id, "excel")} className="gap-2">
                <Download className="h-4 w-4" />
                Export Excel
              </Button>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

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
