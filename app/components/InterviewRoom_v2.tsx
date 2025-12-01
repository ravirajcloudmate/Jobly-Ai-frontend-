'use client';

// Complete Interview Page Component with Modern UI
import { useEffect, useState } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useDataChannel,
  useTracks,
  useRoomContext,
  useConnectionState,
} from '@livekit/components-react';
import { Track, ConnectionState } from 'livekit-client';
import '@livekit/components-styles';

// Backend API URL
const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

interface InterviewRoomProps {
  candidateId: string;
  jobId: string;
  candidateName?: string;
  roleType?: 'general' | 'technical';
}

interface QuestionData {
  type: 'question';
  question_number: number;
  total_questions: number;
  question: string;
  category: string;
  progress: number;
  timestamp: string;
}

interface ResponseData {
  type: 'response_received';
  response: string;
  duration: number;
  timestamp: string;
}

interface CompletionData {
  type: 'interview_completed';
  total_questions: number;
  total_responses: number;
  responses: Array<{
    question_id: number;
    question: string;
    response: string;
    duration: number;
  }>;
  timestamp: string;
}

type AgentMessage = QuestionData | ResponseData | CompletionData;

export default function InterviewRoom({
  candidateId,
  jobId,
  candidateName = 'Candidate',
  roleType = 'general',
}: InterviewRoomProps) {
  const [token, setToken] = useState('');
  const [roomName, setRoomName] = useState('');
  const [liveKitUrl, setLiveKitUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mediaDevices, setMediaDevices] = useState<MediaDeviceInfo[]>([]);
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  // Check media devices
  useEffect(() => {
    checkMediaDevices();
  }, []);

  const checkMediaDevices = async () => {
    try {
      console.log('🎤 Checking media devices...');
      
      // Request microphone permission first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone permission granted');
      setMicPermission('granted');
      
      // Stop the stream
      stream.getTracks().forEach(track => track.stop());
      
      // Get all devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log('📱 Available devices:', devices);
      
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      console.log('🎙️ Audio input devices:', audioInputs);
      
      setMediaDevices(devices);
      
      if (audioInputs.length === 0) {
        console.warn('⚠️ No microphone found!');
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

  // Start interview on component mount
  useEffect(() => {
    if (micPermission === 'granted') {
      startInterview();
    }
    
    // Cleanup on unmount
    return () => {
      endInterview();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micPermission]);

  const startInterview = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_URL}/start-interview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName: `interview-${candidateId}-${Date.now()}`,
          candidateId,
          jobId,
          candidateName,
          roleType,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setToken(data.token);
        setRoomName(data.roomName);
        setLiveKitUrl(data.url);
        console.log('✅ Interview started:', data);
      } else {
        throw new Error(data.message || 'Failed to start interview');
      }
    } catch (err) {
      console.error('❌ Error starting interview:', err);
      setError(err instanceof Error ? err.message : 'Failed to start interview');
    } finally {
      setLoading(false);
    }
  };

  const endInterview = async () => {
    if (!roomName || !candidateId) return;
    
    try {
      await fetch(`${API_URL}/end-interview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName,
          candidateId,
        }),
      });
      console.log('Interview ended');
    } catch (err) {
      console.error('Error ending interview:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-700">
            {micPermission === 'prompt' 
              ? 'Requesting microphone permission...' 
              : 'Preparing your interview...'}
          </p>
          <p className="text-sm text-gray-500 mt-2">Connecting to AI interviewer...</p>
          {mediaDevices.length > 0 && (
            <div className="mt-4 text-sm text-green-600">
              ✅ Found {mediaDevices.filter(d => d.kind === 'audioinput').length} microphone(s)
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">❌ Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          
          {micPermission === 'denied' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
              <p className="text-sm font-semibold text-yellow-800 mb-2">How to enable microphone:</p>
              <ol className="text-xs text-yellow-700 list-decimal list-inside space-y-1">
                <li>Click the 🔒 lock icon in your browser address bar</li>
                <li>Find "Microphone" permission and select "Allow"</li>
                <li>Click the "Check Devices Again" button below</li>
              </ol>
            </div>
          )}
          
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Troubleshooting:</strong>
            </p>
            <ul className="text-xs text-blue-700 mt-2 list-disc list-inside">
              <li>Make sure Python backend is running on port 8000</li>
              <li>Check if agent worker is running: <code>python agent.py dev</code></li>
              <li>Verify LiveKit credentials in .env file</li>
            </ul>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
              Retry
            </button>
            <button
              onClick={checkMediaDevices}
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700"
            >
              Check Devices Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!token || !liveKitUrl) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p>Loading interview session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <LiveKitRoom
        key={`room-v2-${roomName}-${Date.now()}`}
        token={token}
        serverUrl={liveKitUrl}
        connect={true}
        audio={true}
        video={false}
        className="h-screen"
        onConnected={() => {
          console.log('🟢 Connected to interview room');
          console.log('Room:', roomName);
          console.log('Candidate:', candidateId);
        }}
        onDisconnected={(reason) => {
          console.log('🔴 Disconnected from interview:', reason);
          // Delay cleanup to allow LiveKit to finish
          setTimeout(() => {
            // Cleanup handled by useEffect
          }, 100);
        }}
        onError={(error) => {
          console.error('❌ Room error:', error);
        }}
      >
        <InterviewInterface
          candidateId={candidateId}
          candidateName={candidateName}
          roomName={roomName}
          mediaDevices={mediaDevices}
          onEndInterview={endInterview}
        />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}

// Interview Interface Component
function InterviewInterface({
  candidateId,
  candidateName,
  roomName,
  mediaDevices,
  onEndInterview,
}: {
  candidateId: string;
  candidateName: string;
  roomName: string;
  mediaDevices: MediaDeviceInfo[];
  onEndInterview: () => void;
}) {
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'connecting' | 'greeting' | 'asking' | 'listening' | 'processing' | 'completed'>('connecting');
  const [responses, setResponses] = useState<any[]>([]);
  const [agentConnected, setAgentConnected] = useState(false);

  const room = useRoomContext();
  const connectionState = useConnectionState();
  const { message } = useDataChannel();
  const audioTracks = useTracks([Track.Source.Microphone]);

  // Monitor connection state
  useEffect(() => {
    if (connectionState === ConnectionState.Connected) {
      console.log('✅ Room connected');
      setStatus('greeting');
      
      // Check for agent after a short delay
      setTimeout(checkAgentStatus, 2000);
    } else if (connectionState === ConnectionState.Disconnected) {
      setStatus('completed');
    }
  }, [connectionState]);

  // Check agent status
  const checkAgentStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/agent-status/${roomName}`);
      const data = await response.json();
      
      console.log('📊 Agent status:', data);
      setAgentConnected(data.agentConnected || false);
      
      if (!data.agentConnected) {
        // Check again after 3 seconds if agent not connected
        setTimeout(checkAgentStatus, 3000);
      }
    } catch (error) {
      console.error('Error checking agent status:', error);
      // Retry on error
      setTimeout(checkAgentStatus, 3000);
    }
  };

  // Handle agent data messages
  useEffect(() => {
    if (message) {
      try {
        const payload = message.payload;
        const text = new TextDecoder().decode(payload);
        const data: AgentMessage = JSON.parse(text);

        console.log('📨 Agent message:', data);

        switch (data.type) {
          case 'question':
            setCurrentQuestion(data.question);
            setQuestionNumber(data.question_number);
            setTotalQuestions(data.total_questions);
            setProgress(data.progress);
            setStatus('asking');
            setAgentConnected(true);
            
            // After 5 seconds, assume agent finished asking
            setTimeout(() => {
              if (status === 'asking') {
                setStatus('listening');
              }
            }, 5000);
            break;

          case 'response_received':
            setStatus('processing');
            console.log('✅ Agent acknowledged response');
            break;

          case 'interview_completed':
            setStatus('completed');
            setResponses(data.responses);
            console.log('🎯 Interview completed:', data);
            break;
        }
      } catch (error) {
        console.error('❌ Error parsing agent message:', error);
      }
    }
  }, [message, status]);

  // Monitor room participants
  useEffect(() => {
    if (room) {
      const participants = Array.from(room.remoteParticipants.values());
      const hasAgent = participants.some(p => 
        p.identity?.includes('agent') || 
        p.identity?.includes('AW_') ||
        p.identity?.includes('interview-agent')
      );
      
      if (hasAgent && !agentConnected) {
        console.log('🤖 Agent detected in room');
        setAgentConnected(true);
        if (status === 'greeting') {
          setStatus('asking');
        }
      }
    }
  }, [room?.remoteParticipants, agentConnected, status]);

  const handleEndInterview = () => {
    if (window.confirm('Are you sure you want to end the interview?')) {
      onEndInterview();
      room?.disconnect();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Interview</h1>
            <p className="text-sm text-gray-600">Candidate: {candidateName}</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${
              connectionState === ConnectionState.Connected ? 'text-green-600' : 'text-red-600'
            }`}>
              <div className={`w-3 h-3 rounded-full ${
                connectionState === ConnectionState.Connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}></div>
              <span className="text-sm font-medium">
                {connectionState === ConnectionState.Connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            <div className={`flex items-center space-x-2 ${
              agentConnected ? 'text-blue-600' : 'text-yellow-600'
            }`}>
              <div className={`w-3 h-3 rounded-full ${
                agentConnected ? 'bg-blue-500 animate-pulse' : 'bg-yellow-500 animate-bounce'
              }`}></div>
              <span className="text-sm font-medium">
                {agentConnected ? 'AI Ready' : 'AI Joining...'}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {totalQuestions > 0 && (
          <p className="text-sm text-gray-600 text-center mt-2">
            Question {questionNumber} of {totalQuestions}
          </p>
        )}
      </div>

      {/* Current Question */}
      {currentQuestion && (
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-6 mb-6 shadow-md">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Current Question:</h3>
              <p className="text-blue-800 text-base leading-relaxed">{currentQuestion}</p>
            </div>
          </div>
        </div>
      )}

      {/* Status Messages */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-center space-x-3">
          {status === 'connecting' && (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <p className="text-gray-700">Connecting to interview room...</p>
            </>
          )}
          
          {status === 'greeting' && !agentConnected && (
            <>
              <div className="animate-pulse">
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <p className="text-gray-700">Waiting for AI interviewer to join...</p>
            </>
          )}
          
          {status === 'greeting' && agentConnected && (
            <>
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-gray-700">AI interviewer is greeting you...</p>
            </>
          )}
          
          {status === 'asking' && (
            <>
              <svg className="w-5 h-5 text-blue-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
              </svg>
              <p className="text-gray-700">AI is asking a question...</p>
            </>
          )}
          
          {status === 'listening' && (
            <>
              <svg className="w-5 h-5 text-red-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
              <p className="text-gray-700">🎤 Please answer the question. We're listening...</p>
            </>
          )}
          
          {status === 'processing' && (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
              <p className="text-gray-700">Processing your response...</p>
            </>
          )}
          
          {status === 'completed' && (
            <>
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-gray-700">Interview completed! Thank you.</p>
            </>
          )}
        </div>
      </div>

      {/* Audio Indicator */}
      {audioTracks.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                <div className="absolute inset-0 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75"></div>
              </div>
              <span className="text-sm font-medium text-gray-700">Microphone Active</span>
            </div>
            <span className="text-xs text-gray-500">{audioTracks.length} audio track(s)</span>
          </div>
        </div>
      )}

      {/* Interview Completed Summary */}
      {status === 'completed' && responses.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Interview Summary</h3>
          <div className="space-y-4">
            {responses.map((resp, idx) => (
              <div key={idx} className="border-l-4 border-green-500 pl-4 py-2">
                <p className="text-sm font-semibold text-gray-700">Q{resp.question_id}: {resp.question}</p>
                <p className="text-sm text-gray-600 mt-1">{resp.response.substring(0, 150)}...</p>
                <p className="text-xs text-gray-500 mt-1">Duration: {Math.round(resp.duration)}s</p>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <p className="text-lg font-semibold text-green-600">
              ✅ {responses.length} Questions Completed
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        {status !== 'completed' && (
          <button
            onClick={handleEndInterview}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-md"
          >
            End Interview
          </button>
        )}
        
        {status === 'completed' && (
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-md"
          >
            Return to Dashboard
          </button>
        )}
      </div>

      {/* Device Info */}
      {!agentConnected && mediaDevices.length > 0 && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-600 mb-2">🎙️ Audio Devices:</h4>
          {mediaDevices.filter((d: MediaDeviceInfo) => d.kind === 'audioinput').map((device: MediaDeviceInfo, index: number) => (
            <div key={device.deviceId} className="text-sm text-gray-600 py-1">
              {index + 1}. {device.label || `Microphone ${index + 1}`}
            </div>
          ))}
        </div>
      )}

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-6 bg-gray-100 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-gray-600 mb-2">Debug Info</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <p>Room: {roomName}</p>
            <p>Candidate ID: {candidateId}</p>
            <p>Connection: {connectionState}</p>
            <p>Agent Connected: {agentConnected ? 'Yes' : 'No'}</p>
            <p>Status: {status}</p>
            <p>Audio Tracks: {audioTracks.length}</p>
            <p>Question: {questionNumber}/{totalQuestions}</p>
          </div>
        </div>
      )}
    </div>
  );
}

