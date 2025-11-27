'use client';

import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  Briefcase, 
  Users, 
  FileText, 
  BarChart3, 
  Settings,
  LogOut,
  Menu,
  X,
  Video,
  Sun,
  Moon,
  Loader2,
  FileCode,
  BotMessageSquare,
  CalendarSearch
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  user: {
    name: string;
    company: string;
    plan: string;
    initials: string;
    logoUrl?: string;
    email?: string;
  };
  activeModule?: string;
  onModuleChange?: (module: string) => void;
  onCollapseChange?: (collapsed: boolean) => void;
}

const Sidebar = ({ user, activeModule = 'dashboard', onModuleChange, onCollapseChange }: SidebarProps) => {
  const { signOut, user: authUser } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [displayCompany, setDisplayCompany] = useState<string>(user.company);
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
  const [isProfilePopupOpen, setIsProfilePopupOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = window.localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  });

  const toggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onCollapseChange?.(newCollapsed);
  };

  // Apply theme to document
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  // Track viewport size for responsive sidebar behaviour
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const mobileView = window.innerWidth < 1024;
      if (mobileView) {
        setIsCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keep CSS custom property in sync with sidebar state for layout shift
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const computeWidth = () => {
      const mobileView = window.innerWidth < 1024;
      const width = mobileView
        ? (isCollapsed ? '0rem' : '16rem')
        : (isCollapsed ? '4rem' : '16rem');
      root.style.setProperty('--sidebar-current-width', width);
    };

    computeWidth();
    window.addEventListener('resize', computeWidth);
    return () => {
      window.removeEventListener('resize', computeWidth);
    };
  }, [isCollapsed]);

  // Ensure parent listeners receive collapse state changes (including initial)
  useEffect(() => {
    onCollapseChange?.(isCollapsed);
  }, [isCollapsed, onCollapseChange]);

  // Live company name updates via branding events/localStorage
  useEffect(() => {
    const updateName = (e: any) => {
      const next = e?.detail?.companyName || (typeof window !== 'undefined' ? window.localStorage.getItem('branding_company_name') : null);
      if (next) setDisplayCompany(next);
    };
    if (typeof window !== 'undefined') {
      const initial = window.localStorage.getItem('branding_company_name');
      if (initial) setDisplayCompany(initial);
      window.addEventListener('branding:updated', updateName as any);
    }
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('branding:updated', updateName as any);
    };
  }, []);

  const openSignOutDialog = () => {
    setIsSignOutDialogOpen(true);
  };

  const openProfilePopup = () => {
    setIsProfilePopupOpen(true);
  };

  const closeProfilePopup = () => {
    setIsProfilePopupOpen(false);
  };

  const handleSignOut = async () => {
    try {
      console.log('🔐 Starting sign out process...');
      setIsSignOutDialogOpen(false);
      setIsSigningOut(true);
      
      const { error } = await signOut();
      if (error) {
        console.error('❌ Sign out error:', error);
        alert('Sign out failed: ' + error.message);
        setIsSigningOut(false);
      } else {
        console.log('✅ Sign out successful - AuthContext will handle redirect');
        // Don't force redirect here - let AuthContext handle it
        // The SIGNED_OUT event will trigger the redirect
      }
    } catch (error) {
      console.error('❌ Sign out exception:', error);
      alert('Sign out failed. Please try again.');
      setIsSigningOut(false);
      // Even on error, try to redirect to login
      setTimeout(() => {
        window.location.href = '/auth/login';
      }, 1000);
    }
  };

  const menuGroups = [
    {
      title: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Company',
      items: [
        { id: 'profile', label: 'Company Profile', icon: Building2 },
        { id: 'settings', label: 'Settings & Security', icon: Settings },
      ],
    },
    {
      title: 'Hiring',
      items: [
        { id: 'jobs', label: 'Job Postings', icon: Briefcase },
        { id: 'interviews', label: 'Interview Management', icon: Users },
        { id: 'interview-live', label: 'Interview Live', icon: Video },
        { id: 'prompt-template', label: 'AI Agent', icon: BotMessageSquare },
        { id: 'calendar', label: 'Calendar', icon: CalendarSearch },
      ],
    },
    {
      title: 'Insights',
      items: [
        { id: 'reports', label: 'Candidate Reports', icon: FileText },
        { id: 'analytics', label: 'Analytics & Insights', icon: BarChart3 },
      ],
    },
  ];

  const sidebarWidthClass = isCollapsed ? 'w-16' : 'w-64';

  return (
    <div className={`${sidebarWidthClass} bg-card border-r border-border flex flex-col h-screen fixed left-0 top-0 transition-all duration-300 ease-in-out z-50`}>
      {/* Logo and Brand */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black overflow-hidden">
              {user.logoUrl ? (
                <img src={user.logoUrl} alt="Logo" className="h-8 w-8 object-cover" />
              ) : (
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient id="sidebarHeadGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e40af" stopOpacity="1" />
                  <stop offset="50%" stopColor="#3b82f6" stopOpacity="1" />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity="1" />
                </linearGradient>
              </defs>
              <rect width="24" height="24" fill="#000000"/>
              <path d="M6 6 C6 4, 8 2, 12 2 C16 2, 18 4, 18 6 C18 8, 20 10, 20 14 C20 16, 18 18, 14 20 C12 22, 10 22, 8 20 C6 20, 4 18, 4 14 C4 10, 6 8, 6 6 Z" fill="url(#sidebarHeadGradient)"/>
              <rect x="7.5" y="5.5" width="6" height="4.5" rx="1" fill="#1e40af"/>
              <path d="M9 7 L9 10 L12 8.5 Z" fill="#000000"/>
            </svg>
              )}
          </div>
            {!isCollapsed && (
          <div>
            <h2 className="font-semibold">Jobly.Ai</h2>
            <p className="text-xs text-muted-foreground">Dashboard</p>
          </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapse}
            className="h-8 w-8 p-0"
          >
            {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-2">
        <div className="space-y-2">
          {menuGroups.map((group, groupIndex) => (
            <div key={group.title}>
              {!isCollapsed && (
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.title}</p>
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <div key={item.id} className="relative group">
                    <Button
                      variant={activeModule === item.id ? 'secondary' : 'ghost'}
                      className={`w-full ${
                        isCollapsed 
                          ? 'justify-center p-2' 
                          : 'justify-start gap-3 px-3'
                      } ${
                        activeModule === item.id ? 'bg-secondary' : 'hover:bg-secondary/50'
                      }`}
                      onClick={() => {
                        if (onModuleChange) {
                          onModuleChange(item.id);
                        } else if (typeof window !== 'undefined') {
                          const target = item.id === 'interview-live' ? '/interview' : `/${item.id}`;
                          window.location.href = target;
                        }
                      }}
                    >
                      <item.icon className="h-4 w-4" style={{ color: '#ff0000' }} />
                      {!isCollapsed && <span className="text-sm">{item.label}</span>}
                    </Button>
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                        {item.label}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* Separator between groups */}
              {groupIndex < menuGroups.length - 1 && (
                <div className="px-3">
                  <Separator className="my-2" />
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* User Profile - Bottom */}
      <div className="p-4 border-t">
        {isCollapsed ? (
          /* Collapsed User Profile */
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={openProfilePopup}
              className="flex flex-col items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg p-2 transition-colors"
            >
              {/* User Avatar */}
              <Avatar className="h-10 w-10">
                <AvatarFallback className="text-white font-semibold" style={{ backgroundColor: '#ff0000' }}>
                  {user.initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </div>
        ) : (
          /* Expanded User Profile */
          <button
            onClick={openProfilePopup}
            className="w-full hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg p-3 transition-colors"
          >
            <div className="flex items-center gap-3">
              {/* User Avatar */}
              <Avatar className="h-10 w-10">
                <AvatarFallback className="text-white font-semibold" style={{ backgroundColor: '#ff0000' }}>
                  {user.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate">{user.name}</p>
                {(user.email || authUser?.email) && (
                  <p className="text-xs text-muted-foreground truncate">{user.email || authUser?.email}</p>
                )}
              </div>
            </div>
          </button>
        )}
      </div>

      {/* Profile Popup */}
      {isProfilePopupOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="flex-1 bg-black/20 backdrop-blur-sm"
            onClick={closeProfilePopup}
          />
          
          {/* Profile Panel */}
          <div className="w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-xl">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Profile</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeProfilePopup}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* User Info */}
              <div className="flex items-center gap-4 mb-6">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-blue-600 text-white font-semibold text-lg">
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-lg truncate">{user.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">{user.email || authUser?.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">
                      {user.plan}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <Separator className="mb-6" />
              
              {/* Theme Toggle */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">Appearance</h4>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={toggleTheme}
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  <span>{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
                </Button>
              </div>
              
              <Separator className="mb-6" />
              
              {/* Sign Out Button */}
              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={openSignOutDialog}
                disabled={isSigningOut}
              >
                {isSigningOut ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing Out...
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sign Out Confirmation Dialog */}
      <Dialog open={isSignOutDialogOpen} onOpenChange={setIsSignOutDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <LogOut className="h-5 w-5" />
              Sign Out
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to sign out? You will need to log in again to access your account.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex gap-3 pt-4">
            <Button 
              variant="destructive" 
              onClick={handleSignOut}
              className="gap-2"
              disabled={isSigningOut}
            >
              {isSigningOut ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing Out...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4" />
                  Yes, Sign Out
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsSignOutDialogOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sidebar;
