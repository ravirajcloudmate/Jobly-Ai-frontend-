'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  Loader2, 
  Mail, 
  Lock, 
  User, 
  Building, 
  Eye, 
  EyeOff, 
  Sparkles,
  Users,
  Brain,
  Shield,
  Github
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LoginLoader } from '@/app/components/LoginLoader'

export default function SignupPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  
  const { signUp, resendEmailVerification, user, loading: authLoading } = useAuth()
  const router = useRouter()

  // If already authenticated, redirect away from signup
  useEffect(() => {
    if (!authLoading && user) {
      try { router.replace('/') } catch {}
      if (typeof window !== 'undefined') {
        window.location.assign('/')
      }
    }
  }, [authLoading, user, router])

  // Show login loader when user is authenticated and being redirected
  if (!authLoading && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <LoginLoader />
      </div>
    )
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    const { data, error } = await signUp(formData.email, formData.password, {
      fullName: formData.fullName,
      companyName: formData.companyName
    })
    
    if (error) {
      setError(error.message)
      setEmailSent(false)
      setLoading(false)
      return
    }

    // Supabase handles email verification automatically
    if (data?.user) {
      if (!data.user.email_confirmed_at) {
        // Email confirmation required - Supabase will send email automatically
        setEmailSent(true)
        setUserEmail(formData.email)
        setSuccess(`Account created successfully! A verification email has been sent to ${formData.email} by Supabase. Please check your inbox and spam folder.`)
        console.log('✅ Account created. Supabase will handle email verification.')
        console.log('📧 User data:', {
          id: data.user.id,
          email: data.user.email,
          confirmation_sent_at: data.user.confirmation_sent_at,
          email_confirmed_at: data.user.email_confirmed_at
        })
        console.log('💡 If email not received:')
        console.log('   1. Check spam/junk folder (most common issue)')
        console.log('   2. Wait 1-2 minutes (email delivery delay)')
        console.log('   3. Verify Supabase Dashboard > Authentication > Settings > Enable email confirmations = ON')
        console.log('   4. Check Supabase Dashboard > Project Settings > Auth > SMTP Settings (configure SMTP for production)')
        console.log('   5. Free tier limit: max 3 emails/hour - check if limit reached')
        console.log('   6. Check Supabase Dashboard > Logs > Auth Logs for email errors')
        
        // Run diagnostic check
        try {
          const diagnosticResponse = await fetch('/api/test-email-sending', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              email: formData.email,
              userId: data.user.id 
            })
          })
          const diagnostic = await diagnosticResponse.json()
          console.log('🔍 Email diagnostic result:', diagnostic)
          
          if (diagnostic.issue) {
            console.error('❌ Email Issue Detected:', diagnostic.issue)
            console.log('💡 Solution:', diagnostic.solution)
            console.log('📋 Detailed Error:', diagnostic.detailedError)
            
            // Show user-friendly error if diagnostic found issue
            if (diagnostic.issue.includes('Rate limit')) {
              setError('Email sending limit reached. Please wait 1 hour and use "Resend Email" button.')
            } else if (diagnostic.issue.includes('SMTP') || diagnostic.issue.includes('configuration')) {
              setError('Email configuration issue. Please configure SMTP in Supabase Dashboard.')
            } else if (diagnostic.issue.includes('already exists')) {
              // Don't show error, user already exists is normal
              console.log('ℹ️ User already exists - this is normal for resend')
            } else {
              console.warn('⚠️ Email diagnostic found issue:', diagnostic.issue)
            }
          }
        } catch (diagError) {
          console.warn('⚠️ Diagnostic check failed:', diagError)
        }
      } else {
        // Email already confirmed (shouldn't happen on signup, but handle it)
        setSuccess('Account created successfully!')
        setEmailSent(false)
      }
    } else {
      setSuccess('Account created successfully!')
      setEmailSent(false)
    }
    
    setLoading(false)
  }

  const features = [
    {
      icon: <Brain className="h-5 w-5" />,
      text: "AI-Powered Interviews"
    },
    {
      icon: <Users className="h-5 w-5" />,
      text: "Real-time Collaboration"
    },
    {
      icon: <Shield className="h-5 w-5" />,
      text: "Enterprise Security"
    }
  ];

  const handleGoogleAuth = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw error
    } catch (error: any) {
      setError(error.message)
      setLoading(false)
    }
  }

  const handleGithubAuth = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw error
    } catch (error: any) {
      setError(error.message)
      setLoading(false)
    }
  }

  const handleResendEmail = async () => {
    if (!userEmail) return
    
    setResending(true)
    setError('')
    setSuccess('')
    
    try {
      console.log('📧 Resending verification email via Supabase...')
      const { data, error } = await resendEmailVerification(userEmail)
      
      if (error) {
        const errorMsg = error.message || 'Unknown error'
        setError(`Failed to resend email: ${errorMsg}. Check console for troubleshooting tips.`)
        console.error('❌ Error resending email:', error)
        
        // Show helpful message based on error
        if (errorMsg.includes('rate limit') || errorMsg.includes('too many')) {
          setError('Too many emails sent. Please wait a few minutes and try again. (Free tier: max 3 emails/hour)')
        } else if (errorMsg.includes('email')) {
          setError(`Email error: ${errorMsg}. Please check Supabase Dashboard settings.`)
        }
      } else {
        setSuccess('Verification email has been resent by Supabase! Please check your inbox and spam folder.')
        console.log('✅ Verification email resent successfully')
      }
    } catch (emailError: any) {
      console.error('❌ Error resending email:', emailError)
      setError('Failed to resend email: ' + (emailError.message || 'Unknown error'))
    }
    
    setResending(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col lg:flex-row">
      {/* Left Side - Branding & Features */}
      <div className="lg:w-1/2 p-8 lg:p-16 flex flex-col justify-center">
        <div className="max-w-lg">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient id="signupHeadGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1e40af" stopOpacity="1" />
                    <stop offset="50%" stopColor="#3b82f6" stopOpacity="1" />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity="1" />
                  </linearGradient>
                </defs>
                <rect width="24" height="24" fill="#000000"/>
                <path d="M6 6 C6 4, 8 2, 12 2 C16 2, 18 4, 18 6 C18 8, 20 10, 20 14 C20 16, 18 18, 14 20 C12 22, 10 22, 8 20 C6 20, 4 18, 4 14 C4 10, 6 8, 6 6 Z" fill="url(#signupHeadGradient)"/>
                <rect x="7.5" y="5.5" width="6" height="4.5" rx="1" fill="#1e40af"/>
                <path d="M9 7 L9 10 L12 8.5 Z" fill="#000000"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Jobly.Ai</h1>
              <p className="text-sm text-gray-600">Smart Hiring Platform</p>
            </div>
          </div>

          {/* Hero Text */}
          <div className="space-y-4 mb-8">
            <h2 className="text-4xl font-bold text-gray-900 leading-tight">
              Transform Your
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                {" "}Hiring Process
              </span>
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Conduct AI-powered interviews, evaluate candidates in real-time, and make data-driven hiring decisions with our intelligent platform.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3 mb-8">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 text-gray-700">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                  {feature.icon}
                </div>
                <span>{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">10K+</div>
              <div className="text-sm text-gray-600">Interviews</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">500+</div>
              <div className="text-sm text-gray-600">Companies</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">95%</div>
              <div className="text-sm text-gray-600">Accuracy</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="lg:w-1/2 flex items-center justify-center p-8">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-4 pb-6">
            <div className="text-center">
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
              <CardDescription className="text-base mt-2">
                Start your journey with Jobly.Ai
          </CardDescription>
            </div>
        </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className={emailSent ? 'border-blue-500 bg-blue-50' : ''}>
                <AlertDescription className="flex flex-col gap-3">
                  <span>{success}</span>
                  {emailSent && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResendEmail}
                      disabled={resending}
                      className="w-full sm:w-auto self-start"
                    >
                      {resending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4 mr-2" />
                          Resend Verification Email
                        </>
                      )}
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}
            
            {/* Social Authentication */}
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 bg-white hover:bg-gray-50 border-2 font-medium"
                onClick={handleGoogleAuth}
                disabled={loading}
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {loading ? 'Connecting...' : 'Continue with Google'}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full h-11 bg-white hover:bg-gray-50 border-2 font-medium"
                onClick={handleGithubAuth}
                disabled={loading}
              >
                <Github className="w-5 h-5 mr-3" />
                {loading ? 'Connecting...' : 'Continue with GitHub'}
              </Button>
            </div>

            <div className="relative">
              <Separator />
              <div className="absolute inset-0 flex items-center justify-center">
                <Badge variant="secondary" className="bg-white px-3">
                  or
                </Badge>
              </div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Enter your full name"
                    className="pl-10 h-11"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <div className="relative">
                <Input
                  id="companyName"
                  name="companyName"
                  type="text"
                  placeholder="Enter your company name"
                    className="pl-10 h-11"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Building className="h-4 w-4 text-gray-400" />
                  </div>
              </div>
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                    className="pl-10 h-11"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Mail className="h-4 w-4 text-gray-400" />
                  </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                    className="pl-10 pr-10 h-11"
                  value={formData.password}
                  onChange={handleChange}
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
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                    className="pl-10 pr-10 h-11"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  disabled={loading}
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
                    Creating Account...
                  </div>
                ) : (
                  'Create Account'
                )}
            </Button>
          </form>
          
            {/* Toggle Sign Up/Sign In */}
            <div className="text-center text-sm">
              <span className="text-gray-600">
                Already have an account?
              </span>
              <Link 
                href="/auth/login" 
                className="ml-1 text-blue-600 hover:text-blue-500 font-medium"
              >
                Sign In
              </Link>
            </div>

            {/* Terms */}
            <p className="text-xs text-gray-500 text-center leading-relaxed">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-blue-600 hover:text-blue-500">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-blue-600 hover:text-blue-500">Privacy Policy</Link>
            </p>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
