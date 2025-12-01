'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Loader2, 
  Lock, 
  Eye, 
  EyeOff,
  CheckCircle2,
  Shield,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [validating, setValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()

  // Validate the reset token on mount
  useEffect(() => {
    const validateToken = async () => {
      try {
        // Supabase sends password reset links with hash fragments
        // Format: #access_token=...&type=recovery&...
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const type = hashParams.get('type')
        
        // Also check URL search params (some flows use query params)
        const urlType = searchParams.get('type')
        const urlCode = searchParams.get('code')
        
        console.log('🔍 Reset password params:', { 
          hasHash: !!window.location.hash, 
          type, 
          urlType, 
          hasAccessToken: !!accessToken,
          urlCode 
        })

        // If we have hash fragments with access_token, Supabase will handle it automatically
        if (type === 'recovery' && accessToken) {
          console.log('✅ Valid recovery token found in hash')
          setTokenValid(true)
          setValidating(false)
          return
        }

        // If we have a code in URL params, verify it
        if (urlCode && (urlType === 'recovery' || !urlType)) {
          console.log('🔍 Verifying recovery code...')
          try {
            const { data, error: verifyError } = await supabase.auth.verifyOtp({
              token: urlCode,
              type: 'recovery'
            })

            if (verifyError) {
              console.error('❌ Code verification error:', verifyError)
              setError('Invalid or expired reset link. Please request a new password reset.')
              setTokenValid(false)
              setValidating(false)
              return
            }

            if (data?.user) {
              console.log('✅ Recovery code verified')
              setTokenValid(true)
              setValidating(false)
              return
            }
          } catch (verifyErr) {
            console.error('❌ Verification error:', verifyErr)
            setError('Error verifying reset link. Please try again.')
            setTokenValid(false)
            setValidating(false)
            return
          }
        }

        // Try to get session to see if user is already authenticated (from hash processing)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (session && !sessionError) {
          console.log('✅ Valid session found')
          setTokenValid(true)
          setValidating(false)
          return
        }

        // If we have hash fragments, wait a bit for Supabase to process them
        if (window.location.hash) {
          console.log('⏳ Waiting for Supabase to process hash fragments...')
          await new Promise(resolve => setTimeout(resolve, 1500))
          
          const { data: { session: retrySession } } = await supabase.auth.getSession()
          if (retrySession) {
            console.log('✅ Session found after processing hash')
            setTokenValid(true)
            setValidating(false)
            return
          }
        }

        // No valid token found
        console.error('❌ No valid reset token found')
        setError('Invalid or expired reset link. Please request a new password reset.')
        setTokenValid(false)
        setValidating(false)
      } catch (err) {
        console.error('❌ Token validation error:', err)
        setError('Error validating reset link. Please try again.')
        setTokenValid(false)
        setValidating(false)
      }
    }

    validateToken()
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    // Validation
    if (!password) {
      setError('Please enter a new password')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      // Update password using Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        setError(updateError.message || 'Failed to reset password. Please try again.')
        setSuccess(false)
      } else {
        setSuccess(true)
        setError('')
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/auth/login')
        }, 3000)
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.')
      setSuccess(false)
    }

    setLoading(false)
  }

  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-8">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">Validating reset link...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-8">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-4 pb-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold">Invalid Reset Link</CardTitle>
              <CardDescription className="text-base mt-2">
                This password reset link is invalid or has expired
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert variant="destructive">
              <AlertDescription>{error || 'The reset link is invalid or has expired. Please request a new password reset.'}</AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Link href="/auth/forgot-password" className="block">
                <Button
                  type="button"
                  className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Request New Reset Link
                </Button>
              </Link>

              <Link href="/auth/login" className="block">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full h-11"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-8">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-4 pb-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Reset Your Password</CardTitle>
            <CardDescription className="text-base mt-2">
              {success 
                ? 'Password reset successful! Redirecting to login...' 
                : 'Enter your new password below'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success ? (
            <div className="space-y-4">
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600 mr-2" />
                <AlertDescription className="text-green-800">
                  <div className="font-semibold mb-2">Password reset successful!</div>
                  <div className="text-sm">
                    Your password has been updated. You will be redirected to the login page shortly.
                  </div>
                </AlertDescription>
              </Alert>

              <Link href="/auth/login" className="block">
                <Button
                  type="button"
                  className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Go to Login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your new password"
                    className="pl-10 pr-10 h-11"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                    autoFocus
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Must be at least 6 characters long
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your new password"
                    className="pl-10 pr-10 h-11"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" 
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Resetting Password...
                  </div>
                ) : (
                  'Reset Password'
                )}
              </Button>

              <div className="text-center">
                <Link 
                  href="/auth/login" 
                  className="text-sm text-blue-600 hover:text-blue-500 inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back to Login
                </Link>
              </div>
            </form>
          )}

          <div className="text-center text-sm pt-4 border-t">
            <span className="text-gray-600">
              Remember your password?{' '}
            </span>
            <Link 
              href="/auth/login" 
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

