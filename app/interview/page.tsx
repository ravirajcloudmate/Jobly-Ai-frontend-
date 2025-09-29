'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { LiveKitRoom, VideoConference, useParticipants } from '@livekit/components-react';
import { RoomEvent, Room } from 'livekit-client';
import '@livekit/components-styles';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Settings, 
  MessageSquare, 
  PhoneOff, 
  Wifi, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Camera,
  Maximize,
  Minimize
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

// Room Data Handler Component - Removed due to useRoom hook not being available
// Data channel handling will be done through backend API polling instead



// Connection Status Component
function ConnectionStatus({ status, quality }: { status: string; quality?: string }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600 bg-green-100';
      case 'connecting': return 'text-blue-600 bg-blue-100';
      case 'reconnecting': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getQualityColor = (quality?: string) => {
    switch (quality) {
      case 'good': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className={getStatusColor(status)}>
        {status === 'connecting' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
        {status === 'connected' && <CheckCircle className="w-3 h-3 mr-1" />}
        {status === 'failed' && <AlertCircle className="w-3 h-3 mr-1" />}
        {status === 'reconnecting' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
      {quality && (
        <Badge variant="outline" className={getQualityColor(quality)}>
          <Wifi className="w-3 h-3 mr-1" />
          {quality.charAt(0).toUpperCase() + quality.slice(1)}
        </Badge>
      )}
    </div>
  );
}

// Audio Controls Component
function AudioControls({ 
  isMuted, 
  volume, 
  onMuteToggle, 
  onVolumeChange, 
  onDeviceSelect 
}: {
  isMuted: boolean;
  volume: number;
  onMuteToggle: () => void;
  onVolumeChange: (volume: number) => void;
  onDeviceSelect: (device: string) => void;
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then(devices => {
      setDevices(devices.filter(device => device.kind === 'audioinput' || device.kind === 'audiooutput'));
    });
  }, []);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Volume2 className="w-4 h-4" />
          Audio Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Button
            variant={isMuted ? "destructive" : "outline"}
            size="sm"
            onClick={onMuteToggle}
            className="flex items-center gap-2"
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {isMuted ? 'Unmute' : 'Mute'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Volume</label>
          <div className="flex items-center gap-2">
            <VolumeX className="w-3 h-3" />
            <Slider
              value={[volume]}
              onValueChange={(value) => onVolumeChange(value[0])}
              max={100}
              step={1}
              className="flex-1"
              disabled={isMuted}
            />
            <Volume2 className="w-3 h-3" />
            <span className="text-xs w-8">{volume}%</span>
          </div>
        </div>

        {showSettings && (
          <div className="space-y-2 pt-2 border-t">
            <label className="text-xs text-muted-foreground">Microphone</label>
            <Select onValueChange={onDeviceSelect}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Select microphone" />
              </SelectTrigger>
              <SelectContent>
                {devices.filter(d => d.kind === 'audioinput' && d.deviceId && d.deviceId.trim() !== '').map(device => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || 'Microphone'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Chat Panel Component
function ChatPanel({ 
  messages, 
  onSendMessage, 
  isOpen, 
  onToggle 
}: {
  messages: Array<{ id: string; text: string; timestamp: Date; sender: string }>;
  onSendMessage: (message: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  return (
    <Card className={cn("w-80 transition-all duration-300", isOpen ? "opacity-100" : "opacity-0 pointer-events-none")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Chat
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onToggle}>
            <Minimize className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea ref={scrollAreaRef} className="h-64 px-4">
          <div className="space-y-3 py-2">
            {messages.map((message) => (
              <div key={message.id} className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium">{message.sender}</span>
                  <span>{message.timestamp.toLocaleTimeString()}</span>
                </div>
                <p className="text-sm">{message.text}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
        <Separator />
        <div className="p-3">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="h-8"
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <Button size="sm" onClick={handleSend} disabled={!newMessage.trim()}>
              Send
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Interview Page Component
export default function InterviewPage() {
  const [url, setUrl] = useState<string>();
  const [token, setToken] = useState<string>();
  const [status, setStatus] = useState<'connecting' | 'connected' | 'failed' | 'reconnecting'>('connecting');
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'medium' | 'poor'>('good');
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Array<{ id: string; text: string; timestamp: Date; sender: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Agent-specific states
  const [agentConnected, setAgentConnected] = useState(false);
  const [agentStatus, setAgentStatus] = useState<'waiting' | 'connecting' | 'connected' | 'error'>('waiting');
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [interviewProgress, setInterviewProgress] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const roomRef = useRef<Room | null>(null);
  const [candidateId] = useState(`candidate-${Date.now()}-${Math.floor(Math.random() * 1e6)}`);
  const [jobId] = useState(`job-${Date.now()}-${Math.floor(Math.random() * 1e4)}`);
  
  const roomName = `interview-${candidateId}`;

  // Question handler
  const handleQuestion = useCallback((question: string) => {
    setCurrentQuestion(question);
    setLastQuestion(question);
  }, []);

  // Audio playback function
  const playAgentAudio = useCallback((audioData: string, question: string) => {
    try {
      // Stop current audio if playing
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }

      // Decode base64 audio data
      const binaryString = atob(audioData);
      const audioBuffer = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        audioBuffer[i] = binaryString.charCodeAt(i);
      }

      // Create audio blob and play
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      setCurrentAudio(audio);
      setLastQuestion(question);
      setIsAgentSpeaking(true);

      audio.onended = () => {
        setIsAgentSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        setCurrentAudio(null);
      };

      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        setIsAgentSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        setCurrentAudio(null);
      };

      audio.play().catch(error => {
        console.error('Failed to play audio:', error);
        setIsAgentSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        setCurrentAudio(null);
      });

      console.log('🎤 Playing agent question:', question);
    } catch (error) {
      console.error('Error processing audio data:', error);
      setIsAgentSpeaking(false);
    }
  }, [currentAudio]);

  // Audio handler for data channel
  const handleAudio = useCallback((audioData: string) => {
    setIsAgentSpeaking(true);
    console.log('🎵 Playing agent audio...');
    
    const byteString = atob(audioData);
    const buf = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      buf[i] = byteString.charCodeAt(i);
    }
    
    // Create and play audio
    const blob = new Blob([buf], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    
    audio.onended = () => {
      setIsAgentSpeaking(false);
      URL.revokeObjectURL(audioUrl);
      console.log('🔇 Audio playback ended');
    };
    
    audio.onerror = () => {
      setIsAgentSpeaking(false);
      URL.revokeObjectURL(audioUrl);
      console.error('🚫 Audio playback error');
    };
    
    audio.play().catch(() => {
      setIsAgentSpeaking(false);
      URL.revokeObjectURL(audioUrl);
      console.error('🚫 Failed to play audio');
    });
  }, []);

  // Cleanup audio and room on unmount
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, [currentAudio]);

  // Prevent multiple connections by checking if already connected
  useEffect(() => {
    if (status === 'connected' && roomRef.current) {
      console.log('✅ Already connected to room, skipping reconnection');
      return;
    }
  }, [status]);

  useEffect(() => {
    const startInterview = async () => {
      try {
        setStatus('connecting');
        setError(null);
        setAgentStatus('connecting');
        
        const identity = `candidate-${candidateId}`;
        
        // Step 1: Get candidate token from backend
        const tokenResp = await fetch('http://localhost:8000/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            room: roomName, 
            identity: candidateId  // Use the same candidateId that was generated
          }),
        });
        
        if (!tokenResp.ok) {
          const errorData = await tokenResp.json().catch(() => ({}));
          const errorMessage = errorData.error || `Failed to get token: ${tokenResp.status} ${tokenResp.statusText}`;
          console.error('🚫 Backend token generation failed:', errorMessage);
          throw new Error(`Backend Token Error: ${errorMessage}. Please check your Python backend.`);
        }
        
        const tokenData = await tokenResp.json();
        setUrl(tokenData.url);
        setToken(tokenData.token);
        
        // Note: We'll let LiveKitRoom component handle the connection
        // Data channel will be set up in onConnected callback
        
        // Step 2: Start interview and trigger agent
        console.log('🚀 Starting interview session...');
        const interviewResp = await fetch('/api/start-interview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            roomName, 
            candidateId, 
            jobId 
          }),
        });
        
        if (interviewResp.ok) {
          const interviewData = await interviewResp.json();
          console.log('✅ Interview started:', interviewData.message);
          setInterviewStarted(true);
          
          // Start checking for agent connection
          checkAgentStatus();
        } else {
          console.warn('⚠️ Failed to start interview session, but continuing...');
          setInterviewStarted(true);
          checkAgentStatus();
        }
        
      } catch (e: any) {
        console.error('Connection error:', e);
        setError(e.message || 'Failed to connect to interview room');
        setStatus('failed');
        setAgentStatus('error');
      }
    };
    
    startInterview();
  }, [candidateId, jobId, roomName]);

  // Check agent connection status
  const checkAgentStatus = useCallback(async () => {
    try {
      const resp = await fetch(`/api/agent-status?room=${encodeURIComponent(roomName)}&candidateId=${encodeURIComponent(candidateId)}`);
      if (resp.ok) {
        const data = await resp.json();
        setAgentConnected(data.agentConnected);
        
        if (data.agentConnected) {
          setAgentStatus('connected');
          setAgentConnected(true);
          setCurrentQuestion(data.currentQuestion || null);
          setInterviewProgress(data.interviewProgress || 0);
          setAiAnalysis(data.aiAnalysis || null);
          setIsListening(data.isListening || false);
          setIsAgentSpeaking(data.isAgentSpeaking || false);
          
          console.log('🤖 AI Agent connected successfully!');
          console.log('📊 Interview Progress:', data.interviewProgress + '%');
          if (data.currentQuestion) {
            console.log('❓ Current Question:', data.currentQuestion);
          }
          if (data.aiAnalysis) {
            console.log('🧠 AI Analysis:', data.aiAnalysis);
          }
          if (data.isListening) {
            console.log('🎤 Agent is listening...');
          }
          if (data.isAgentSpeaking) {
            console.log('🔊 Agent is speaking...');
          }
        } else {
          setAgentStatus('waiting');
          setAgentConnected(false);
          // Continue checking if agent hasn't connected yet
          setTimeout(checkAgentStatus, 3000);
        }
        
        // Update participants list
        if (data.participants) {
          setParticipants(data.participants);
        }
      }
    } catch (error) {
      console.error('Failed to check agent status:', error);
      setAgentStatus('error');
    }
  }, [roomName, candidateId]);

  const onConnected = useCallback(() => {
    setStatus('connected');
    setError(null);
    setConnectionQuality('good');
    console.log('🔗 Connected to LiveKit room');
    
    // We'll set up data channel listener through useRoom hook
    // when the room becomes available
  }, []);

  // Data channel will be handled by backend agent
  // For now, we'll rely on the backend to send audio via HTTP API
  // and display it through the status polling mechanism

  const onDisconnected = useCallback((reason?: any) => {
    setStatus('failed');
    
    // Decode disconnect reason
    let reasonText = 'Unknown error';
    let errorMessage = 'Connection lost. Please try again.';
    
    switch (reason) {
      case 0:
        reasonText = 'Client initiated disconnect';
        errorMessage = 'Connection was closed by client.';
        break;
      case 1:
        reasonText = 'Duplicate identity';
        errorMessage = 'Duplicate identity detected. Please refresh the page to get a new identity.';
        break;
      case 2:
        reasonText = 'Room not found or invalid credentials';
        errorMessage = 'Room not found or invalid credentials. Please check your LiveKit configuration.';
        break;
      case 3:
        reasonText = 'Participant disconnected';
        errorMessage = 'Participant disconnected. Please try reconnecting.';
        break;
      case 4:
        reasonText = 'Server shutdown';
        errorMessage = 'LiveKit server is down. Please try again later.';
        break;
      case 5:
        reasonText = 'Network error';
        errorMessage = 'Network connection error. Please check your internet connection.';
        break;
      default:
        reasonText = `Disconnect code: ${reason}`;
        errorMessage = `Connection lost: ${reasonText}. Please try again.`;
    }
    
    console.error('🔌 LiveKit disconnected:', reasonText);
    setError(errorMessage);
  }, []);

  const onReconnecting = useCallback(() => {
    setStatus('reconnecting');
  }, []);

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
  };

  const handleDeviceSelect = (deviceId: string) => {
    console.log('Selected device:', deviceId);
  };

  const handleSendMessage = (message: string) => {
    const newMessage = {
      id: Date.now().toString(),
      text: message,
      timestamp: new Date(),
      sender: 'You'
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  function AgentStatus() {
    const participants = useParticipants();
    const hasAgent = participants.some((p: any) => 
      !p.isLocal && (
        (p.identity || '').toLowerCase().includes('agent') || 
        (p.name || '').toLowerCase().includes('agent')
      )
    );
    
    const getStatusConfig = (status: string, connected: boolean) => {
      if (connected) {
        return {
          icon: CheckCircle,
          iconClass: 'w-4 h-4 text-green-600',
          textClass: 'text-green-600 font-medium',
          label: 'AI Agent Connected'
        };
      }
      
      switch (status) {
        case 'connecting':
          return {
            icon: Loader2,
            iconClass: 'w-4 h-4 text-blue-600 animate-spin',
            textClass: 'text-blue-600',
            label: 'Connecting Agent...'
          };
        case 'waiting':
          return {
            icon: Loader2,
            iconClass: 'w-4 h-4 text-yellow-600 animate-spin',
            textClass: 'text-yellow-600',
            label: 'Waiting for AI Agent...'
          };
        case 'error':
          return {
            icon: AlertCircle,
            iconClass: 'w-4 h-4 text-red-600',
            textClass: 'text-red-600',
            label: 'Agent Connection Error'
          };
        default:
          return {
            icon: Loader2,
            iconClass: 'w-4 h-4 text-gray-600 animate-spin',
            textClass: 'text-gray-600',
            label: 'Initializing...'
          };
      }
    };

    const config = getStatusConfig(agentStatus, agentConnected || hasAgent);
    const IconComponent = config.icon;
    
    return (
      <div className="flex items-center gap-2 text-sm">
        <IconComponent className={config.iconClass} />
        <span className={config.textClass}>{config.label}</span>
        {agentStatus === 'waiting' && (
          <span className="text-xs text-yellow-600 ml-2">
            (AI interviewer will join shortly...)
          </span>
        )}
        {agentConnected && (
          <div className="flex items-center gap-1 ml-2">
            <Badge variant="outline" className="text-xs px-2 py-0.5">
              🎤 Voice Questions
            </Badge>
            <Badge variant="outline" className="text-xs px-2 py-0.5">
              🎧 Voice Listening
            </Badge>
            <Badge variant="outline" className="text-xs px-2 py-0.5">
              🧠 AI Analysis
            </Badge>
          </div>
        )}
      </div>
    );
  }

  function VideoConferenceWrapper() {
    return (
      <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
        <VideoConference />
        <div className="absolute top-4 left-4">
          <AgentStatus />
        </div>
        <div className="absolute top-4 right-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={toggleFullscreen}
            className="bg-black/50 hover:bg-black/70 text-white border-0"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
        </div>
        
        {/* Real-time AI Interview Status */}
        {agentConnected && (
          <div className="absolute bottom-4 left-4 right-4 space-y-3">
            {/* Interview Progress and Current Question */}
            <Card className="bg-black/80 text-white border-white/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Interview Progress</span>
                  <span className="text-sm">{interviewProgress}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2 mb-3">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${interviewProgress}%` }}
                  ></div>
                </div>
                {(currentQuestion || lastQuestion) && (
                  <div className="text-sm">
                    <span className="text-green-400 font-medium">
                      {isAgentSpeaking ? 'Playing Question:' : 'Current Question:'}
                    </span>
                    <p className="mt-1">{currentQuestion || lastQuestion}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Status Indicators */}
            <div className="flex gap-2">
              {isListening && (
                <Badge variant="secondary" className="bg-red-500/20 text-red-300 border-red-400/30">
                  <Mic className="w-3 h-3 mr-1 animate-pulse" />
                  AI Listening
                </Badge>
              )}
              {isAgentSpeaking && (
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-400/30">
                  <Volume2 className="w-3 h-3 mr-1 animate-pulse" />
                  AI Speaking
                </Badge>
              )}
              {aiAnalysis && (
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-400/30">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  AI Analyzing
                </Badge>
              )}
            </div>

            {/* AI Analysis Display */}
            {aiAnalysis && (
              <Card className="bg-purple-900/80 text-white border-purple-400/30">
                <CardContent className="p-3">
                  <div className="text-xs font-medium text-purple-300 mb-1">AI Analysis:</div>
                  <p className="text-sm">{aiAnalysis}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    );
  }

  if (!url || !token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <h2 className="text-xl font-semibold">Preparing Interview</h2>
            <p className="text-sm text-muted-foreground text-center">
              Setting up your interview room...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && status === 'failed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-6 h-6" />
              <h2 className="text-xl font-semibold">Connection Failed</h2>
            </div>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full"
              >
                Try Again
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.open('/test-livekit', '_blank')}
                className="w-full"
              >
                Test LiveKit Connection
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={url}
      token={token}
      connect={true}
      video={true}
      audio={true}
      onConnected={onConnected}
      onDisconnected={onDisconnected}
      className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100"
    >
      {/* RoomDataHandler removed - data channel handling via backend API polling */}
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">Live Interview</h1>
            <Badge variant="outline" className="text-xs">
              Room: {roomName}
            </Badge>
          </div>
          
          <div className="flex items-center gap-4">
            <ConnectionStatus status={status} quality={connectionQuality} />
            
            {/* AI Status Indicators in Header */}
            {agentConnected && (
              <div className="flex items-center gap-2">
                {isListening && (
                  <Badge variant="outline" className="text-red-600 border-red-300">
                    <Mic className="w-3 h-3 mr-1 animate-pulse" />
                    Listening
                  </Badge>
                )}
                {isAgentSpeaking && (
                  <Badge variant="outline" className="text-blue-600 border-blue-300">
                    <Volume2 className="w-3 h-3 mr-1 animate-pulse" />
                    Speaking
                  </Badge>
                )}
                {aiAnalysis && (
                  <Badge variant="outline" className="text-purple-600 border-purple-300">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Analyzing
                  </Badge>
                )}
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChat(!showChat)}
                className={cn("transition-colors", showChat && "bg-blue-50 text-blue-600")}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-6 p-6 overflow-hidden">
          {/* Video Section */}
          <div className="flex-1 flex flex-col">
            <Card className="flex-1">
              <CardContent className="p-6 h-full">
                <VideoConferenceWrapper />
              </CardContent>
            </Card>
            
            {/* Controls */}
            <div className="mt-4 flex justify-center gap-3">
              <Button
                variant={isMuted ? "destructive" : "outline"}
                size="lg"
                onClick={handleMuteToggle}
                className="flex items-center gap-2"
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                {isMuted ? 'Unmute' : 'Mute'}
              </Button>
              
              <Button variant="outline" size="lg">
                <Camera className="w-5 h-5 mr-2" />
                Video
              </Button>
              
              <Button variant="destructive" size="lg">
                <PhoneOff className="w-5 h-5 mr-2" />
                End Call
              </Button>
        </div>
      </div>

          {/* Side Panel */}
          <div className="w-80 space-y-4">
            {showSettings && (
              <AudioControls
                isMuted={isMuted}
                volume={volume}
                onMuteToggle={handleMuteToggle}
                onVolumeChange={handleVolumeChange}
                onDeviceSelect={handleDeviceSelect}
              />
            )}
            
            {showChat && (
              <ChatPanel
                messages={messages}
                onSendMessage={handleSendMessage}
                isOpen={showChat}
                onToggle={() => setShowChat(false)}
              />
            )}
          </div>
        </div>
      </div>
    </LiveKitRoom>
  );
}