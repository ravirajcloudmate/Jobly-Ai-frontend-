'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usersService } from '@/services/database';
import Sidebar from './components/Sidebar';
import { DashboardHome } from './components/DashboardHome';
import { CompanyProfile } from './components/CompanyProfile';
import { JobPostings } from './components/JobPostings';
import { InterviewManagement } from './components/InterviewManagement';
import { CandidateReports } from './components/CandidateReports';
import { AnalyticsInsights } from './components/AnalyticsInsights';
import { SubscriptionBilling } from './components/SubscriptionBilling';
import { SettingsSecurity } from './components/SettingsSecurity';
import { ModuleLoader } from './components/ModuleLoader';
import { RefreshLoader } from './components/RefreshLoader';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { globalEvents } from './hooks/useRealtimeUpdates';

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialModule = (searchParams?.get('module') as string) || 'dashboard';
  const [activeModule, setActiveModule] = useState(initialModule);
  const [brandingLogoUrl, setBrandingLogoUrl] = useState<string | undefined>(undefined);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [moduleLoading, setModuleLoading] = useState(false);
  const [globalRefreshKey, setGlobalRefreshKey] = useState(0);
  const { user, loading } = useAuth();

  const handleModuleChange = (module: string) => {
    if (module !== activeModule) {
      setModuleLoading(true);
      
      // Start blue line animation
      setTimeout(() => {
        setActiveModule(module);
        setModuleLoading(false);
      }, 800); // Animation duration matches the blue line
    }
  };

  const renderContent = (userData?: any) => {
    // Use provided userData or create emergency data
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
        // Route to the page-based Live Interview UI
        if (typeof window !== 'undefined') {
          // Navigate to Next.js page
          window.location.href = '/interview';
        }
        return null;
      case 'reports':
        return <CandidateReports user={currentUserData} globalRefreshKey={globalRefreshKey} />;
      case 'analytics':
        return <AnalyticsInsights user={currentUserData} globalRefreshKey={globalRefreshKey} />;
      case 'subscription':
        return <SubscriptionBilling user={currentUserData} globalRefreshKey={globalRefreshKey} />;
      case 'settings':
        return <SettingsSecurity user={currentUserData} globalRefreshKey={globalRefreshKey} />;
      default:
        return <DashboardHome user={currentUserData} globalRefreshKey={globalRefreshKey} />;
    }
  };

  useEffect(() => {
    if (user && !userProfile) {
      console.log('Loading user profile...')
      loadUserProfile();
    }
  }, [user, userProfile]); // Include userProfile to prevent infinite loops

  const loadUserProfile = async () => {
    if (!user || userProfile) return; // Prevent duplicate loads
    
    console.log('Loading user profile for:', user.id);
    
    try {
      const { data, error } = await usersService.getUser(user.id);
      
      if (error) {
        // If user doesn't exist (PGRST116), handle gracefully
        if (error.code === 'PGRST116') {
          console.log('ℹ️ User not found in database (PGRST116), creating fallback profile');
        } else {
          console.error('Error fetching user profile:', {
            message: error.message,
            code: error.code,
            details: 'details' in error ? error.details : undefined,
            hint: 'hint' in error ? error.hint : undefined
          });
        }
        
        // Create fallback profile even on error
        console.log('Creating fallback profile due to error');
        setUserProfile({
          id: user.id,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          email: user.email,
          company_id: user.user_metadata?.company_id || null,
          companies: {
            name: user.user_metadata?.company_name || 'Your Company'
          }
        });
        return;
      }
      
      // If no error but no data, user doesn't exist in database
      if (!data) {
        console.log('ℹ️ No user data found, creating fallback profile');
        setUserProfile({
          id: user.id,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          email: user.email,
          company_id: user.user_metadata?.company_id || null,
          companies: {
            name: user.user_metadata?.company_name || 'Your Company'
          }
        });
        return;
      }
      
      console.log('User profile data:', data);
      
      if (data) {
        setUserProfile(data);
        // load branding logo
        try {
          if (data?.company_id) {
            const { data: branding } = await supabase
              .from('company_branding')
              .select('logo_url')
              .eq('company_id', data.company_id)
              .maybeSingle();
            setBrandingLogoUrl(branding?.logo_url || undefined);
          }
        } catch (e) {
          console.log('Error loading branding:', e);
        }
      } else {
        // No data from database, create fallback
        console.log('No user data found, creating fallback');
        setUserProfile({
          id: user.id,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          email: user.email,
          company_id: user.user_metadata?.company_id || null,
          companies: {
            name: user.user_metadata?.company_name || 'Your Company'
          }
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      
      // Always set fallback data so page doesn't stay stuck
      setUserProfile({
        id: user.id,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        email: user.email,
        company_id: user.user_metadata?.company_id || null,
        companies: {
          name: user.user_metadata?.company_name || 'Your Company'
        }
      });
    }
  };

  // Global refresh mechanism for real-time updates
  useEffect(() => {
    const handleGlobalRefresh = () => {
      console.log('Global refresh triggered');
      setGlobalRefreshKey(prev => prev + 1);
    };

    // Listen for global refresh events
    globalEvents.on('refresh', handleGlobalRefresh);
    
    // Listen for branding updates
    globalEvents.on('branding:updated', (data: any) => {
      console.log('Branding updated globally:', data);
      // Trigger a refresh to update all components
      setGlobalRefreshKey(prev => prev + 1);
    });

    return () => {
      globalEvents.off('refresh', handleGlobalRefresh);
      globalEvents.off('branding:updated', handleGlobalRefresh);
    };
  }, []);

  // Check Supabase configuration and handle redirects
  useEffect(() => {
    console.log('Supabase configured:', isSupabaseConfigured());
    console.log('Current user:', user?.email);
    console.log('Loading state:', loading);
    
    // Only redirect to login if we're sure there's no user and we're not loading
    // Add a much longer delay to prevent race conditions with authentication
    if (!user && !loading) {
      console.log('No user found, redirecting to login...');
      const timeoutId = setTimeout(() => {
        // Triple-check that user is still null before redirecting
        if (!user && !loading) {
          console.log('🔒 Confirmed no user, redirecting to login');
          router.push('/auth/login');
        } else {
          console.log('✅ User found during delay, staying on dashboard');
        }
      }, 1000); // Much longer delay to prevent race conditions
      
      return () => clearTimeout(timeoutId);
    }
  }, [user, loading, router]);

  // Show skeleton loader while checking authentication (page refresh/hard refresh)
  if (loading) {
    return <RefreshLoader />;
  }

  // If no user, show redirect message
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

  // Always render dashboard, use fallback data if no profile loaded yet
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
          <main className="ml-64 overflow-auto h-screen">
            {renderContent(fallbackUserData)}
          </main>
        </ModuleLoader>
      </div>
    );
  }

  // Transform user data for components
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
        <main className="ml-64 overflow-auto h-screen">
          {renderContent(userData)}
        </main>
      </ModuleLoader>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
