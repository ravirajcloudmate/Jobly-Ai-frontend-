'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usersService } from '@/services/database';
import Sidebar from '../components/Sidebar';
import { DashboardHome } from '../components/DashboardHome';
import { CompanyProfile } from '../components/CompanyProfile';
import { JobPostings } from '../components/JobPostings';
import { InterviewManagement } from '../components/InterviewManagement';
import { CandidateReports } from '../components/CandidateReports';
import { AnalyticsInsights } from '../components/AnalyticsInsights';
import { SettingsSecurity } from '../components/SettingsSecurity';
import { Calendar } from '../components/Calendar';
import { ModuleLoader } from '../components/ModuleLoader';
import { RefreshLoader } from '../components/RefreshLoader';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { globalEvents } from '../hooks/useRealtimeUpdates';

export function ModuleContent({ module }: { module: string }) {
  const router = useRouter();
  const [activeModule, setActiveModule] = useState(module || 'dashboard');
  const [brandingLogoUrl, setBrandingLogoUrl] = useState<string | undefined>(undefined);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [moduleLoading, setModuleLoading] = useState(false);
  const [globalRefreshKey, setGlobalRefreshKey] = useState(0);
  const { user, loading } = useAuth();
  
  // Sync activeModule with URL param
  useEffect(() => {
    console.log('📍 Module from URL:', module);
    setActiveModule(module || 'dashboard');
    setModuleLoading(false);
  }, [module]);
  // Redirect unauthenticated users to login (client-side) to avoid getting stuck on message
  // Wait for auth to fully load before redirecting (prevent hard refresh redirect loop)
  useEffect(() => {
    // Don't redirect immediately - wait a bit for session to load on hard refresh
    if (!loading && !user) {
      // Add small delay to allow session from cookies to load
      const redirectTimeout = setTimeout(() => {
        console.log('⚠️ No user found after delay, redirecting to login from module:', module);
        router.replace('/auth/login');
      }, 1000); // 1 second delay to allow session recovery
      
      return () => clearTimeout(redirectTimeout);
    } else if (!loading && user) {
      console.log('✅ User authenticated, loading module:', module);
    }
  }, [loading, user, router, module]);

  const handleModuleChange = (next: string) => {
    if (next !== activeModule) {
      console.log('📍 Module change requested:', next);
      setModuleLoading(true);
      
      // Handle special routes
      if (next === 'interview-live') {
        router.push('/interview');
        return;
      }
      
      // For normal modules, just navigate
      router.push(`/${next}`);
    }
  };

  const renderContent = (userData?: any) => {
    const currentUserData = userData || {
      id: user?.id || 'temp-id',
      name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
      email: user?.email || 'user@example.com',
      company: user?.user_metadata?.company_name || 'Your Company',
      company_id: user?.user_metadata?.company_id || null,
      plan: 'Professional Plan',
      initials: 'U',
      role: 'admin',
      logoUrl: brandingLogoUrl
    };

    switch (activeModule) {
      case 'dashboard':
        return <DashboardHome user={currentUserData} globalRefreshKey={globalRefreshKey} />;
      case 'profile':
        return <CompanyProfile user={currentUserData} globalRefreshKey={globalRefreshKey} />;
      case 'jobs':
        return <JobPostings user={currentUserData} globalRefreshKey={globalRefreshKey} />;
      case 'interviews':
        return <InterviewManagement user={currentUserData} globalRefreshKey={globalRefreshKey} />;
      case 'interview-live':
        if (typeof window !== 'undefined') {
          window.location.href = '/interview';
        }
        return null;
      case 'reports':
        return <CandidateReports user={currentUserData} globalRefreshKey={globalRefreshKey} />;
      case 'analytics':
        return <AnalyticsInsights user={currentUserData} globalRefreshKey={globalRefreshKey} />;
      case 'settings':
        return <SettingsSecurity user={currentUserData} globalRefreshKey={globalRefreshKey} />;
      case 'calendar':
        return <Calendar user={currentUserData} globalRefreshKey={globalRefreshKey} />;
      default:
        return <DashboardHome user={currentUserData} globalRefreshKey={globalRefreshKey} />;
    }
  };

  // Load logo from localStorage on mount for immediate favicon update
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedLogo = localStorage.getItem('branding_company_logo');
      if (storedLogo && !brandingLogoUrl) {
        setBrandingLogoUrl(storedLogo);
      }
    }
  }, []);

  useEffect(() => {
    if (user && !userProfile) {
      loadUserProfile();
    }
  }, [user, userProfile]);

  const loadUserProfile = async () => {
    if (!user || userProfile) return;
    try {
      const { data } = await usersService.getUser(user.id);
      if (!data) {
        setUserProfile({
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email,
          company_id: user.user_metadata?.company_id || null,
          companies: { name: user.user_metadata?.company_name || 'Your Company' }
        });
        return;
      }
      setUserProfile(data);
      try {
        if (data?.company_id) {
          const { data: branding } = await supabase
            .from('company_branding')
            .select('logo_url')
            .eq('company_id', data.company_id)
            .maybeSingle();
          const logoUrl = branding?.logo_url || undefined;
          setBrandingLogoUrl(logoUrl);
          
          // Sync logo to localStorage for favicon
          if (typeof window !== 'undefined') {
            if (logoUrl) {
              localStorage.setItem('branding_company_logo', logoUrl);
              // Dispatch event to update favicon
              window.dispatchEvent(new CustomEvent('branding:updated', {
                detail: { logoUrl }
              }));
            } else {
              localStorage.removeItem('branding_company_logo');
            }
          }
        }
      } catch {}
    } catch {}
  };

  useEffect(() => {
    const handleGlobalRefresh = () => setGlobalRefreshKey(prev => prev + 1);
    globalEvents.on('refresh', handleGlobalRefresh);
    globalEvents.on('branding:updated', handleGlobalRefresh);
    return () => {
      globalEvents.off('refresh', handleGlobalRefresh);
      globalEvents.off('branding:updated', handleGlobalRefresh);
    };
  }, []);

  if (loading) return <RefreshLoader />;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    const fallbackProfile = {
      id: user?.id || 'temp-id',
      full_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
      email: user?.email || 'user@example.com',
      company_id: user?.user_metadata?.company_id || null,
      companies: {
        name: user?.user_metadata?.company_name || 'Your Company'
      }
    };
    const fallbackUserData = {
      id: fallbackProfile.id,
      name: fallbackProfile.full_name,
      email: fallbackProfile.email,
      company: fallbackProfile.companies?.name || 'Your Company',
      company_id: fallbackProfile.company_id,
      plan: 'Professional Plan',
      initials: fallbackProfile.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U',
      role: 'admin',
      logoUrl: brandingLogoUrl
    };
    return (
      <div className="min-h-screen bg-background">
        <ModuleLoader isLoading={moduleLoading}>
          <Sidebar 
            user={fallbackUserData} 
            activeModule={activeModule}
            onModuleChange={handleModuleChange}
          />
          <main className="with-fixed-sidebar overflow-auto h-screen">
            {renderContent(fallbackUserData)}
          </main>
        </ModuleLoader>
      </div>
    );
  }

  const userData = {
    id: userProfile.id,
    name: userProfile.full_name,
    email: userProfile.email,
    company: userProfile.companies?.name || 'Your Company',
    company_id: userProfile.company_id,
    plan: 'Professional Plan',
    initials: userProfile.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U',
    role: userProfile.role || 'viewer',
    logoUrl: brandingLogoUrl
  };

  return (
    <div className="min-h-screen bg-background">
      <ModuleLoader isLoading={moduleLoading}>
        <Sidebar 
          user={userData} 
          activeModule={activeModule}
          onModuleChange={handleModuleChange}
        />
        <main className="with-fixed-sidebar overflow-auto h-screen">
          {renderContent(userData)}
        </main>
      </ModuleLoader>
    </div>
  );
}

export default function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const resolved = React.use(params);
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ModuleContent module={resolved.module} />
    </Suspense>
  );
}


