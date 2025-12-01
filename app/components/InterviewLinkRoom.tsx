import { useState, useEffect, useRef } from 'react';
import { Video, Mic, MicOff, VideoOff, Phone, MessageSquare } from 'lucide-react';
import { saveTranscript, startAutoSaveTranscript } from '@/lib/transcriptUtils';


export default function InterviewLinkRoom() {
  const [sessionData, setSessionData] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [messages, setMessages] = useState<{ speaker: string; text: string; timestamp: Date }[]>([]);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [interviewStartTime, setInterviewStartTime] = useState<string | null>(null);

  const candidateVideoRef = useRef<HTMLVideoElement | null>(null);
  const agentVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const autoSaveCleanupRef = useRef<(() => void) | null>(null);

  // Get session ID from URL
  const sessionId = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('session')
    : null;

  useEffect(() => {
    if (sessionId) {
      initializeInterview();
    }
  }, [sessionId]);

  // Cleanup effect: save transcript if component unmounts
  useEffect(() => {
    return () => {
      // Stop auto-save on unmount
      if (autoSaveCleanupRef.current) {
        autoSaveCleanupRef.current();
      }

      // Save final transcript if interview was in progress
      if (sessionData && messages.length > 0 && interviewStartTime) {
        saveTranscript({
          invitation_id: sessionData.invitation_id || sessionData.id,
          room_id: sessionData.room_id,
          company_id: sessionData.company_id,
          job_id: sessionData.job_id,
          transcript: messages,
          started_at: interviewStartTime,
          ended_at: new Date().toISOString(),
          candidate_email: sessionData.candidate_email,
          candidate_name: sessionData.candidate_name
        });
      }
    };
  }, [sessionData, messages, interviewStartTime]);


  const initializeInterview = async () => {
    try {
      // 1. Fetch session details from backend
      const response = await fetch(`/api/interview/session/${sessionId}`);
      const data = await response.json();
      setSessionData(data);

      // 2. Initialize WebSocket connection to Python backend
      connectWebSocket(data.room_id);

      // 3. Initialize media devices
      await setupMediaDevices();

      // 4. Notify backend that candidate joined
      await fetch('/api/interview/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

    } catch (error) {
      console.error('Failed to initialize interview:', error);
      alert('Failed to join interview. Please check your link.');
    }
  };

  const connectWebSocket = (roomId: string) => {
    // Connect to Python backend WebSocket
    const wsUrl = `ws://localhost:8001/ws/interview/${roomId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Connected to interview server');
      setIsConnected(true);

      // Send initial connection message
      ws.send(JSON.stringify({
        type: 'join',
        role: 'candidate',
        sessionId: sessionId
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('Disconnected from interview server');
      setIsConnected(false);
    };

    wsRef.current = ws;
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'agent_joined':
        console.log('AI Agent joined the interview');
        startInterview();
        break;

      case 'agent_question':
        // AI agent asked a question
        setCurrentQuestion(data.question);
        setIsAgentSpeaking(true);
        addMessage('agent', data.question);

        // Play audio if provided
        if (data.audioUrl) {
          playAudio(data.audioUrl);
        }
        break;

      case 'agent_listening':
        // Agent is waiting for response
        setIsAgentSpeaking(false);
        break;

      case 'transcript':
        // Real-time transcript update
        addMessage(data.speaker, data.text);
        break;

      case 'interview_complete':
        // Interview finished
        handleInterviewEnd(data);
        break;
    }
  };

  const setupMediaDevices = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      localStreamRef.current = stream;

      if (candidateVideoRef.current) {
        candidateVideoRef.current.srcObject = stream;
      }

      // Setup WebRTC peer connection for video streaming
      setupWebRTC(stream);

    } catch (error) {
      console.error('Failed to access media devices:', error);
      alert('Please allow camera and microphone access to continue.');
    }
  };

  const setupWebRTC = (stream: MediaStream) => {
    // WebRTC setup for real-time video/audio streaming
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    };

    const pc = new RTCPeerConnection(configuration);

    // Add local stream tracks to peer connection
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    // Handle incoming tracks (from AI agent if using video avatar)
    pc.ontrack = (event) => {
      if (agentVideoRef.current) {
        agentVideoRef.current.srcObject = event.streams[0];
      }
    };

    peerConnectionRef.current = pc;
  };

  const startInterview = () => {
    console.log('Interview started with AI Agent');

    // Record interview start time
    const startTime = new Date().toISOString();
    setInterviewStartTime(startTime);

    // Start auto-save for transcript (every 30 seconds)
    if (sessionData) {
      const cleanup = startAutoSaveTranscript(() => ({
        invitation_id: sessionData.invitation_id || sessionData.id,
        room_id: sessionData.room_id,
        company_id: sessionData.company_id,
        job_id: sessionData.job_id,
        transcript: messages,
        started_at: startTime,
        candidate_email: sessionData.candidate_email,
        candidate_name: sessionData.candidate_name
      }), 30000);

      autoSaveCleanupRef.current = cleanup;
    }

    // Send ready signal to Python backend
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'candidate_ready',
        sessionId: sessionId
      }));
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const endInterview = async () => {
    if (confirm('Are you sure you want to end the interview?')) {
      // Stop auto-save
      if (autoSaveCleanupRef.current) {
        autoSaveCleanupRef.current();
        autoSaveCleanupRef.current = null;
      }

      // Save final transcript
      if (sessionData && messages.length > 0) {
        await saveTranscript({
          invitation_id: sessionData.invitation_id || sessionData.id,
          room_id: sessionData.room_id,
          company_id: sessionData.company_id,
          job_id: sessionData.job_id,
          transcript: messages,
          started_at: interviewStartTime || undefined,
          ended_at: new Date().toISOString(),
          candidate_email: sessionData.candidate_email,
          candidate_name: sessionData.candidate_name
        });
      }

      // Notify backend
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'end_interview',
          sessionId: sessionId
        }));
      }

      // Stop all media tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }

      // Close connections
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (wsRef.current) {
        wsRef.current.close();
      }

      // Redirect to thank you page
      window.location.href = '/interview/complete';
    }
  };

  const addMessage = (speaker: string, text: string) => {
    setMessages(prev => [...prev, { speaker, text, timestamp: new Date() }]);
  };

  const playAudio = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.play();
  };

  const handleInterviewEnd = async (data: any) => {
    // Stop auto-save
    if (autoSaveCleanupRef.current) {
      autoSaveCleanupRef.current();
      autoSaveCleanupRef.current = null;
    }

    // Save final transcript when interview ends from backend
    if (sessionData && messages.length > 0) {
      await saveTranscript({
        invitation_id: sessionData.invitation_id || sessionData.id,
        room_id: sessionData.room_id,
        company_id: sessionData.company_id,
        job_id: sessionData.job_id,
        transcript: messages,
        started_at: interviewStartTime || undefined,
        ended_at: new Date().toISOString(),
        candidate_email: sessionData.candidate_email,
        candidate_name: sessionData.candidate_name
      });
    }

    alert('Interview completed! Thank you for your time.');
    window.location.href = `/interview/complete?session=${sessionId}`;
  };

  if (!sessionData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-xl">Loading interview room...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 px-6 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">AI Interview - {sessionData?.jobTitle}</h1>
            <p className="text-sm text-gray-400">
              {isConnected ? '🟢 Connected' : '🔴 Connecting...'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">AI Agent: Active</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video Section */}
        <div className="flex-1 grid grid-cols-2 gap-4 p-6">
          {/* AI Agent Video/Avatar */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden">
            <video
              ref={agentVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 bg-black/50 px-3 py-1 rounded-full text-sm">
              🤖 AI Interviewer
            </div>
            {isAgentSpeaking && (
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-blue-600 px-4 py-2 rounded-lg">
                  <p className="text-sm">{currentQuestion}</p>
                </div>
              </div>
            )}
          </div>

          {/* Candidate Video */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden">
            <video
              ref={candidateVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 bg-black/50 px-3 py-1 rounded-full text-sm">
              👤 You
            </div>
          </div>
        </div>

        {/* Transcript Sidebar */}
        <div className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-700">
            <h2 className="font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Interview Transcript
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx} className={`${msg.speaker === 'agent' ? 'text-blue-300' : 'text-green-300'}`}>
                <span className="font-semibold">
                  {msg.speaker === 'agent' ? '🤖 AI:' : '👤 You:'}
                </span>
                <p className="text-sm mt-1">{msg.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls Footer */}
      <div className="bg-gray-800 px-6 py-4 border-t border-gray-700">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full ${videoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {videoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </button>

          <button
            onClick={toggleAudio}
            className={`p-4 rounded-full ${audioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {audioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </button>

          <button
            onClick={endInterview}
            className="p-4 rounded-full bg-red-600 hover:bg-red-700"
          >
            <Phone className="h-6 w-6 transform rotate-135" />
          </button>
        </div>
      </div>
    </div>
  );
}
