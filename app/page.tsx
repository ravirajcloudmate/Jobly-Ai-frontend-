'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function IndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Always redirect to login page, regardless of authentication status
    // This ensures the app always starts at login when the server restarts
    if (typeof window !== 'undefined' && window.location.pathname === '/') {
      console.log('🔄 Root path: Always redirecting to login page');
      router.replace('/auth/login');
    }
  }, [router]);

  // Don't show this if we're not on root path
  if (typeof window !== 'undefined' && window.location.pathname !== '/') {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">
          Redirecting to login...
        </p>
      </div>
    </div>
  );
}
