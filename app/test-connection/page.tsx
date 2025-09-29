'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Loader2, Wifi, WifiOff } from 'lucide-react';

export default function TestConnectionPage() {
  const [status, setStatus] = useState<'testing' | 'connected' | 'error'>('testing');
  const [details, setDetails] = useState<any>(null);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>('online');

  useEffect(() => {
    // Check network status
    setNetworkStatus(navigator.onLine ? 'online' : 'offline');
    
    const testConnection = async () => {
      try {
        console.log('🔍 Testing Supabase connection...');
        
        // Test 1: Check if Supabase client is initialized
        console.log('Supabase client:', supabase);
        
        // Test 2: Try to get session (this makes a network request)
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        console.log('Session test result:', { sessionData, sessionError });
        
        // Test 3: Try a simple query to test database connection
        const { data: queryData, error: queryError } = await supabase
          .from('users')
          .select('count')
          .limit(1);
        console.log('Query test result:', { queryData, queryError });
        
        if (sessionError && sessionError.message.includes('Failed to fetch')) {
          setDetails({
            error: 'Network connection failed',
            sessionError: sessionError.message,
            networkStatus: navigator.onLine,
            url: process.env.NEXT_PUBLIC_SUPABASE_URL
          });
          setStatus('error');
        } else if (sessionError) {
          // Session error is normal if not logged in
          setDetails({
            success: 'Connection successful',
            sessionError: 'No active session (normal)',
            queryError: queryError?.message || 'Query successful',
            networkStatus: navigator.onLine,
            url: process.env.NEXT_PUBLIC_SUPABASE_URL
          });
          setStatus('connected');
        } else {
          setDetails({
            success: 'Connection successful',
            session: sessionData?.session ? 'Active session found' : 'No active session',
            queryError: queryError?.message || 'Query successful',
            networkStatus: navigator.onLine,
            url: process.env.NEXT_PUBLIC_SUPABASE_URL
          });
          setStatus('connected');
        }
      } catch (error: any) {
        console.error('Connection test failed:', error);
        setDetails({
          error: error.message,
          networkStatus: navigator.onLine,
          url: process.env.NEXT_PUBLIC_SUPABASE_URL
        });
        setStatus('error');
      }
    };

    testConnection();
  }, []);

  const handleNetworkTest = async () => {
    setStatus('testing');
    setDetails(null);
    
    try {
      // Test basic network connectivity
      const response = await fetch('https://httpbin.org/get', {
        method: 'GET',
        mode: 'cors'
      });
      
      if (response.ok) {
        setDetails({
          success: 'Network connectivity is working',
          httpbinTest: 'Success',
          networkStatus: navigator.onLine
        });
        setStatus('connected');
      } else {
        setDetails({
          error: 'Network connectivity issue',
          httpbinTest: `Failed: ${response.status}`,
          networkStatus: navigator.onLine
        });
        setStatus('error');
      }
    } catch (error: any) {
      setDetails({
        error: 'Network connectivity failed',
        httpbinTest: error.message,
        networkStatus: navigator.onLine
      });
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === 'testing' && <Loader2 className="w-5 h-5 animate-spin" />}
            {status === 'connected' && <CheckCircle className="w-5 h-5 text-green-600" />}
            {status === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
            Supabase Connection Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Network Status */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
            {networkStatus === 'online' ? (
              <Wifi className="w-4 h-4 text-green-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-600" />
            )}
            <span className="text-sm font-medium">
              Network Status: {networkStatus === 'online' ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Test Results */}
          <div className="space-y-4">
            {status === 'testing' && (
              <p className="text-sm text-muted-foreground">
                Testing Supabase connection...
              </p>
            )}
            
            {status === 'connected' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Connection successful!</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  {details?.success && <p>✅ {details.success}</p>}
                  {details?.session && <p>🔐 {details.session}</p>}
                  {details?.queryError && <p>📊 Query: {details.queryError}</p>}
                  <p>🌐 Network: {details?.networkStatus ? 'Online' : 'Offline'}</p>
                  <p>🔗 URL: {details?.url?.substring(0, 40)}...</p>
                </div>
              </div>
            )}
            
            {status === 'error' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Connection failed</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  {details?.error && <p>❌ {details.error}</p>}
                  {details?.sessionError && <p>⚠️ Session: {details.sessionError}</p>}
                  <p>🌐 Network: {details?.networkStatus ? 'Online' : 'Offline'}</p>
                  <p>🔗 URL: {details?.url?.substring(0, 40)}...</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline" 
              className="flex-1"
            >
              Test Supabase Again
            </Button>
            <Button 
              onClick={handleNetworkTest}
              variant="outline"
              className="flex-1"
            >
              Test Network
            </Button>
          </div>
          
          {/* Troubleshooting Tips */}
          {status === 'error' && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">Troubleshooting Tips:</h4>
              <ul className="text-xs text-yellow-700 space-y-1">
                <li>• Check your internet connection</li>
                <li>• Verify Supabase URL is correct</li>
                <li>• Make sure development server is running</li>
                <li>• Check browser console for more details</li>
                <li>• Try refreshing the page</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
