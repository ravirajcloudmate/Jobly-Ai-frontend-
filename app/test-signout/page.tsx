'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LogOut, User, CheckCircle, XCircle } from 'lucide-react'

export default function TestSignOutPage() {
  const { user, loading, signOut } = useAuth()

  const handleTestSignOut = async () => {
    console.log('🧪 Testing sign out functionality...')
    try {
      const { error } = await signOut()
      if (error) {
        console.error('❌ Sign out test failed:', error)
        alert('Sign out test failed: ' + error.message)
      } else {
        console.log('✅ Sign out test successful')
      }
    } catch (error) {
      console.error('❌ Sign out test exception:', error)
      alert('Sign out test failed with exception')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="h-6 w-6 text-red-600" />
              Sign Out Functionality Test
            </CardTitle>
            <CardDescription>
              Test the sign out functionality to ensure it works correctly and redirects to login page.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Current Auth Status */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Current Authentication Status</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  ) : user ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm font-medium">
                    {loading ? 'Loading...' : user ? 'Authenticated' : 'Not Authenticated'}
                  </span>
                </div>
                
                {user && (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <User className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium truncate">{user.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Test Instructions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Test Instructions</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>1. <strong>Current Status:</strong> {user ? 'You are currently logged in' : 'You are not logged in'}</p>
                <p>2. <strong>Expected Behavior:</strong> When you click "Test Sign Out", you should be redirected to the login page</p>
                <p>3. <strong>Check Console:</strong> Open browser console to see detailed logs of the sign out process</p>
                <p>4. <strong>Verify Redirect:</strong> After sign out, you should land on the login page</p>
              </div>
            </div>

            {/* Test Button */}
            <div className="pt-4">
              <Button 
                onClick={handleTestSignOut}
                disabled={!user || loading}
                className="w-full gap-2 bg-red-600 hover:bg-red-700"
              >
                <LogOut className="h-4 w-4" />
                {loading ? 'Signing Out...' : 'Test Sign Out'}
              </Button>
              
              {!user && (
                <p className="text-sm text-gray-500 text-center mt-2">
                  You need to be logged in to test sign out functionality
                </p>
              )}
            </div>

            {/* Debug Information */}
            <div className="space-y-2">
              <h4 className="font-medium">Debug Information</h4>
              <div className="text-xs text-gray-500 space-y-1">
                <p>User: {user ? user.email : 'null'}</p>
                <p>Loading: {loading ? 'true' : 'false'}</p>
                <p>Timestamp: {new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
