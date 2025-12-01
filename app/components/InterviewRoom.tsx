'use client';

import { useEffect, useState, useRef } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useDataChannel,
  useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import './interview.css';

interface InterviewRoomProps {
  candidateId: string;
  jobId: string;
}

export default function InterviewRoom({ candidateId, jobId }: InterviewRoomProps) {
  const [token, setToken] = useState('');
  const [roomName, setRoomName] = useState('');
  const [liveKitUrl, setLiveKitUrl] = useState('');
  const [connected, setConnected] = useState(false);
  const [agentConnected, setAgentConnected] = useState(false);
  const [agentStatus, setAgentStatus] = useState('waiting');
  const [error, setError] = useState('');
  const [mediaDevices, setMediaDevices] = useState<MediaDeviceInfo[]>([]);
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const roomKeyRef = useRef<string>('');

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

  // Start interview and get token
  useEffect(() => {
    if (micPermission === 'granted') {
      startInterview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micPermission]);

  // Poll for agent status
  useEffect(() => {
    if (!roomName) return;

    const checkAgentStatus = async () => {
      try {
        const response = await fetch(`http://localhost:8000/agent-status/${roomName}`);
        const data = await response.json();
        
        console.log('🔍 Agent status check:', data);
        
        if (data.agentConnected) {
          console.log('✅ Agent joined! Starting interview...');
          setAgentConnected(true);
          setAgentStatus('connected');
          // Stop polling once agent is connected
        } else {
          console.log('⏳ Waiting for agent to join... participantCount:', data.participantCount);
          setAgentStatus('connecting');
        }
      } catch (error) {
        console.error('❌ Error checking agent status:', error);
        setAgentStatus('error_checking');
      }
    };

    // Check immediately
    checkAgentStatus();

    // Poll every 2 seconds until agent connects
    const interval = setInterval(() => {
      if (!agentConnected) {
        checkAgentStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [roomName, agentConnected]);

  const startInterview = async () => {
    try {
      setAgentStatus('initializing');
      const response = await fetch('/api/start-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: `interview-${candidateId}-${Date.now()}`,
          candidateId,
          jobId,
          candidateName: 'John Doe', // Replace with actual name
          roleType: 'general' // or 'technical'
        }),
      });

      const data = await response.json();
      console.log('Start interview response:', data);
      
      if (data.success || data.status === 'success') {
        setToken(data.token);
        setRoomName(data.roomName);
        setLiveKitUrl(data.url);
        setAgentStatus('waiting_for_agent');
        
        // Generate stable key for the room
        roomKeyRef.current = `room-${data.roomName || candidateId}-${Date.now()}`;
        
        // Check if agent is already connected
        if (data.agentConnected) {
          setAgentConnected(true);
          setAgentStatus('connected');
        }
      } else {
        setError('Failed to start interview');
        console.error('Failed to start interview:', data);
      }
    } catch (error: any) {
      const message = error?.message || 'Error connecting to server';
      setError(message);
      console.error('Error starting interview:', error);
    }
  };

  if (error) {
    return (
      <div className="error-container">
        <h2>❌ Error</h2>
        <p>{error}</p>
        {micPermission === 'denied' && (
          <div className="permission-guide">
            <p><strong>How to enable microphone:</strong></p>
            <ol>
              <li>Click the 🔒 lock icon in your browser address bar</li>
              <li>Allow microphone permission</li>
              <li>Refresh this page</li>
            </ol>
          </div>
        )}
        <button onClick={() => window.location.reload()}>Retry</button>
        <button onClick={checkMediaDevices} style={{ marginLeft: '10px' }}>
          Check Devices Again
        </button>
      </div>
    );
  }

  if (!token || !liveKitUrl) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>
          {micPermission === 'prompt' 
            ? 'Requesting microphone permission...' 
            : 'Initializing interview room...'}
        </p>
        {mediaDevices.length > 0 && (
          <div className="device-info">
            <p>✅ Found {mediaDevices.filter(d => d.kind === 'audioinput').length} microphone(s)</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <LiveKitRoom
      key={roomKeyRef.current || `room-${candidateId}`}
      token={token}
      serverUrl={liveKitUrl}
      connect={true}
      audio={true}
      video={false}
      onConnected={() => {
        console.log('Connected to interview room');
        setConnected(true);
      }}
      onDisconnected={(reason) => {
        console.log('Disconnected from interview:', reason);
        // Delay state updates to allow cleanup
        setTimeout(() => {
          setConnected(false);
        }, 100);
      }}
    >
      <InterviewInterface 
        candidateId={candidateId} 
        connected={connected}
        agentConnected={agentConnected}
        agentStatus={agentStatus}
        mediaDevices={mediaDevices}
      />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

// Interview Interface Component
function InterviewInterface({ 
  candidateId, 
  connected, 
  agentConnected,
  agentStatus,
  mediaDevices
}: { 
  candidateId: string; 
  connected: boolean;
  agentConnected: boolean;
  agentStatus: string;
  mediaDevices: MediaDeviceInfo[];
}) {
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [progress, setProgress] = useState(0);
  const [interviewStatus, setInterviewStatus] = useState('waiting');

  // Listen for agent messages
  const { message } = useDataChannel();

  useEffect(() => {
    if (message) {
      try {
        const payload = message.payload;
        const data = JSON.parse(new TextDecoder().decode(payload));
        console.log('Received agent message:', data);

        switch (data.type) {
          case 'question':
            setCurrentQuestion(data.question);
            setProgress(data.progress);
            setInterviewStatus('asking');
            break;
          
          case 'response_received':
            setInterviewStatus('processing');
            break;
          
          case 'interview_completed':
            setInterviewStatus('completed');
            console.log('Interview responses:', data.responses);
            break;
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    }
  }, [message]);

  // Get audio tracks
  const audioTracks = useTracks([Track.Source.Microphone]);

  return (
    <div className="interview-container">
      <h2>AI Interview - {connected ? '🟢 Connected' : '🔴 Disconnected'}</h2>
      
      {/* Agent Connection Status */}
      <div className={`agent-status ${agentConnected ? 'agent-connected' : 'agent-waiting'}`}>
        {!agentConnected ? (
          <>
            <div className="loading-spinner"></div>
            <p>⏳ AI Agent is joining the room... Please wait</p>
            <p className="status-detail">Status: {agentStatus}</p>
          </>
        ) : (
          <p>✅ AI Agent Connected - Interview Ready!</p>
        )}
      </div>

      {/* Show interview content only when agent is connected */}
      {agentConnected ? (
        <>
          {/* Progress Bar */}
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <p>Progress: {Math.round(progress)}%</p>

          {/* Current Question */}
          {currentQuestion && (
            <div className="question-box">
              <h3>Current Question:</h3>
              <p>{currentQuestion}</p>
            </div>
          )}

          {/* Status */}
          <div className="status">
            <p>Status: {interviewStatus}</p>
            <p>Audio tracks: {audioTracks.length}</p>
          </div>

          {/* Instructions */}
          <div className="instructions">
            {interviewStatus === 'asking' && (
              <p>🎤 Please answer the question. The agent is listening...</p>
            )}
            {interviewStatus === 'processing' && (
              <p>⏳ Processing your response...</p>
            )}
            {interviewStatus === 'completed' && (
              <p>✅ Interview completed! Thank you.</p>
            )}
          </div>
        </>
      ) : (
        <div className="waiting-message">
          <p>📋 Please ensure your microphone is enabled</p>
          <p>🔊 The AI interviewer will start speaking once connected</p>
          
          {/* Media Devices Info */}
          <div className="device-status">
            <h4>🎙️ Audio Devices:</h4>
            {mediaDevices.filter((d: MediaDeviceInfo) => d.kind === 'audioinput').map((device: MediaDeviceInfo, index: number) => (
              <div key={device.deviceId} className="device-item">
                {index + 1}. {device.label || `Microphone ${index + 1}`}
              </div>
            ))}
            {mediaDevices.filter((d: MediaDeviceInfo) => d.kind === 'audioinput').length === 0 && (
              <p className="no-devices">⚠️ No microphone detected</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

