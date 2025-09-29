'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function TestLiveKitPage() {
  const [status, setStatus] = useState<'testing' | 'success' | 'error'>('testing');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const testLiveKit = async () => {
      try {
        const response = await fetch('/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            room: 'test-room', 
            identity: 'test-user' 
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setStatus('success');
          console.log('LiveKit token generated successfully:', data);
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Unknown error');
          setStatus('error');
        }
      } catch (err: any) {
        setError(err.message || 'Network error');
        setStatus('error');
      }
    };

    testLiveKit();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">LiveKit Configuration Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            {status === 'testing' && (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Testing LiveKit configuration...</span>
              </div>
            )}
            
            {status === 'success' && (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">LiveKit is working!</span>
              </div>
            )}
            
            {status === 'error' && (
              <div className="flex items-center justify-center gap-2 text-red-600">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">Configuration Error</span>
              </div>
            )}
          </div>

          {status === 'success' && (
            <div className="space-y-2">
              <Badge variant="secondary" className="w-full justify-center">
                ✅ Interview module ready
              </Badge>
              <p className="text-sm text-center text-muted-foreground">
                You can now access the interview module at{' '}
                <code className="bg-gray-100 px-1 rounded">/interview</code>
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-2">
              <Badge variant="destructive" className="w-full justify-center">
                ❌ Configuration needed
              </Badge>
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </p>
              <p className="text-xs text-muted-foreground">
                Check your .env.local file and restart the server
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
