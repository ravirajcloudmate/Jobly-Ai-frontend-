'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react'
import Link from 'next/link'

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const token = searchParams.get('token')
        const emailParam = searchParams.get('email')
        const type = searchParams.get('type')
        const code = searchParams.get('code')

        setEmail(emailParam)

        console.log('🔍 Verification params:', { token, email: emailParam, type, code })

        // If we have a code from Supabase callback
        if (code) {
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token: code,
            type: 'email'
          })

          if (verifyError) {
            console.error('❌ Verification error:', verifyError)
            setError(verifyError.message)
          } else if (data?.user) {
            console.log('✅ Email verified successfully')
            setVerified(true)
            // Redirect after 2 seconds
            setTimeout(() => {
              router.push('/auth/login?verified=true')
            }, 2000)
          }
        } else if (token && emailParam) {
          // Custom token verification
          // Try to verify using Supabase admin API or direct verification
          const { data: { user }, error: userError } = await supabase.auth.getUser()
          
          if (userError || !user) {
            // User not logged in, need to verify via link
            // For now, redirect to login with message
            setError('Please sign in to verify your email. A verification link has been sent to your email.')
            setTimeout(() => {
              router.push('/auth/login?verify=true')
            }, 3000)
          } else if (user.email === emailParam) {
            // User is logged in and email matches
            // Verify the email
            const { error: updateError } = await supabase.auth.updateUser({
              data: { email_verified: true }
            })

            if (!updateError) {
              setVerified(true)
              setTimeout(() => {
                router.push('/')
              }, 2000)
            } else {
              setError(updateError.message)
            }
          }
        } else {
          setError('Invalid verification link. Please check your email for the correct link.')
        }
      } catch (err: any) {
        console.error('❌ Verification error:', err)
        setError(err?.message || 'Failed to verify email')
      } finally {
        setLoading(false)
      }
    }

    verifyEmail()
  }, [searchParams, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-muted-foreground">Verifying your email...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {verified ? (
              <CheckCircle className="h-16 w-16 text-green-600" />
            ) : error ? (
              <XCircle className="h-16 w-16 text-red-600" />
            ) : (
              <Mail className="h-16 w-16 text-blue-600" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {verified ? 'Email Verified!' : error ? 'Verification Failed' : 'Verify Your Email'}
          </CardTitle>
          <CardDescription>
            {verified 
              ? 'Your email has been successfully verified.' 
              : error 
              ? 'We couldn\'t verify your email address.'
              : 'Please verify your email address to continue.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {verified && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Your email {email && `(${email})`} has been verified successfully! Redirecting to login...
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            {verified ? (
              <Button onClick={() => router.push('/auth/login')} className="w-full">
                Go to Login
              </Button>
            ) : (
              <>
                <Button onClick={() => router.push('/auth/login')} variant="outline" className="w-full">
                  Go to Login
                </Button>
                <Button onClick={() => router.push('/auth/signup')} variant="outline" className="w-full">
                  Create New Account
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

