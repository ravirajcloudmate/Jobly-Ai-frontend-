import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Check if Supabase is configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://demo.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'demo-key'
  
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Only protect app routes; allow /auth/* and / to pass without redirects to avoid loops
  const protectedRoutes = ['/jobs', '/candidates', '/interviews', '/reports', '/analytics', '/settings']
  const isProtectedRoute = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (isProtectedRoute) {
    // Only check authentication if Supabase is properly configured
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const isConfigured = url && url.includes('supabase.co') && !url.includes('demo') &&
                        key && key.length > 50 && key.includes('eyJ')
    
    if (isConfigured) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // If not yet recognized server-side but auth cookies exist, allow this request (avoid early redirect loop)
      const hasSupabaseCookie = Boolean(
        request.cookies.get('sb-access-token')?.value ||
        request.cookies.get('sb-refresh-token')?.value ||
        request.cookies.get('supabase-auth-token')?.value
      )

      if (!user && !hasSupabaseCookie) {
        return NextResponse.redirect(new URL('/auth/login', request.url))
      }
    } else {
      // If Supabase is not configured, redirect to login for protected routes
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/jobs/:path*',
    '/candidates/:path*',
    '/interviews/:path*',
    '/reports/:path*',
    '/analytics/:path*',
    '/settings/:path*',
  ],
}
