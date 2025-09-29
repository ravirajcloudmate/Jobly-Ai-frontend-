'use client'

import { ReactNode, useEffect, useState } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { usePathname } from 'next/navigation'

class ErrorBoundary extends (require('react').Component as any) {
  state: { hasError: boolean } = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error: any, info: any) { console.error('Global error boundary caught:', error, info) }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <div className="mx-auto max-w-xl border rounded-lg p-6 bg-red-50 border-red-200">
            <h2 className="text-lg font-semibold text-red-700 mb-2">Something went wrong</h2>
            <p className="text-sm text-red-800 mb-4">An unexpected error occurred. You can try reloading the module.</p>
            <button
              onClick={() => { this.setState({ hasError: false }); typeof window !== 'undefined' && window.location && window.location.reload() }}
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

interface ClientProvidersProps {
  children: ReactNode
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <AuthProvider>
      <TopProgress />
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </AuthProvider>
  )
}
