'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function DebugAuthPage() {
  const { user, session, loading } = useAuth()
  const [authState, setAuthState] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    // Get current auth state
    setAuthState({
      user: user ? {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      } : null,
      session: session ? {
        access_token: session.access_token ? 'Present' : 'Missing',
        refresh_token: session.refresh_token ? 'Present' : 'Missing',
        expires_at: session.expires_at
      } : null,
      loading,
      timestamp: new Date().toISOString()
    })
  }, [user, session, loading])

  const handleGoToDashboard = () => {
    router.push('/')
  }

  const handleGoToLogin = () => {
    router.push('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔍 Authentication Debug
              <Badge variant={user ? "default" : "destructive"}>
                {user ? "Authenticated" : "Not Authenticated"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Loading State</h3>
                <Badge variant={loading ? "secondary" : "outline"}>
                  {loading ? "Loading..." : "Not Loading"}
                </Badge>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">User Status</h3>
                <Badge variant={user ? "default" : "destructive"}>
                  {user ? `Logged in as ${user.email}` : "No User"}
                </Badge>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Raw Auth State</h3>
              <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
                {JSON.stringify(authState, null, 2)}
              </pre>
            </div>

            <div className="flex gap-4">
              <Button onClick={handleGoToDashboard} disabled={!user}>
                Go to Dashboard
              </Button>
              <Button onClick={handleGoToLogin} variant="outline">
                Go to Login
              </Button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Troubleshooting Steps:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>Check if user is authenticated (should show "Authenticated" badge)</li>
                <li>If not authenticated, go to login page</li>
                <li>If authenticated but can't access dashboard, check console for errors</li>
                <li>Verify Supabase connection is working</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
