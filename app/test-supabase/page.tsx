'use client'

import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function TestSupabasePage() {
  const [connectionStatus, setConnectionStatus] = useState<string>('Testing...')
  const [user, setUser] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    testSupabaseConnection()
  }, [])

  const testSupabaseConnection = async () => {
    try {
      setConnectionStatus('Testing connection...')
      setError(null)

      // Test 1: Check configuration
      const isConfigured = isSupabaseConfigured()
      console.log('Supabase configured:', isConfigured)

      if (!isConfigured) {
        setConnectionStatus('Configuration Error')
        setError('Supabase is not properly configured')
        return
      }

      // Test 2: Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        setConnectionStatus('Session Error')
        setError(`Session error: ${sessionError.message}`)
        return
      }

      setSession(session)
      setUser(session?.user || null)

      if (session) {
        setConnectionStatus('Connected with Session')
      } else {
        setConnectionStatus('Connected (No Session)')
      }

    } catch (err: any) {
      setConnectionStatus('Connection Failed')
      setError(err.message)
      console.error('Supabase connection test failed:', err)
    }
  }

  const testLogin = async () => {
    try {
      setError(null)
      // Test with demo credentials (this will fail but should show connection works)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'testpassword'
      })
      
      if (error) {
        setError(`Login test error: ${error.message}`)
      } else {
        setError('Login test successful (unexpected)')
      }
    } catch (err: any) {
      setError(`Login test failed: ${err.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔧 Supabase Connection Test
              <Badge variant={connectionStatus.includes('Connected') ? "default" : "destructive"}>
                {connectionStatus}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Configuration</h3>
                <Badge variant={isSupabaseConfigured() ? "default" : "destructive"}>
                  {isSupabaseConfigured() ? "Configured" : "Not Configured"}
                </Badge>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Current User</h3>
                <Badge variant={user ? "default" : "secondary"}>
                  {user ? user.email : "No User"}
                </Badge>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-semibold text-red-900 mb-2">Error:</h4>
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-2">Session Data</h3>
              <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
                {JSON.stringify(session, null, 2)}
              </pre>
            </div>

            <div className="flex gap-4">
              <Button onClick={testSupabaseConnection}>
                Test Connection
              </Button>
              <Button onClick={testLogin} variant="outline">
                Test Login
              </Button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Environment Variables:</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <div>NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</div>
                <div>NEXT_PUBLIC_SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}