'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function TestInterviewPage() {
  const [testResults, setTestResults] = useState<any[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [roomName, setRoomName] = useState('test-interview-room')
  const [candidateId, setCandidateId] = useState('test-candidate-123')

  const addResult = (test: string, status: 'success' | 'error' | 'warning', message: string, details?: any) => {
    setTestResults(prev => [...prev, {
      test,
      status,
      message,
      details,
      timestamp: new Date().toISOString()
    }])
  }

  const runAllTests = async () => {
    setIsRunning(true)
    setTestResults([])

    // Test 1: Environment Variables
    addResult('Environment Variables', 'info', 'Checking LiveKit configuration...')
    
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'Not set'
    const hasLivekitConfig = process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET
    
    if (hasLivekitConfig) {
      addResult('Environment Variables', 'success', 'LiveKit environment variables are configured')
    } else {
      addResult('Environment Variables', 'error', 'LiveKit environment variables are missing', {
        LIVEKIT_URL: process.env.LIVEKIT_URL ? 'Set' : 'Missing',
        LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY ? 'Set' : 'Missing',
        LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET ? 'Set' : 'Missing'
      })
    }

    // Test 2: Frontend Token API
    addResult('Frontend Token API', 'info', 'Testing /api/token endpoint...')
    
    try {
      const tokenResp = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room: roomName,
          identity: `candidate-${candidateId}`
        })
      })

      if (tokenResp.ok) {
        const tokenData = await tokenResp.json()
        addResult('Frontend Token API', 'success', 'Token generated successfully', {
          hasUrl: !!tokenData.url,
          hasToken: !!tokenData.token,
          tokenLength: tokenData.token?.length || 0
        })
      } else {
        const errorData = await tokenResp.json().catch(() => ({}))
        addResult('Frontend Token API', 'error', `Token generation failed: ${errorData.error || tokenResp.statusText}`, {
          status: tokenResp.status,
          statusText: tokenResp.statusText
        })
      }
    } catch (error: any) {
      addResult('Frontend Token API', 'error', `Token API request failed: ${error.message}`)
    }

    // Test 3: Frontend Start Interview API
    addResult('Frontend Start Interview API', 'info', 'Testing /api/start-interview endpoint...')
    
    try {
      const startResp = await fetch('/api/start-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName,
          candidateId,
          jobId: 'test-job-123'
        })
      })

      if (startResp.ok) {
        const startData = await startResp.json()
        addResult('Frontend Start Interview API', 'success', 'Interview started successfully', {
          roomName: startData.roomName,
          hasAgentToken: !!startData.agentToken,
          message: startData.message
        })
      } else {
        const errorData = await startResp.json().catch(() => ({}))
        addResult('Frontend Start Interview API', 'error', `Start interview failed: ${errorData.error || startResp.statusText}`, {
          status: startResp.status,
          statusText: startResp.statusText
        })
      }
    } catch (error: any) {
      addResult('Frontend Start Interview API', 'error', `Start interview request failed: ${error.message}`)
    }

    // Test 4: Backend Connection (Python)
    addResult('Backend Connection', 'info', 'Testing connection to Python backend...')
    
    try {
      const backendResp = await fetch('http://localhost:8000/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (backendResp.ok) {
        const backendData = await backendResp.json()
        addResult('Backend Connection', 'success', 'Python backend is running', backendData)
      } else {
        addResult('Backend Connection', 'warning', `Backend responded with status ${backendResp.status}`, {
          status: backendResp.status,
          statusText: backendResp.statusText
        })
      }
    } catch (error: any) {
      addResult('Backend Connection', 'error', `Backend connection failed: ${error.message}`, {
        error: error.message,
        suggestion: 'Make sure your Python backend is running on http://localhost:8000'
      })
    }

    // Test 5: Backend Start Interview
    addResult('Backend Start Interview', 'info', 'Testing backend /start-interview endpoint...')
    
    try {
      const backendStartResp = await fetch('http://localhost:8000/start-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName,
          candidateId,
          jobId: 'test-job-123'
        })
      })

      if (backendStartResp.ok) {
        const backendStartData = await backendStartResp.json()
        addResult('Backend Start Interview', 'success', 'Backend interview started', backendStartData)
      } else {
        const errorData = await backendStartResp.json().catch(() => ({}))
        addResult('Backend Start Interview', 'error', `Backend start interview failed: ${errorData.error || backendStartResp.statusText}`, {
          status: backendStartResp.status,
          statusText: backendStartResp.statusText
        })
      }
    } catch (error: any) {
      addResult('Backend Start Interview', 'error', `Backend start interview request failed: ${error.message}`)
    }

    // Test 6: Agent Status Check
    addResult('Agent Status Check', 'info', 'Checking agent connection status...')
    
    try {
      const statusResp = await fetch(`/api/agent-status?room=${encodeURIComponent(roomName)}&candidateId=${encodeURIComponent(candidateId)}`)
      
      if (statusResp.ok) {
        const statusData = await statusResp.json()
        addResult('Agent Status Check', 'success', `Agent status retrieved`, {
          agentConnected: statusData.agentConnected,
          candidateConnected: statusData.candidateConnected,
          participantCount: statusData.participantCount,
          status: statusData.status
        })
      } else {
        const errorData = await statusResp.json().catch(() => ({}))
        addResult('Agent Status Check', 'error', `Status check failed: ${errorData.error || statusResp.statusText}`)
      }
    } catch (error: any) {
      addResult('Agent Status Check', 'error', `Status check request failed: ${error.message}`)
    }

    setIsRunning(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'info': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🧪 Interview Module Diagnostic Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="roomName">Room Name</Label>
                <Input
                  id="roomName"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="test-interview-room"
                />
              </div>
              <div>
                <Label htmlFor="candidateId">Candidate ID</Label>
                <Input
                  id="candidateId"
                  value={candidateId}
                  onChange={(e) => setCandidateId(e.target.value)}
                  placeholder="test-candidate-123"
                />
              </div>
            </div>

            <Button 
              onClick={runAllTests} 
              disabled={isRunning}
              className="w-full"
            >
              {isRunning ? 'Running Tests...' : 'Run All Tests'}
            </Button>

            {testResults.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold">Test Results:</h3>
                {testResults.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{result.test}</h4>
                      <Badge className={getStatusColor(result.status)}>
                        {result.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{result.message}</p>
                    {result.details && (
                      <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">What This Test Checks:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                <li><strong>Environment Variables:</strong> LiveKit configuration</li>
                <li><strong>Frontend Token API:</strong> Next.js API route for token generation</li>
                <li><strong>Frontend Start Interview API:</strong> Next.js API route for starting interviews</li>
                <li><strong>Backend Connection:</strong> Python backend health check</li>
                <li><strong>Backend Start Interview:</strong> Python backend interview endpoint</li>
                <li><strong>Agent Status Check:</strong> LiveKit room and participant status</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
