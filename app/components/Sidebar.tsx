'use client';

import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  Briefcase, 
  Users, 
  FileText, 
  BarChart3, 
  CreditCard, 
  Settings,
  LogOut,
  Menu,
  X,
  Video,
  Sun,
  Moon,
  Loader2
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

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profile', label: 'Company Profile', icon: Building2 },
    { id: 'jobs', label: 'Job Postings', icon: Briefcase },
    { id: 'interviews', label: 'Interview Management', icon: Users },
    { id: 'interview-live', label: 'Interview Live', icon: Video },
    { id: 'reports', label: 'Candidate Reports', icon: FileText },
    { id: 'analytics', label: 'Analytics & Insights', icon: BarChart3 },
    { id: 'subscription', label: 'Subscription & Billing', icon: CreditCard },
    { id: 'settings', label: 'Settings & Security', icon: Settings },
  ];

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-card border-r border-border flex flex-col h-screen fixed left-0 top-0 transition-all duration-300 z-50`}>
      {/* Logo and Brand */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black overflow-hidden">
              {user.logoUrl ? (
                <img src={user.logoUrl} alt="Logo" className="h-8 w-8 object-cover" />
              ) : (
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C17.52 2 22 6.48 22 12C22 17.52 17.52 22 12 22C6.48 22 2 17.52 2 12C2 6.48 6.48 2 12 2Z" fill="#3B82F6" />
              <rect x="7" y="7" width="10" height="8" rx="2" fill="#1E40AF" />
              <path d="M9.5 9L9.5 15L15.5 12L9.5 9Z" fill="black" />
            </svg>
              )}
          </div>
            {!isCollapsed && (
          <div>
            <h2 className="font-semibold">InterviewAI</h2>
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
        <div className="space-y-1">
          {menuItems.map((item) => (
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
              onClick={() => onModuleChange?.(item.id)}
            >
              <item.icon className="h-4 w-4" />
                {!isCollapsed && <span className="text-sm">{item.label}</span>}
            </Button>
              
              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  {item.label}
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
                <AvatarFallback className="bg-blue-600 text-white font-semibold">
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
                <AvatarFallback className="bg-blue-600 text-white font-semibold">
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
