'use client'

import { useEffect, useState } from 'react'
import { isSupabaseConfigured } from '@/lib/supabase'

export default function TestConfigPage() {
  const [configStatus, setConfigStatus] = useState<string>('Checking...')
  const [envVars, setEnvVars] = useState<any>({})

  useEffect(() => {
    const checkConfig = () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      setEnvVars({
        url: url ? `${url.substring(0, 30)}...` : 'Not set',
        keyLength: key ? key.length : 0,
        keyStart: key ? key.substring(0, 10) + '...' : 'Not set'
      })
      
      const isConfigured = isSupabaseConfigured()
      setConfigStatus(isConfigured ? '✅ Properly Configured' : '❌ Not Configured')
    }
    
    checkConfig()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-6">Supabase Configuration Test</h1>
        
        <div className="space-y-4">
          <div className="p-4 bg-gray-100 rounded-lg">
            <h2 className="font-semibold mb-2">Configuration Status:</h2>
            <p className={`text-lg ${configStatus.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
              {configStatus}
            </p>
          </div>
          
          <div className="p-4 bg-gray-100 rounded-lg">
            <h2 className="font-semibold mb-2">Environment Variables:</h2>
            <div className="space-y-2 text-sm">
              <p><strong>URL:</strong> {envVars.url}</p>
              <p><strong>Key Length:</strong> {envVars.keyLength} characters</p>
              <p><strong>Key Start:</strong> {envVars.keyStart}</p>
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-lg">
            <h2 className="font-semibold mb-2">Next Steps:</h2>
            <ul className="text-sm space-y-1">
              <li>• Check browser console for detailed logs</li>
              <li>• Verify Supabase project is active</li>
              <li>• Test login functionality</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-6">
          <a 
            href="/auth/login" 
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Go to Login Page
          </a>
        </div>
      </div>
    </div>
  )
}
