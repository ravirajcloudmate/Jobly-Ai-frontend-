'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, userData?: any) => Promise<{ data: any; error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ data: any; error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  updateProfile: (updates: any) => Promise<{ error: AuthError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.warn('⚠️ Authentication loading timeout, setting loading to false')
      setLoading(false)
    }, 10000) // 10 second timeout

    // Get initial session
    const getInitialSession = async () => {
      try {
        // Check if Supabase is properly configured
        if (!isSupabaseConfigured()) {
          console.warn('Supabase environment variables not configured. Using demo mode.')
          setLoading(false)
          setUser(null)
          setSession(null)
          return
        }

        console.log('✅ Supabase configured, getting session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Error getting session:', error)
          setLoading(false)
          setUser(null)
          setSession(null)
          return
        }
        
        console.log('✅ Initial session loaded:', session?.user?.email || 'No user')
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      } catch (error) {
        console.error('❌ Error in getInitialSession:', error)
        setLoading(false)
        setUser(null)
        setSession(null)
      }
    }

    getInitialSession()

    // Listen for auth changes (only if Supabase is configured)
    let subscription = null
    if (isSupabaseConfigured()) {
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('Auth state changed:', event, session?.user?.email)
          
          setSession(session)
          setUser(session?.user ?? null)
          setLoading(false)

          if (event === 'SIGNED_IN') {
            console.log('🔐 SIGNED_IN event detected, user:', session?.user?.email)
            
            // Set user state immediately
            setUser(session?.user ?? null)
            setSession(session)
            setLoading(false)
            
            // Ensure user profile exists and then redirect
            try {
              console.log('🔄 Starting ensureUserProfile for:', session?.user?.email)
              await ensureUserProfile(session?.user)
              console.log('✅ User profile ensured successfully')
              
              // Wait a bit more to ensure profile is created
              setTimeout(() => {
                console.log('🚀 Redirecting to dashboard after profile creation')
                if (typeof window !== 'undefined') {
                  window.location.href = '/'
                }
              }, 1000)
            } catch (error) {
              console.error('❌ Error ensuring user profile:', error)
              // Still redirect even if profile creation fails
              setTimeout(() => {
                console.log('🚀 Redirecting to dashboard despite profile creation error')
                if (typeof window !== 'undefined') {
                  window.location.href = '/'
                }
              }, 1000)
            }
          } else if (event === 'SIGNED_OUT') {
            console.log('🔐 User signed out, clearing state and redirecting')
            // Clear all state
            setUser(null)
            setSession(null)
            setLoading(false)
            
            // Redirect to login page with a small delay
            setTimeout(() => {
              console.log('✅ Redirecting to login page after sign out')
              try {
                router.push('/auth/login')
              } catch (error) {
                console.log('Router redirect failed, using window.location')
                if (typeof window !== 'undefined') {
                  window.location.href = '/auth/login'
                }
              }
            }, 100)
          }
        }
      )
      subscription = sub
    }

    return () => {
      clearTimeout(loadingTimeout)
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [router])

  // Ensure user profile exists in our database
  const ensureUserProfile = async (user: User | null | undefined) => {
    if (!user) {
      console.log('❌ No user provided to ensureUserProfile')
      return
    }

    console.log('🔍 Ensuring user profile for:', user.email, 'ID:', user.id)
    console.log('🔍 User metadata:', user.user_metadata)

    try {
      // Check if profile exists
      console.log('🔍 Checking if user profile exists...')
      const { data: existingProfile, error: fetchError } = await supabase
        .from('users')
        .select('id, email, full_name, company_id, role')
        .eq('id', user.id)
        .single()

      console.log('🔍 Profile check result:', { existingProfile, fetchError })

      if (fetchError && fetchError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        console.log('📝 Creating new user profile for:', user.email)
        
        const userData = {
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name || 
                    user.user_metadata?.name || 
                    user.email?.split('@')[0] || 
                    'User',
          company_id: user.user_metadata?.company_id || null,
          role: 'admin' as const, // First user in company is admin
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null
        }

        console.log('📝 Inserting user data:', userData)

        const { data: insertData, error: insertError } = await supabase
          .from('users')
          .insert(userData)
          .select()

        console.log('📝 Insert result:', { insertData, insertError })

        if (insertError) {
          console.error('❌ Error creating user profile:', {
            message: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint
          })
          throw insertError
        } else {
          console.log('✅ User profile created successfully for:', user.email)
          console.log('✅ Created profile data:', insertData)
        }
      } else if (fetchError) {
        // Some other error occurred
        console.error('❌ Error checking user profile:', {
          message: fetchError.message,
          code: fetchError.code,
          details: fetchError.details,
          hint: fetchError.hint
        })
        throw fetchError
      } else if (existingProfile) {
        console.log('✅ User profile already exists for:', user.email)
        console.log('✅ Existing profile:', existingProfile)
        
        // Update profile with latest metadata if needed
        const updates: any = {}
        if (user.user_metadata?.full_name && existingProfile.full_name !== user.user_metadata.full_name) {
          updates.full_name = user.user_metadata.full_name
        }
        if (user.user_metadata?.avatar_url && !existingProfile.avatar_url) {
          updates.avatar_url = user.user_metadata.avatar_url
        }
        
        if (Object.keys(updates).length > 0) {
          console.log('🔄 Updating user profile with:', updates)
          const { error: updateError } = await supabase
            .from('users')
            .update(updates)
            .eq('id', user.id)
          
          if (updateError) {
            console.error('❌ Error updating user profile:', updateError)
          } else {
            console.log('✅ User profile updated successfully')
          }
        }
      }
    } catch (error) {
      console.error('❌ Error ensuring user profile:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      })
      throw error
    }
  }

  const signUp = async (email: string, password: string, userData?: any) => {
    try {
      setLoading(true)
      
      // Skip configuration check since user confirmed it's working
      console.log('✅ Attempting sign up with Supabase (bypassing config check)...')
      
      // Optional: Still log the config status for debugging
      const configStatus = isSupabaseConfigured()
      console.log('🔍 Config status (for debugging):', configStatus)
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userData?.fullName || '',
            company_name: userData?.companyName || '',
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      // Note: Company and user profile creation will be handled by the database trigger
      // or manually after email verification

      return { data, error }
    } catch (error) {
      return { data: null, error: error as AuthError }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      
      // Skip configuration check since user confirmed it's working
      console.log('✅ Attempting sign in with Supabase (bypassing config check)...')
      
      // Optional: Still log the config status for debugging
      const configStatus = isSupabaseConfigured()
      console.log('🔍 Config status (for debugging):', configStatus)
      
      console.log('✅ Attempting sign in with Supabase...')
      
      console.log('🔍 Attempting sign in with credentials:', { email, passwordLength: password.length });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      console.log('🔍 Sign in response:', { data: !!data, error: error?.message });

      if (data?.user && !error) {
        console.log('✅ Login successful, setting user state');
        setUser(data.user)
        setSession(data.session)
        // Don't set loading to false here - let the auth state change handler manage it
      } else {
        setLoading(false)
      }

      return { data, error }
    } catch (error) {
      console.log('❌ Login error:', error);
      setLoading(false)
      return { data: null, error: error as AuthError }
    }
  }

  const signOut = async () => {
    try {
      console.log('🔐 Signing out user...')
      setLoading(true)
      
      const { error } = await supabase.auth.signOut()
      
      if (!error) {
        console.log('✅ Sign out successful, clearing local state')
        // Clear local state immediately
        setUser(null)
        setSession(null)
        setLoading(false)

        // Redirect immediately without waiting for auth listener
        try {
          router.replace('/auth/login')
        } catch (e) {
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login'
          }
        }
      } else {
        console.log('❌ Sign out error:', error)
        setLoading(false)
      }
      
      return { error }
    } catch (error) {
      console.log('❌ Sign out exception:', error)
      setLoading(false)
      // Best-effort redirect even on exception
      try {
        router.replace('/auth/login')
      } catch (e) {
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login'
        }
      }
      return { error: error as AuthError }
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })
      return { error }
    } catch (error) {
      return { error: error as AuthError }
    }
  }

  const updateProfile = async (updates: any) => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: updates
      })
      return { error }
    } catch (error) {
      return { error: error as AuthError }
    }
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
