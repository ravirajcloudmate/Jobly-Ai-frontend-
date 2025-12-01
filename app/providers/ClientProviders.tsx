'use client'

import React, { Component, ReactNode, useEffect, useState } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { usePathname } from 'next/navigation'

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error: unknown, info: unknown) { console.error('Global error boundary caught:', error, info) }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <div className="mx-auto max-w-xl border rounded-lg p-6 bg-red-50 border-red-200">
            <h2 className="text-lg font-semibold text-red-700 mb-2">Something went wrong</h2>
            <p className="text-sm text-red-800 mb-4">An unexpected error occurred. You can try reloading the module.</p>
            <button
              onClick={() => { this.setState({ hasError: false }); if (typeof window !== 'undefined' && window.location) { window.location.reload() } }}
              className="px-3 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700"
            >Reload</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function TopProgress() {
  const pathname = usePathname()
  const [active, setActive] = useState(false)
  useEffect(() => {
    setActive(true)
    const t = setTimeout(() => setActive(false), 400)
    return () => clearTimeout(t)
  }, [pathname])
  return (
    <div className="fixed top-0 left-0 right-0 h-1 bg-transparent z-50 pointer-events-none">
      <div className={`h-full transition-all duration-500 ease-out ${active ? 'w-full opacity-100' : 'w-0 opacity-0'}`} style={{ background: 'linear-gradient(90deg,#3b82f6,#2563eb,#1d4ed8)', boxShadow: active ? '0 2px 10px rgba(59,130,246,.6),0 0 20px rgba(59,130,246,.3)' : 'none' }} />
    </div>
  )
}

function DynamicFavicon() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    const DEFAULT_ICON = '/favicon.svg'
    const LOGO_STORAGE_KEY = 'branding_company_logo'

    const applyFavicon = (iconUrl?: string | null) => {
      // Remove all existing favicon links first to avoid conflicts
      const existingLinks = document.querySelectorAll<HTMLLinkElement>('link[rel*="icon"]')
      existingLinks.forEach(link => link.remove())

      const href = iconUrl && iconUrl.trim() !== '' ? iconUrl : DEFAULT_ICON
      
      // Determine the type based on file extension
      const getType = (url: string): string => {
        if (url.endsWith('.svg')) return 'image/svg+xml'
        if (url.endsWith('.png')) return 'image/png'
        if (url.endsWith('.jpg') || url.endsWith('.jpeg')) return 'image/jpeg'
        if (url.endsWith('.ico')) return 'image/x-icon'
        // Default to PNG for uploaded images, SVG for default
        return url === DEFAULT_ICON ? 'image/svg+xml' : 'image/png'
      }

      const type = getType(href)
      const sizes = href === DEFAULT_ICON ? 'any' : '32x32'

      // Add cache buster for uploaded images to force browser refresh
      let finalHref = href
      if (href !== DEFAULT_ICON && !href.includes('?')) {
        const timestamp = new Date().getTime()
        finalHref = `${href}?_=${timestamp}`
      }

      // Create main favicon link
      const faviconLink = document.createElement('link')
      faviconLink.rel = 'icon'
      faviconLink.type = type
      faviconLink.href = finalHref
      if (sizes !== 'any') faviconLink.sizes = sizes
      document.head.appendChild(faviconLink)

      // Create shortcut icon link
      const shortcutLink = document.createElement('link')
      shortcutLink.rel = 'shortcut icon'
      shortcutLink.type = type
      shortcutLink.href = finalHref
      document.head.appendChild(shortcutLink)

      // Create apple-touch-icon for better mobile support
      const appleLink = document.createElement('link')
      appleLink.rel = 'apple-touch-icon'
      appleLink.href = finalHref
      document.head.appendChild(appleLink)
    }

    const getStoredLogo = () => {
      try {
        return localStorage.getItem(LOGO_STORAGE_KEY)
      } catch {
        return null
      }
    }

    // Apply favicon on mount
    applyFavicon(getStoredLogo())

    const handleBrandingUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ logoUrl?: string | null }>
      const logoUrl = customEvent.detail?.logoUrl ?? getStoredLogo()
      applyFavicon(logoUrl)
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === LOGO_STORAGE_KEY) {
        applyFavicon(event.newValue)
      }
    }

    window.addEventListener('branding:updated', handleBrandingUpdate as EventListener)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('branding:updated', handleBrandingUpdate as EventListener)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  return null
}

interface ClientProvidersProps {
  children: ReactNode
}

export function ClientProviders({ children }: ClientProvidersProps) {
  useEffect(() => {
    // Global error handler for unhandled promise rejections (e.g., Supabase token refresh failures)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason
      const errorName = error?.name || error?.constructor?.name || ''
      const errorMessage = error?.message || String(error) || ''
      const errorStack = error?.stack || ''
      
      // Check if error is an empty object (common with AuthRetryableFetchError)
      const isEmptyError = error && typeof error === 'object' && Object.keys(error).length === 0

      // Check if this is a Supabase token refresh error
      const isSupabaseTokenError = 
        isEmptyError ||
        errorName === 'AuthRetryableFetchError' ||
        errorName === 'AuthError' ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('refresh') ||
        errorMessage.includes('Network request failed') ||
        errorStack.includes('_refreshAccessToken') ||
        errorStack.includes('_callRefreshToken') ||
        errorStack.includes('_recoverAndRefresh') ||
        errorStack.includes('_handleRequest') ||
        errorStack.includes('_request') ||
        errorStack.includes('handleError') ||
        errorStack.includes('supabase') ||
        errorStack.includes('customFetch')

      if (isSupabaseTokenError) {
        // Suppress Supabase token refresh errors - they're handled gracefully
        console.debug('🔇 Suppressed Supabase token refresh error:', errorName || 'EmptyError', errorMessage || '{}')
        event.preventDefault() // Prevent the error from appearing in console
        return
      }

      // For other errors, log them normally
      console.error('Unhandled promise rejection:', error)
    }

    // Global error handler for runtime errors
    const handleError = (event: ErrorEvent) => {
      const error = event.error
      const errorName = error?.name || error?.constructor?.name || ''
      const errorMessage = error?.message || event.message || ''
      const errorStack = error?.stack || ''
      
      // Check if error is an empty object (common with AuthRetryableFetchError)
      const isEmptyError = error && typeof error === 'object' && Object.keys(error).length === 0

      // Check if this is a Supabase token refresh error
      const isSupabaseTokenError = 
        isEmptyError ||
        errorName === 'AuthRetryableFetchError' ||
        errorName === 'AuthError' ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('refresh') ||
        errorMessage.includes('Network request failed') ||
        errorStack.includes('_refreshAccessToken') ||
        errorStack.includes('_callRefreshToken') ||
        errorStack.includes('_recoverAndRefresh') ||
        errorStack.includes('_handleRequest') ||
        errorStack.includes('_request') ||
        errorStack.includes('handleError') ||
        errorStack.includes('supabase') ||
        errorStack.includes('customFetch')

      if (isSupabaseTokenError) {
        // Suppress Supabase token refresh errors
        console.debug('🔇 Suppressed Supabase token refresh error:', errorName || 'EmptyError', errorMessage || '{}')
        event.preventDefault() // Prevent the error from appearing in console
        return
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [])

  return (
    <AuthProvider>
      <TopProgress />
      <DynamicFavicon />
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </AuthProvider>
  )
}
