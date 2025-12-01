'use client';

import { useEffect, useState } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useDataChannel,
  useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Maximize2, 
  Minimize2,
  User,
  Bot,
  CheckCircle2,
  AlertCircle,
  Clock,
  MessageSquare,
  Volume2,
  Settings,
  XCircle
} from 'lucide-react';

interface InterviewRoomProps {
  candidateId: string;
  jobId: string;
  candidateName?: string;
  onEndInterview?: () => void;
}

export default function InterviewRoomEnhanced({ 
  candidateId, 
  jobId,
  candidateName = 'Candidate',
  onEndInterview 
}: InterviewRoomProps) {
  const [token, setToken] = useState('');
  const [roomName, setRoomName] = useState('');
  const [liveKitUrl, setLiveKitUrl] = useState('');
  const [connected, setConnected] = useState(false);
  const [agentConnected, setAgentConnected] = useState(false);
  const [agentStatus, setAgentStatus] = useState('waiting');
  const [error, setError] = useState('');
  const [mediaDevices, setMediaDevices] = useState<MediaDeviceInfo[]>([]);
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Check media devices
  useEffect(() => {
    checkMediaDevices();
  }, []);

  const checkMediaDevices = async () => {
    try {
      console.log('🎤 Checking media devices...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone permission granted');
      setMicPermission('granted');
      stream.getTracks().forEach(track => track.stop());
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log('📱 Available devices:', devices);
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      setMediaDevices(devices);
      
      if (audioInputs.length === 0) {
        setError('No microphone detected. Please connect a microphone.');
      }
    } catch (error: any) {
      console.error('❌ Error accessing media devices:', error);
      setMicPermission('denied');
      
      if (error.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow microphone access.');
      } else if (error.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone.');
      } else {
        setError(`Media device error: ${error.message}`);
      }
    }
  };

  useEffect(() => {
    if (micPermission === 'granted') {
      startInterview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micPermission]);

  useEffect(() => {
    if (!roomName) return;
    const checkAgentStatus = async () => {
      try {
        const response = await fetch(`http://localhost:8000/agent-status/${roomName}`);
        const data = await response.json();
        
        if (data.agentConnected) {
          setAgentConnected(true);
          setAgentStatus('connected');
        } else {
          setAgentStatus('connecting');
        }
      } catch (error) {
        console.error('❌ Error checking agent status:', error);
      }
    };

    checkAgentStatus();
    const interval = setInterval(() => {
      if (!agentConnected) checkAgentStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, [roomName, agentConnected]);

  const startInterview = async () => {
    try {
      setAgentStatus('initializing');
      const response = await fetch('http://localhost:8000/start-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: `interview-${candidateId}-${Date.now()}`,
          candidateId,
          jobId,
          candidateName,
          roleType: 'general'
        }),
      });

      const data = await response.json();
      
      if (data.success || data.status === 'success') {
        setToken(data.token);
        setRoomName(data.roomName);
        setLiveKitUrl(data.url);
        setAgentStatus('waiting_for_agent');
      } else {
        setError('Failed to start interview');
      }
    } catch (error) {
      setError('Error connecting to server');
    }
  };

  const handleEndCall = async () => {
    if (window.confirm('Are you sure you want to end the interview?')) {
      try {
        await fetch('http://localhost:8000/end-interview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomName, candidateId }),
        });
        if (onEndInterview) onEndInterview();
        window.location.href = '/dashboard';
      } catch (error) {
        console.error('Error ending interview:', error);
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // Implement actual mute logic with LiveKit
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-red-100 rounded-full p-4">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">Connection Error</h2>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          
          {micPermission === 'denied' && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Enable Microphone:</p>
                  <ol className="text-xs text-yellow-700 mt-2 list-decimal list-inside space-y-1">
                    <li>Click the lock icon in your browser</li>
                    <li>Allow microphone permission</li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
            >
              Retry
            </button>
            <button
              onClick={checkMediaDevices}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 rounded-lg transition-colors"
            >
              Check Devices
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!token || !liveKitUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <Mic className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-600" />
          </div>
          <p className="mt-6 text-lg font-medium text-gray-700">
            {micPermission === 'prompt' ? 'Requesting microphone permission...' : 'Initializing interview...'}
          </p>
          {mediaDevices.length > 0 && (
            <p className="mt-2 text-sm text-green-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {mediaDevices.filter(d => d.kind === 'audioinput').length} microphone(s) detected
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'min-h-screen'} bg-gradient-to-br from-slate-50 to-slate-100`}>
      <LiveKitRoom
        key={`room-enhanced-${roomName}-${Date.now()}`}
        token={token}
        serverUrl={liveKitUrl}
        connect={true}
        audio={true}
        video={false}
        onConnected={() => setConnected(true)}
        onDisconnected={(reason) => {
          console.log('Disconnected:', reason);
          // Delay state update to allow cleanup
          setTimeout(() => {
            setConnected(false);
          }, 100);
        }}
      >
        <InterviewInterface 
          candidateId={candidateId}
          candidateName={candidateName}
          connected={connected}
          agentConnected={agentConnected}
          agentStatus={agentStatus}
          mediaDevices={mediaDevices}
          isFullscreen={isFullscreen}
          isMuted={isMuted}
          showSettings={showSettings}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          onToggleMute={toggleMute}
          onEndCall={handleEndCall}
          onToggleSettings={() => setShowSettings(!showSettings)}
        />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}

function InterviewInterface({ 
  candidateId,
  candidateName,
  connected,
  agentConnected,
  agentStatus,
  mediaDevices,
  isFullscreen,
  isMuted,
  showSettings,
  onToggleFullscreen,
  onToggleMute,
  onEndCall,
  onToggleSettings
}: { 
  candidateId: string;
  candidateName: string;
  connected: boolean;
  agentConnected: boolean;
  agentStatus: string;
  mediaDevices: MediaDeviceInfo[];
  isFullscreen: boolean;
  isMuted: boolean;
  showSettings: boolean;
  onToggleFullscreen: () => void;
  onToggleMute: () => void;
  onEndCall: () => void;
  onToggleSettings: () => void;
}) {
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [progress, setProgress] = useState(0);
  const [interviewStatus, setInterviewStatus] = useState('waiting');
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(5);

  const { message } = useDataChannel();
  const audioTracks = useTracks([Track.Source.Microphone]);

  useEffect(() => {
    if (message) {
      try {
        const payload = message.payload;
        const data = JSON.parse(new TextDecoder().decode(payload));

        switch (data.type) {
          case 'question':
            setCurrentQuestion(data.question);
            setProgress(data.progress || 0);
            setQuestionNumber(data.question_number || 0);
            setTotalQuestions(data.total_questions || 5);
            setInterviewStatus('asking');
            break;
          case 'response_received':
            setInterviewStatus('processing');
            break;
          case 'interview_completed':
            setInterviewStatus('completed');
            break;
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    }
  }, [message]);

  return (
    <div className={`${isFullscreen ? 'h-screen' : 'min-h-screen'} flex flex-col`}>
      {/* Header */}
      <header className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="w-6 h-6 text-blue-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">AI Interview</h1>
                  <p className="text-sm text-gray-600">{candidateName}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-full ${
                connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-sm font-medium">{connected ? 'Connected' : 'Disconnected'}</span>
              </div>

              {/* Agent Status */}
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-full ${
                agentConnected ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                <Bot className={`w-4 h-4 ${agentConnected ? 'animate-pulse' : 'animate-bounce'}`} />
                <span className="text-sm font-medium">{agentConnected ? 'AI Ready' : 'AI Joining...'}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={onToggleSettings}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Settings"
                >
                  <Settings className="w-5 h-5 text-gray-600" />
                </button>
                
                <button
                  onClick={onToggleFullscreen}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? <Minimize2 className="w-5 h-5 text-gray-600" /> : <Maximize2 className="w-5 h-5 text-gray-600" />}
                </button>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Question {questionNumber} of {totalQuestions}</span>
              </div>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Interview Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Agent Status Card */}
            <div className={`rounded-2xl shadow-lg p-6 ${
              agentConnected 
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' 
                : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
            }`}>
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-full ${agentConnected ? 'bg-white/20' : 'bg-white/30'}`}>
                  <Bot className={`w-8 h-8 ${agentConnected ? '' : 'animate-bounce'}`} />
                </div>
                <div className="flex-1">
                  {agentConnected ? (
                    <>
                      <h3 className="text-lg font-semibold">AI Interviewer Active</h3>
                      <p className="text-sm opacity-90">Ready to proceed with your interview</p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold">AI Interviewer Connecting...</h3>
                      <p className="text-sm opacity-90">Please wait while the AI joins the room</p>
                    </>
                  )}
                </div>
                {agentConnected && <CheckCircle2 className="w-8 h-8" />}
              </div>
            </div>

            {/* Current Question */}
            {currentQuestion && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <MessageSquare className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Current Question</h3>
                    <p className="text-gray-700 text-base leading-relaxed">{currentQuestion}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Status Instructions */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-center space-x-3">
                {interviewStatus === 'asking' && (
                  <>
                    <Volume2 className="w-5 h-5 text-blue-500 animate-pulse" />
                    <p className="text-gray-700">AI is asking a question...</p>
                  </>
                )}
                {interviewStatus === 'waiting' && !agentConnected && (
                  <>
                    <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />
                    <p className="text-gray-700">Waiting for AI interviewer...</p>
                  </>
                )}
                {interviewStatus === 'processing' && (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-green-600 border-t-transparent" />
                    <p className="text-gray-700">Processing your response...</p>
                  </>
                )}
                {interviewStatus === 'completed' && (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <p className="text-gray-700">Interview completed!</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Audio Status */}
            {audioTracks.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Audio Status</h3>
                  <div className="relative">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75" />
                  </div>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <Mic className="w-5 h-5 text-green-500" />
                  <span>Microphone Active ({audioTracks.length} track{audioTracks.length !== 1 ? 's' : ''})</span>
                </div>
              </div>
            )}

            {/* Device Info */}
            {showSettings && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Audio Devices
                </h3>
                <div className="space-y-2">
                  {mediaDevices.filter((d: MediaDeviceInfo) => d.kind === 'audioinput').map((device: MediaDeviceInfo, index: number) => (
                    <div key={device.deviceId} className="flex items-center space-x-2 text-sm p-2 bg-gray-50 rounded-lg">
                      <Mic className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">{device.label || `Microphone ${index + 1}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Call Controls */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Call Controls</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={onToggleMute}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all ${
                    isMuted 
                      ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {isMuted ? <MicOff className="w-6 h-6 mb-2" /> : <Mic className="w-6 h-6 mb-2" />}
                  <span className="text-xs font-medium">{isMuted ? 'Unmute' : 'Mute'}</span>
                </button>

                <button
                  onClick={onEndCall}
                  className="flex flex-col items-center justify-center p-4 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all"
                >
                  <PhoneOff className="w-6 h-6 mb-2" />
                  <span className="text-xs font-medium">End Call</span>
                </button>
              </div>
            </div>

            {/* Interview Stats */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Interview Progress</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Questions</span>
                  <span className="text-sm font-semibold text-gray-900">{questionNumber}/{totalQuestions}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Progress</span>
                  <span className="text-sm font-semibold text-gray-900">{Math.round(progress)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className="text-sm font-semibold text-gray-900 capitalize">{interviewStatus}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

