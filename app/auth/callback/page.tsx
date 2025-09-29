'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LoginLoader } from '@/app/components/LoginLoader'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const run = async () => {
      try {
        console.log('🔄 OAuth callback processing...')
        
        // If the provider returned an error in the URL
        const oauthError = searchParams.get('error_description') || searchParams.get('error')
        if (oauthError) {
          console.error('❌ OAuth error in URL:', oauthError)
          setError(oauthError)
          return
        }

        // Wait a bit for Supabase to process the OAuth callback
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Check for session
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.error('❌ Error getting session:', error)
          throw error
        }

        console.log('🔍 Session check result:', { hasSession: !!data?.session, user: data?.session?.user?.email })

        // Session should be present after redirect; AuthContext will also catch SIGNED_IN
        if (data?.session) {
          console.log('✅ Session found, redirecting to dashboard')
          // Use window.location for more reliable redirect
          if (typeof window !== 'undefined') {
            window.location.href = '/'
          }
        } else {
          console.log('⏳ No session yet, waiting for auth state change...')
          // Wait longer for the auth state change to trigger
          setTimeout(async () => {
            const { data: next } = await supabase.auth.getSession()
            console.log('🔍 Second session check:', { hasSession: !!next?.session, user: next?.session?.user?.email })
            
            if (isMounted) {
              if (next?.session) {
                console.log('✅ Session found on retry, redirecting')
                if (typeof window !== 'undefined') {
                  window.location.href = '/'
                }
              } else {
                console.error('❌ Still no session after waiting')
                setError('Unable to complete sign-in. Please try again.')
              }
            }
          }, 2000)
        }
      } catch (e: any) {
        console.error('❌ OAuth callback error:', e)
        setError(e?.message || 'Authentication failed.')
      }
    }

    run()
    return () => { isMounted = false }
  }, [router, searchParams])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
        <div className="text-center space-y-3">
          <div className="text-red-600 font-semibold">Google sign-in failed</div>
          <div className="text-gray-700 text-sm">{error}</div>
          <button
            className="mt-2 text-blue-600 hover:text-blue-500 underline"
            onClick={() => router.replace('/auth/login')}
          >
            Back to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <LoginLoader />
    </div>
  )
}