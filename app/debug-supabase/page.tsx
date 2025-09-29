'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DebugSupabasePage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    const gatherDebugInfo = () => {
      const info = {
        environment: {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL,
          keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length,
          keyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...',
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        },
        client: {
          url: supabase.supabaseUrl,
          keyLength: supabase.supabaseKey?.length,
          keyPrefix: supabase.supabaseKey?.substring(0, 20) + '...',
          isInitialized: !!supabase
        },
        network: {
          online: navigator.onLine,
          userAgent: navigator.userAgent
        },
        timestamp: new Date().toISOString()
      };
      
      setDebugInfo(info);
      console.log('🔍 Debug Info:', info);
    };

    gatherDebugInfo();
  }, []);

  const testDirectConnection = async () => {
    try {
      console.log('🔍 Testing direct connection to Supabase...');
      
      // Test direct fetch to Supabase
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('🔍 Direct connection test:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
      if (response.ok) {
        alert('✅ Direct connection to Supabase successful!');
      } else {
        alert(`❌ Direct connection failed: ${response.status} ${response.statusText}`);
      }
    } catch (error: any) {
      console.error('🔍 Direct connection error:', error);
      alert(`❌ Direct connection error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Supabase Debug Information</h1>
        
        {debugInfo && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Environment Variables</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
                  {JSON.stringify(debugInfo.environment, null, 2)}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Supabase Client</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
                  {JSON.stringify(debugInfo.client, null, 2)}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Network Information</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
                  {JSON.stringify(debugInfo.network, null, 2)}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Connection Tests</CardTitle>
              </CardHeader>
              <CardContent>
                <button
                  onClick={testDirectConnection}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Test Direct Connection to Supabase
                </button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
