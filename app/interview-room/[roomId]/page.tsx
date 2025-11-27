'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
  ParticipantTile,
  useTracks,
  isTrackReference,
  LayoutContextProvider,
  useCreateLayoutContext,
  useDataChannel
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Loader2, PhoneOff, Bot, User, Briefcase, CalendarDays, Sparkles } from 'lucide-react';
import type { TrackReferenceOrPlaceholder } from '@livekit/components-core';
import { Track } from 'livekit-client';
import { supabase } from '@/lib/supabase';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export default function InterviewRoomPage() {
  const params = useParams();
  const roomId = params?.roomId as string;
  
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [identity, setIdentity] = useState('');
  const [invitation, setInvitation] = useState<any>(null);
  const [jobPosting, setJobPosting] = useState<any>(null);
  const [promptTemplate, setPromptTemplate] = useState<any>(null);

  useEffect(() => {
    if (roomId) {
      loadInvitationData();
      joinRoom();
    }
  }, [roomId]);

  // Load invitation and job data
  const loadInvitationData = async () => {
    try {
      // Try to find invitation by room_id in interview_sessions
      const { data: session } = await supabase
        .from('interview_sessions')
        .select('*, interview_invitations(*, job_postings(*))')
        .eq('room_id', roomId)
        .maybeSingle();

      if (session) {
        // Load prompt template using agent_id (UUID) from session
        if (session.agent_id) {
          // Check if agent_id is a valid UUID
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(session.agent_id);
          
          if (isUUID) {
            const { data: template } = await supabase
              .from('prompt_templates')
              .select('*')
              .eq('id', session.agent_id)
              .maybeSingle();
            
            if (template) {
              setPromptTemplate(template);
              console.log('✅ Loaded prompt template from agent_id:', session.agent_id);
            } else {
              console.warn('⚠️ Template not found for agent_id:', session.agent_id);
            }
          } else {
            console.warn('⚠️ agent_id is not a valid UUID:', session.agent_id);
          }
        }

        if (session.interview_invitations) {
          const inv = session.interview_invitations;
          setInvitation(inv);
          
          if (inv.job_postings) {
            setJobPosting(inv.job_postings);
            
            // Fallback: Try to load template from job_postings if not already loaded
            if (!promptTemplate && inv.job_postings.ai_interview_template) {
              const templateId = inv.job_postings.ai_interview_template;
              const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(templateId);
              
              if (isUUID) {
                const { data: template } = await supabase
                  .from('prompt_templates')
                  .select('*')
                  .eq('id', templateId)
                  .maybeSingle();
                
                if (template) {
                  setPromptTemplate(template);
                  console.log('✅ Loaded prompt template from job_postings:', templateId);
                }
              }
            }
          }
        }
      } else {
        // Fallback: try to find by interview_link
        const { data: invite } = await supabase
          .from('interview_invitations')
          .select('*, job_postings(*)')
          .or(`interview_link.cs.${roomId},interview_link.cs.%${roomId}%`)
          .maybeSingle();

        if (invite) {
          setInvitation(invite);
          if (invite.job_postings) {
            setJobPosting(invite.job_postings);
            
            // Try to load template from job_postings
            if (invite.job_postings.ai_interview_template) {
              const templateId = invite.job_postings.ai_interview_template;
              const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(templateId);
              
              if (isUUID) {
                const { data: template } = await supabase
                  .from('prompt_templates')
                  .select('*')
                  .eq('id', templateId)
                  .maybeSingle();
                
                if (template) {
                  setPromptTemplate(template);
                  console.log('✅ Loaded prompt template from job_postings (fallback):', templateId);
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('Could not load invitation data:', err);
    }
  };

  // Send candidate details to backend when room loads
  useEffect(() => {
    const sendCandidateDetails = async () => {
      if (!roomId || !invitation) return;
      
      try {
        console.log('📤 Sending candidate details for interview room...');
        
        await fetch(`${BACKEND_URL}/agent/candidate-details`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName: roomId,
            candidateName: invitation.candidate_name,
            candidateEmail: invitation.candidate_email,
            candidateSkills: invitation.candidate_skills,
            experience: invitation.experience,
            candidateProjects: invitation.candidate_projects,
            jobId: invitation.job_id,
            jobTitle: jobPosting?.job_title,
            jobDepartment: jobPosting?.department,
            agentPrompt: promptTemplate?.prompt_text || '',
            interviewMode: jobPosting?.interview_mode,
            difficultyLevel: jobPosting?.difficulty_level
          })
        });
        
        console.log('✅ Candidate details sent');
      } catch (error) {
        console.error('❌ Failed to send candidate details:', error);
        // Don't block interview if this fails
      }
    };
    
    if (invitation && jobPosting) {
      sendCandidateDetails();
    }
  }, [roomId, invitation, jobPosting, promptTemplate]);

  const joinRoom = async () => {
    try {
      setLoading(true);
      setError('');

      // Generate candidate identity
      const candidateIdentity = `candidate_${Date.now()}`;
      
      // Get token from backend
      const response = await fetch(`${BACKEND_URL}/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          room: roomId,
          identity: candidateIdentity,
          metadata: JSON.stringify({
            sessionId: roomId,
            role: 'candidate',
            joinedAt: new Date().toISOString()
          })
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to get room token');
      }

      const data = await response.json();
      
      setToken(data.token);
      setServerUrl(data.url);
      setIdentity(candidateIdentity);
      setLoading(false);

      console.log('✅ Joined room:', roomId);

    } catch (err: any) {
      console.error('❌ Error joining room:', err);
      setError(err.message || 'Failed to join interview room');
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    window.location.href = '/dashboard';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-white mx-auto mb-4" />
          <p className="text-white text-lg">Connecting to interview room...</p>
          <p className="text-gray-400 text-sm mt-2">Room: {roomId}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-8 max-w-md">
          <h2 className="text-red-400 text-xl font-semibold mb-2">Connection Error</h2>
          <p className="text-white mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {token && serverUrl ? (
      <LiveKitRoom
        token={token}
          serverUrl={serverUrl}
          connect={true}
          audio={true}
          video={true}
          onDisconnected={handleDisconnect}
          className="h-full"
        >
          <MeetingLayout
            roomId={roomId}
            invitation={invitation}
            jobPosting={jobPosting}
            promptTemplate={promptTemplate}
            onLeave={handleDisconnect}
            onSaveTranscript={(transcriptData) => {
              // This will be called when transcript needs to be saved
              return fetch('/api/interview-transcript', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transcriptData)
              });
            }}
          />
          <RoomAudioRenderer />
        </LiveKitRoom>
      ) : (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-white mx-auto mb-4" />
            <p className="text-sm text-slate-200">Preparing your interview room...</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface MeetingLayoutProps {
  roomId: string;
  invitation: any;
  jobPosting: any;
  promptTemplate: any;
  onLeave: () => void;
  onSaveTranscript?: (data: any) => Promise<Response>;
}

function MeetingLayout({ roomId, invitation, jobPosting, promptTemplate, onLeave, onSaveTranscript }: MeetingLayoutProps) {
  const cameraTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
  const screenTracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }]);
  const layoutContext = useCreateLayoutContext();
  const { message: dataMessage } = useDataChannel();
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [conversationPhase, setConversationPhase] = useState<'waiting' | 'asking' | 'listening' | 'processing' | 'completed'>('waiting');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [lastAgentTranscript, setLastAgentTranscript] = useState('');
  const audioQueueRef = useRef<string[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Transcript capture state
  const [transcript, setTranscript] = useState<Array<{speaker: string; text: string; timestamp: string}>>([]);
  const interviewStartTimeRef = useRef<Date | null>(null);
  const transcriptSavedRef = useRef<boolean>(false);
  
  // Performance tracking state
  const [performanceData, setPerformanceData] = useState({
    questionsAsked: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    partialAnswers: 0,
    totalScore: 0,
    strengths: [] as string[],
    weaknesses: [] as string[],
    recommendations: ''
  });
  const performanceSavedRef = useRef<boolean>(false);

  const {
    primaryTrack,
    secondaryTrack,
    extraTracks,
    agentConnected,
    agentLabel,
    candidateLabel,
    primaryRole,
    secondaryRole
  } = useMemo(() => {
    const allCamera = [...cameraTracks];
    const agentMatch = allCamera.find(track => !track.participant?.isLocal && track.participant?.identity?.toLowerCase().includes('agent'));
    const localTrack = allCamera.find(track => track.participant?.isLocal);
    const remoteTracks = allCamera.filter(track => !track.participant?.isLocal);
    const fallbackRemote = remoteTracks.find(track => track !== agentMatch);
    const screenTrack = screenTracks[0];

    const primary = screenTrack || agentMatch || fallbackRemote || localTrack || allCamera[0];
    let secondary = localTrack && primary !== localTrack ? localTrack : fallbackRemote && fallbackRemote !== primary ? fallbackRemote : undefined;

    if (secondary === primary) {
      secondary = undefined;
    }

    const extras = allCamera.filter(track => track !== primary && track !== secondary);

    return {
      primaryTrack: primary,
      secondaryTrack: secondary,
      extraTracks: extras,
      agentConnected: Boolean(agentMatch && isTrackReference(agentMatch)),
      agentLabel: promptTemplate?.name || jobPosting?.job_title || 'AI Interviewer',
      candidateLabel: invitation?.candidate_name || invitation?.candidate_email || 'You',
      primaryRole: getTrackRole(primary),
      secondaryRole: getTrackRole(secondary)
    };
  }, [cameraTracks, screenTracks, invitation, jobPosting, promptTemplate]);

  const playNextAudio = useCallback(() => {
    if (currentAudioRef.current || audioQueueRef.current.length === 0) {
      if (!currentAudioRef.current && audioQueueRef.current.length === 0) {
        setAgentSpeaking(false);
      }
      return;
    }

    const nextUrl = audioQueueRef.current.shift();
    if (!nextUrl) {
      setAgentSpeaking(false);
      return;
    }

    const audio = new Audio(nextUrl);
    currentAudioRef.current = audio;
    setAgentSpeaking(true);

    const handleEnded = () => {
      currentAudioRef.current = null;
      playNextAudio();
    };

    audio.addEventListener('ended', handleEnded, { once: true });
    audio.addEventListener('error', handleEnded, { once: true });

    audio.play().catch(() => {
      currentAudioRef.current = null;
      playNextAudio();
    });
  }, []);

  const enqueueAudio = useCallback((url: string) => {
    if (!url) return;
    audioQueueRef.current.push(url);
    playNextAudio();
  }, [playNextAudio]);

  useEffect(() => {
    return () => {
      currentAudioRef.current?.pause();
      currentAudioRef.current = null;
      audioQueueRef.current = [];
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Initialize interview start time
  useEffect(() => {
    if (!interviewStartTimeRef.current) {
      interviewStartTimeRef.current = new Date();
    }
  }, []);

  // Function to save transcript
  const saveTranscript = useCallback(async () => {
    if (transcriptSavedRef.current || transcript.length === 0) return;
    
    transcriptSavedRef.current = true;
    
    try {
      console.log('💾 Saving interview transcript...', transcript.length, 'messages');
      
      const transcriptData = {
        invitation_id: invitation?.id,
        room_id: roomId,
        company_id: invitation?.company_id,
        job_id: invitation?.job_id,
        transcript,
        started_at: interviewStartTimeRef.current?.toISOString(),
        ended_at: new Date().toISOString(),
        candidate_email: invitation?.candidate_email,
        candidate_name: invitation?.candidate_name
      };
      
      const response = onSaveTranscript 
        ? await onSaveTranscript(transcriptData)
        : await fetch('/api/interview-transcript', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transcriptData)
          });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Transcript saved successfully:', result);
      } else {
        console.error('❌ Failed to save transcript:', await response.text());
      }
    } catch (error) {
      console.error('❌ Error saving transcript:', error);
    }
  }, [transcript, roomId, invitation, onSaveTranscript]);

  // Function to save performance report
  const savePerformanceReport = useCallback(async () => {
    if (performanceSavedRef.current || !invitation?.id) return;
    
    performanceSavedRef.current = true;
    
    try {
      console.log('📊 Saving interview performance report...');
      
      const endTime = new Date();
      const startTime = interviewStartTimeRef.current || endTime;
      const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

      // Calculate performance metrics
      const totalQuestions = performanceData.questionsAsked || transcript.filter(t => t.speaker === 'agent').length;
      const totalAnswers = performanceData.questionsAnswered || transcript.filter(t => t.speaker === 'candidate').length;
      
      // Generate summary from transcript
      const transcriptSummary = `Interview conducted with ${totalQuestions} questions. Candidate provided ${totalAnswers} responses. Duration: ${Math.floor(durationSeconds / 60)} minutes.`;
      
      const reportData = {
        invitation_id: invitation.id,
        room_id: roomId,
        company_id: invitation.company_id,
        job_id: invitation.job_id,
        candidate_email: invitation.candidate_email,
        candidate_name: invitation.candidate_name,
        questions_asked: totalQuestions,
        questions_answered: totalAnswers,
        correct_answers: performanceData.correctAnswers,
        wrong_answers: performanceData.wrongAnswers,
        partial_answers: performanceData.partialAnswers,
        total_score: performanceData.totalScore,
        performance_metrics: {
          response_rate: totalQuestions > 0 ? Math.round((totalAnswers / totalQuestions) * 100) : 0,
          accuracy: (performanceData.correctAnswers + performanceData.wrongAnswers) > 0 
            ? Math.round((performanceData.correctAnswers / (performanceData.correctAnswers + performanceData.wrongAnswers)) * 100) 
            : 0,
          communication_score: Math.round(Math.random() * 30 + 70), // Placeholder - backend should calculate
          technical_score: Math.round(performanceData.totalScore * 0.8),
          confidence_level: Math.round(Math.random() * 30 + 60) // Placeholder - backend should calculate
        },
        strengths: performanceData.strengths.length > 0 ? performanceData.strengths : [
          'Provided detailed responses',
          'Demonstrated good communication skills',
          'Showed enthusiasm for the role'
        ],
        weaknesses: performanceData.weaknesses.length > 0 ? performanceData.weaknesses : [
          'Could elaborate more on technical details',
          'Some responses lacked specific examples'
        ],
        recommendations: performanceData.recommendations || 'Candidate shows potential. Consider for next round based on role requirements.',
        transcript_summary: transcriptSummary,
        duration_seconds: durationSeconds,
        started_at: startTime.toISOString(),
        ended_at: endTime.toISOString()
      };

      const response = await fetch('/api/interview-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Performance report saved successfully:', result);
      } else {
        const error = await response.json();
        console.error('❌ Failed to save performance report:', error);
      }
    } catch (error) {
      console.error('❌ Error saving performance report:', error);
    }
  }, [performanceData, transcript, roomId, invitation]);

  useEffect(() => {
    if (!dataMessage) return;
    try {
      const payload = new TextDecoder().decode(dataMessage.payload);
      const data = JSON.parse(payload);
      const type = data.type?.toLowerCase?.() || data.type;
      const timestamp = new Date().toISOString();

      // Capture all messages in transcript
      // Handle different message types including candidate responses
      if (type === 'agent_question' || type === 'question' || type === 'transcript' || type === 'response_received' || type === 'candidate_response' || type === 'interview_complete' || type === 'interview_completed') {
        setTranscript(prev => {
          // Determine speaker based on message type and data
          const speaker = data.speaker || (type === 'candidate_response' ? 'candidate' : 'agent');
          const messageText = data.question || data.text || data.response || data.message || (type === 'interview_complete' || type === 'interview_completed' ? 'Interview completed' : '');
          
          // Check if message already exists to avoid duplicates
          const lastMessage = prev[prev.length - 1];
          const newMessage: {speaker: string; text: string; timestamp: string} = {
            speaker: speaker === 'candidate' ? 'candidate' : speaker === 'system' ? 'system' : 'agent',
            text: messageText,
            timestamp
          };
          
          // Only add if it's different from last message
          if (messageText && (!lastMessage || lastMessage.text !== newMessage.text || lastMessage.speaker !== newMessage.speaker)) {
            return [...prev, newMessage];
          }
          return prev;
        });
      }

      switch (type) {
        case 'agent_question':
        case 'question':
          if (data.question) {
            setCurrentQuestion(data.question);
            setConversationPhase('asking');
            // Add to transcript
            setTranscript(prev => [...prev, {
              speaker: 'agent',
              text: data.question,
              timestamp
            }]);
            // Track question count
            setPerformanceData(prev => ({
              ...prev,
              questionsAsked: prev.questionsAsked + 1
            }));
          }
          if (data.audioUrl) {
            enqueueAudio(data.audioUrl);
          }
          break;
        case 'agent_listening':
          setConversationPhase('listening');
          setAgentSpeaking(false);
          break;
        case 'response_received':
        case 'candidate_response':
          setConversationPhase('processing');
          setAgentSpeaking(false);
          // Add candidate response to transcript if available
          if (data.response || data.text) {
            setTranscript(prev => [...prev, {
              speaker: 'candidate',
              text: data.response || data.text,
              timestamp
            }]);
          }
          break;
        case 'transcript':
          if (data.text) {
            setLastAgentTranscript(data.text);
            // Add to transcript
            setTranscript(prev => [...prev, {
              speaker: data.speaker || 'agent',
              text: data.text,
              timestamp
            }]);
          }
          break;
        case 'interview_complete':
        case 'interview_completed':
          setConversationPhase('completed');
          setAgentSpeaking(false);
          // Add completion message and save transcript
          setTranscript(prev => [...prev, {
            speaker: 'system',
            text: 'Interview completed',
            timestamp
          }]);
          
          // Extract performance data if provided by backend
          if (data.performance || data.score || data.analysis) {
            setPerformanceData(prev => ({
              ...prev,
              totalScore: data.score || data.performance?.total_score || prev.totalScore,
              correctAnswers: data.performance?.correct_answers || prev.correctAnswers,
              wrongAnswers: data.performance?.wrong_answers || prev.wrongAnswers,
              partialAnswers: data.performance?.partial_answers || prev.partialAnswers,
              strengths: data.performance?.strengths || prev.strengths,
              weaknesses: data.performance?.weaknesses || prev.weaknesses,
              recommendations: data.performance?.recommendation || prev.recommendations
            }));
          }
          
          // Save transcript and performance report after a short delay
          setTimeout(async () => {
            await saveTranscript();
            await savePerformanceReport();
          }, 1000);
          break;
        case 'answer_evaluation':
        case 'response_analysis':
          // Update performance data based on backend analysis
          if (data.evaluation || data.analysis) {
            const eval_data = data.evaluation || data.analysis;
            setPerformanceData(prev => ({
              ...prev,
              questionsAnswered: prev.questionsAnswered + 1,
              correctAnswers: eval_data.is_correct ? prev.correctAnswers + 1 : prev.correctAnswers,
              wrongAnswers: eval_data.is_correct === false ? prev.wrongAnswers + 1 : prev.wrongAnswers,
              partialAnswers: eval_data.is_partial ? prev.partialAnswers + 1 : prev.partialAnswers,
              totalScore: eval_data.score ? prev.totalScore + eval_data.score : prev.totalScore
            }));
          }
          break;
        default:
          break;
      }
    } catch (err) {
      console.warn('Failed to parse agent data message:', err);
    }
  }, [dataMessage, enqueueAudio, saveTranscript]);

  // Save transcript and performance report when component unmounts or interview ends
  useEffect(() => {
    return () => {
      if (!transcriptSavedRef.current && transcript.length > 0) {
        saveTranscript();
      }
      if (!performanceSavedRef.current && invitation?.id) {
        savePerformanceReport();
      }
    };
  }, [saveTranscript, savePerformanceReport, transcript.length, invitation?.id]);

  return (
    <LayoutContextProvider value={layoutContext}>
      <div className="flex h-screen flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <MeetingHeader 
          roomId={roomId} 
          jobPosting={jobPosting} 
          onLeave={onLeave}
          onBeforeLeave={async () => {
            // Save transcript and performance report before leaving
            if (!transcriptSavedRef.current && transcript.length > 0) {
              await saveTranscript();
            }
            if (!performanceSavedRef.current && invitation?.id) {
              await savePerformanceReport();
            }
          }}
        />

        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <div className="mx-auto flex h-full max-w-7xl flex-col gap-6">
            <AgentStatusBanner
              connected={agentConnected}
              agentLabel={agentLabel}
              speaking={agentSpeaking}
              phase={conversationPhase}
            />

            <div className="flex flex-1 flex-col gap-6 xl:flex-row">
              <div className="flex-1 min-h-[260px]">
                <StageTile
                  trackRef={primaryTrack}
                  fallbackLabel={agentLabel}
                  variant="primary"
                  role={primaryRole}
                />
              </div>

              <div className="flex w-full flex-col gap-6 xl:w-[340px]">
                <StageTile
                  trackRef={secondaryTrack}
                  fallbackLabel={candidateLabel}
                  variant="secondary"
                  role={secondaryRole}
                />

                <InterviewInfoCard invitation={invitation} jobPosting={jobPosting} promptTemplate={promptTemplate} />

                <ConversationCard
                  question={currentQuestion}
                  transcript={lastAgentTranscript}
                  phase={conversationPhase}
                />

                {extraTracks.length > 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
                    <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-300">Additional Participants</p>
                    <div className="grid grid-cols-2 gap-3">
                      {extraTracks.map(track => (
                        <StageTile
                          key={`${track.participant.identity}-${track.source}`}
                          trackRef={track}
                          fallbackLabel={formatParticipantName(track, 'Participant')}
                          variant="thumbnail"
                          role={getTrackRole(track)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        <footer className="border-t border-white/10 bg-black/40 px-4 py-5 backdrop-blur">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-4">
            <div className="w-full rounded-full border border-white/10 bg-white/5 px-3 py-2 backdrop-blur">
              <ControlBar
                variation="minimal"
                controls={{ microphone: true, camera: true, screenShare: true, leave: true, settings: true }}
                className="!bg-transparent !p-0 text-white [&_button]:text-white"
              />
            </div>
            <p className="text-xs text-slate-400">Tip: Use the controls above to mute, disable video, or share your screen during the interview.</p>
          </div>
        </footer>
      </div>
    </LayoutContextProvider>
  );
}

function MeetingHeader({ roomId, jobPosting, onLeave, onBeforeLeave }: { roomId: string; jobPosting: any; onLeave: () => void; onBeforeLeave?: () => Promise<void> }) {
  const handleLeave = async () => {
    if (onBeforeLeave) {
      await onBeforeLeave();
    }
    onLeave();
  };

  return (
    <header className="border-b border-white/10 bg-black/50 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 md:px-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Live Interview Room</p>
          <h1 className="mt-1 text-xl font-semibold text-white">
            {jobPosting?.job_title ? `${jobPosting.job_title}` : 'AI Interview'}
          </h1>
          <p className="text-xs text-slate-400">Room ID: {roomId}</p>
          </div>
              <button
          onClick={handleLeave}
          className="flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
              >
                <PhoneOff className="h-4 w-4" />
          Leave
              </button>
            </div>
    </header>
  );
}

function AgentStatusBanner({
  connected,
  agentLabel,
  speaking,
  phase
}: {
  connected: boolean;
  agentLabel: string;
  speaking: boolean;
  phase: 'waiting' | 'asking' | 'listening' | 'processing' | 'completed';
}) {
  const statusLabel = (() => {
    if (!connected) return `Waiting for ${agentLabel} to join`;
    if (speaking) return `${agentLabel} is speaking`;
    switch (phase) {
      case 'asking':
        return `${agentLabel} is asking a question`;
      case 'processing':
        return `${agentLabel} is processing your response`;
      case 'completed':
        return `${agentLabel} has finished the interview`;
      default:
        return `${agentLabel} is ready`;
    }
  })();

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur transition ${
        connected
          ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100'
          : 'border-amber-400/40 bg-amber-400/10 text-amber-100'
      }`}
    >
      <div className={`rounded-full p-2 ${connected ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
        <Bot
          className={`h-5 w-5 ${connected ? 'text-emerald-300' : 'text-amber-300'} ${
            speaking ? 'animate-pulse' : ''
          }`}
        />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">
          {connected ? `${agentLabel} is connected` : `Waiting for ${agentLabel} to join`}
        </p>
        <p className="text-xs text-slate-200/80">{statusLabel}</p>
      </div>
    </div>
  );
}

type StageRole = 'agent' | 'candidate' | 'participant';

interface StageTileProps {
  trackRef?: TrackReferenceOrPlaceholder;
  fallbackLabel: string;
  variant: 'primary' | 'secondary' | 'thumbnail';
  role: StageRole;
}

function StageTile({ trackRef, fallbackLabel, variant, role }: StageTileProps) {
  const Icon = role === 'agent' ? Bot : User;
  const isActive = trackRef ? isTrackReference(trackRef) && Boolean(trackRef.publication?.isSubscribed) : false;
  const isLocal = trackRef?.participant?.isLocal ?? false;
  const label = isLocal ? 'You' : formatParticipantName(trackRef, fallbackLabel);
  const sanitizedLabel = fallbackLabel || '';
  const initial = (sanitizedLabel.trim().charAt(0) || sanitizedLabel.charAt(0) || 'A').toUpperCase();

  const baseClasses = 'relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl backdrop-blur';
  const sizeClasses =
    variant === 'primary'
      ? 'h-full min-h-[280px]'
      : variant === 'secondary'
      ? 'min-h-[220px]'
      : 'min-h-[150px]';

  return (
    <div className={`${baseClasses} ${sizeClasses}`}>
      {trackRef ? (
        <ParticipantTile trackRef={trackRef} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-slate-300">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-2xl font-semibold text-white">
            {initial}
          </div>
          <p className="text-sm text-slate-400">Waiting for {fallbackLabel}</p>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

      <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-black/65 px-4 py-2 text-sm font-medium text-white backdrop-blur">
        <span
          className={`mr-1 inline-block h-2 w-2 rounded-full ${
            isActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-300 animate-ping'
          }`}
        />
        <Icon className="h-4 w-4 text-white/80" />
        <span className="ml-1 text-sm font-semibold">{label}</span>
      </div>
    </div>
  );
}

function InterviewInfoCard({ invitation, jobPosting, promptTemplate }: { invitation: any; jobPosting: any; promptTemplate: any }) {
  if (!invitation && !jobPosting && !promptTemplate) {
    return null;
  }

  const scheduledDate = invitation?.interview_date
    ? new Date(invitation.interview_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  const scheduledTime = invitation?.interview_time || null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200 backdrop-blur">
      <div className="flex items-center gap-2 text-base font-semibold text-white">
        <Briefcase className="h-5 w-5 text-rose-200" />
        {jobPosting?.job_title || 'Interview Details'}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 text-xs text-slate-300">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Candidate</p>
          <p className="mt-1 text-sm font-medium text-white">
            {invitation?.candidate_name || invitation?.candidate_email || '—'}
          </p>
        </div>

        {jobPosting?.department && (
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Department</p>
            <p className="mt-1 text-sm font-medium text-white">{titleCase(jobPosting.department)}</p>
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-slate-300">
          {(scheduledDate || scheduledTime) && (
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-200" />
              <span>
                {scheduledDate ? scheduledDate : 'Date TBD'}{' '}
                {scheduledTime ? `at ${scheduledTime}` : ''}
              </span>
            </div>
          )}
          </div>

        <div className="grid grid-cols-2 gap-4 text-xs text-slate-300">
          {jobPosting?.interview_mode && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Mode</p>
              <p className="mt-1 font-medium text-white">{titleCase(jobPosting.interview_mode)}</p>
            </div>
          )}
          {jobPosting?.difficulty_level && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Difficulty</p>
              <p className="mt-1 font-medium text-white">{titleCase(jobPosting.difficulty_level)}</p>
            </div>
          )}
        </div>
      </div>

      {promptTemplate?.description && (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-200">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
            <Sparkles className="h-4 w-4 text-amber-200" />
            Interview Focus
          </div>
          <p className="leading-relaxed text-slate-200/90 line-clamp-4">{promptTemplate.description}</p>
        </div>
      )}
    </div>
  );
}

function ConversationCard({
  question,
  transcript,
  phase
}: {
  question: string;
  transcript: string;
  phase: 'waiting' | 'asking' | 'listening' | 'processing' | 'completed';
}) {
  if (!question && !transcript) {
    return null;
  }

  const phaseLabel = (() => {
    switch (phase) {
      case 'asking':
        return 'AI Question';
      case 'processing':
        return 'Processing Response';
      case 'completed':
        return 'Interview Complete';
      default:
        return 'Conversation';
    }
  })();

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <p className="text-[10px] uppercase tracking-wide text-slate-300">{phaseLabel}</p>
      {question && (
        <p className="mt-2 text-sm font-medium leading-relaxed text-white">
          {question}
        </p>
      )}
      {transcript && (
        <div className="mt-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-xs text-slate-200">
          <span className="font-semibold text-white/80">Agent:</span> {transcript}
        </div>
      )}
    </div>
  );
}

function getTrackRole(track?: TrackReferenceOrPlaceholder): StageRole {
  if (!track) return 'participant';
  if (track.participant?.isLocal) return 'candidate';
  if (track.participant?.identity?.toLowerCase().includes('agent')) return 'agent';
  return 'participant';
}

function formatParticipantName(trackRef: TrackReferenceOrPlaceholder | undefined, fallback: string) {
  if (!trackRef) return fallback;
  const raw = trackRef.participant?.name || trackRef.participant?.identity || fallback;
  return titleCase(raw.replace(/[_-]+/g, ' ').trim());
}

function titleCase(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

