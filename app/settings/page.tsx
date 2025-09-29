'use client';

import { useAuth } from '@/contexts/AuthContext';
import { SettingsSecurity } from '@/app/components/SettingsSecurity';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  const [globalRefreshKey, setGlobalRefreshKey] = useState(0);

  useEffect(() => {
    // Listen for global refresh events
    const handleGlobalRefresh = () => {
      setGlobalRefreshKey(prev => prev + 1);
    };

    // Listen for branding updates
    const handleBrandingUpdate = () => {
      setGlobalRefreshKey(prev => prev + 1);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('refresh', handleGlobalRefresh);
      window.addEventListener('branding:updated', handleBrandingUpdate);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('refresh', handleGlobalRefresh);
        window.removeEventListener('branding:updated', handleBrandingUpdate);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SettingsSecurity user={user} globalRefreshKey={globalRefreshKey} />
    </div>
  );
}
