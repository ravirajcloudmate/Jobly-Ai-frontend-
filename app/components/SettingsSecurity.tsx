'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Shield, 
  Key, 
  Eye, 
  EyeOff, 
  Plus, 
  Edit, 
  Trash2, 
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe,
  Bell,
  User,
  Lock,
  Smartphone,
  Monitor,
  SmartphoneIcon,
  Calendar,
  RefreshCw,
  ExternalLink,
  Copy,
  QrCode,
  Activity,
  Database,
  Webhook,
  FileText,
  Users,
  Building
} from 'lucide-react';
import { PageSkeleton } from './SkeletonLoader';

interface SettingsSecurityProps {
  user: any;
  globalRefreshKey?: number;
}

interface UserSettings {
  preferences: any;
  privacy_settings: any;
}

interface CompanySettings {
  general_settings: any;
  security_settings: any;
  notification_settings: any;
  integration_settings: any;
}

interface SecurityAuditLog {
  id: string;
  user_id: string;
  event_type: string;
  event_category: string;
  severity: string;
  description: string;
  ip_address: string;
  success: boolean;
  created_at: string;
}

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  permissions: any;
  last_used_at: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

interface UserSession {
  id: string;
  ip_address: string;
  user_agent: string;
  device_info: any;
  is_active: boolean;
  last_activity: string;
  expires_at: string;
  created_at: string;
}

interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  last_triggered_at: string;
  failure_count: number;
  created_at: string;
}

export function SettingsSecurity({ user, globalRefreshKey }: SettingsSecurityProps) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [userSessions, setUserSessions] = useState<UserSession[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showAddApiKey, setShowAddApiKey] = useState(false);
  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [showDataExport, setShowDataExport] = useState(false);
  const [newApiKey, setNewApiKey] = useState({ name: '', permissions: { read: true, write: false, admin: false } });
  const [newWebhook, setNewWebhook] = useState({ name: '', url: '', events: [] as string[] });

  useEffect(() => {
    if (!user?.id) return;
    loadSettingsData();
  }, [user?.id, globalRefreshKey]);

  const loadSettingsData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Get company ID
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      if (userData?.company_id) {
        setCompanyId(userData.company_id);
        
        // Load all settings data in parallel
        await Promise.all([
          loadUserSettings(),
          loadCompanySettings(userData.company_id),
          loadAuditLogs(userData.company_id),
          loadApiKeys(userData.company_id),
          loadUserSessions(),
          loadWebhooks(userData.company_id)
        ]);
      }
    } catch (error) {
      console.error('Error loading settings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserSettings = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_user_settings', { p_user_id: user.id });
      
      if (error) {
        console.error('Error loading user settings:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        // Set default settings as fallback
        setUserSettings({
          preferences: {
            theme: 'light',
            language: 'en',
            timezone: 'UTC',
            date_format: 'MM/DD/YYYY',
            notifications: {
              email: true,
              push: true,
              sms: false,
              interview_reminders: true,
              report_ready: true,
              billing_updates: true,
              security_alerts: true
            }
          },
          privacy_settings: {
            profile_visibility: 'company',
            activity_sharing: true,
            data_retention_days: 365,
            analytics_tracking: true
          }
        });
        return;
      }
      setUserSettings(data?.[0] || null);
    } catch (error) {
      console.error('Error loading user settings:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      // Set default settings as fallback
      setUserSettings({
        preferences: {
          theme: 'light',
          language: 'en',
          timezone: 'UTC',
          date_format: 'MM/DD/YYYY',
          notifications: {
            email: true,
            push: true,
            sms: false,
            interview_reminders: true,
            report_ready: true,
            billing_updates: true,
            security_alerts: true
          }
        },
        privacy_settings: {
          profile_visibility: 'company',
          activity_sharing: true,
          data_retention_days: 365,
          analytics_tracking: true
        }
      });
    }
  };

  const loadCompanySettings = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_company_settings', { p_company_id: companyId });
      
      if (error) {
        console.error('Error loading company settings:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        // Set default company settings as fallback
        setCompanySettings({
          general_settings: {
            company_name: '',
            timezone: 'UTC',
            date_format: 'MM/DD/YYYY',
            currency: 'USD',
            working_hours: {
              start: '09:00',
              end: '17:00',
              timezone: 'UTC',
              working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
            }
          },
          security_settings: {
            password_policy: {
              min_length: 8,
              require_uppercase: true,
              require_lowercase: true,
              require_numbers: true,
              require_symbols: false,
              max_age_days: 90
            },
            session_settings: {
              timeout_minutes: 480,
              max_concurrent_sessions: 5,
              require_reauth_for_sensitive: true
            },
            two_factor_auth: {
              enabled: false,
              required_for_admins: false,
              backup_codes_count: 10
            }
          },
          notification_settings: {
            email_notifications: {
              enabled: true,
              interview_reminders: true,
              report_ready: true,
              billing_updates: true,
              security_alerts: true,
              system_updates: true
            }
          },
          integration_settings: {
            calendar_sync: {
              enabled: false,
              provider: 'google',
              sync_interviews: true
            },
            hr_systems: {
              enabled: false,
              provider: '',
              api_endpoint: '',
              sync_candidates: false
            },
            analytics: {
              google_analytics: '',
              mixpanel: '',
              custom_tracking: false
            }
          }
        });
        return;
      }
      setCompanySettings(data?.[0] || null);
    } catch (error) {
      console.error('Error loading company settings:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      // Set default company settings as fallback
      setCompanySettings({
        general_settings: {
          company_name: '',
          timezone: 'UTC',
          date_format: 'MM/DD/YYYY',
          currency: 'USD',
          working_hours: {
            start: '09:00',
            end: '17:00',
            timezone: 'UTC',
            working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
          }
        },
        security_settings: {
          password_policy: {
            min_length: 8,
            require_uppercase: true,
            require_lowercase: true,
            require_numbers: true,
            require_symbols: false,
            max_age_days: 90
          },
          session_settings: {
            timeout_minutes: 480,
            max_concurrent_sessions: 5,
            require_reauth_for_sensitive: true
          },
          two_factor_auth: {
            enabled: false,
            required_for_admins: false,
            backup_codes_count: 10
          }
        },
        notification_settings: {
          email_notifications: {
            enabled: true,
            interview_reminders: true,
            report_ready: true,
            billing_updates: true,
            security_alerts: true,
            system_updates: true
          }
        },
        integration_settings: {
          calendar_sync: {
            enabled: false,
            provider: 'google',
            sync_interviews: true
          },
          hr_systems: {
            enabled: false,
            provider: '',
            api_endpoint: '',
            sync_candidates: false
          },
          analytics: {
            google_analytics: '',
            mixpanel: '',
            custom_tracking: false
          }
        }
      });
    }
  };

  const loadAuditLogs = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_security_audit_logs', { 
          p_company_id: companyId, 
          p_limit: 20, 
          p_offset: 0 
        });
      
      if (error) {
        console.error('Error loading audit logs:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        // Set empty array as fallback
        setAuditLogs([]);
        return;
      }
      setAuditLogs(data || []);
    } catch (error) {
      console.error('Error loading audit logs:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      // Set empty array as fallback
      setAuditLogs([]);
    }
  };

  const loadApiKeys = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_company_api_keys', { p_company_id: companyId });
      
      if (error) {
        console.error('Error loading API keys:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        // Set empty array as fallback
        setApiKeys([]);
        return;
      }
      setApiKeys(data || []);
    } catch (error) {
      console.error('Error loading API keys:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      // Set empty array as fallback
      setApiKeys([]);
    }
  };

  const loadUserSessions = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_user_sessions', { p_user_id: user.id });
      
      if (error) {
        console.error('Error loading user sessions:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        // Set empty array as fallback
        setUserSessions([]);
        return;
      }
      setUserSessions(data || []);
    } catch (error) {
      console.error('Error loading user sessions:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      // Set empty array as fallback
      setUserSessions([]);
    }
  };

  const loadWebhooks = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_company_webhooks', { p_company_id: companyId });
      
      if (error) {
        console.error('Error loading webhooks:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        // Set empty array as fallback
        setWebhooks([]);
        return;
      }
      setWebhooks(data || []);
    } catch (error) {
      console.error('Error loading webhooks:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      // Set empty array as fallback
      setWebhooks([]);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'error': return 'bg-orange-100 text-orange-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDeviceIcon = (userAgent: string) => {
    if (userAgent.includes('Mobile')) return <Smartphone className="h-4 w-4" />;
    if (userAgent.includes('Tablet')) return <SmartphoneIcon className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings & Security</h1>
        <p className="text-muted-foreground">Manage your account settings, security preferences, and integrations</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Settings
                </CardTitle>
                <CardDescription>Manage your personal preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="theme">Theme</Label>
                    <Select defaultValue={userSettings?.preferences?.theme || 'light'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="language">Language</Label>
                    <Select defaultValue={userSettings?.preferences?.language || 'en'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select defaultValue={userSettings?.preferences?.timezone || 'UTC'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Asia/Kolkata">India Standard Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select defaultValue={userSettings?.preferences?.date_format || 'MM/DD/YYYY'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button>Save Preferences</Button>
              </CardContent>
            </Card>

            {/* Privacy Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacy Settings
                </CardTitle>
                <CardDescription>Control your privacy and data sharing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="profileVisibility">Profile Visibility</Label>
                    <p className="text-sm text-muted-foreground">Who can see your profile</p>
                  </div>
                  <Select defaultValue={userSettings?.privacy_settings?.profile_visibility || 'company'}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="company">Company Only</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="activitySharing">Activity Sharing</Label>
                    <p className="text-sm text-muted-foreground">Share your activity with team</p>
                  </div>
                  <Switch 
                    defaultChecked={userSettings?.privacy_settings?.activity_sharing || true}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="analyticsTracking">Analytics Tracking</Label>
                    <p className="text-sm text-muted-foreground">Help improve the product</p>
                  </div>
                  <Switch 
                    defaultChecked={userSettings?.privacy_settings?.analytics_tracking || true}
                  />
                </div>
                <div>
                  <Label htmlFor="dataRetention">Data Retention</Label>
                  <Select defaultValue={userSettings?.privacy_settings?.data_retention_days?.toString() || '365'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                      <SelectItem value="730">2 years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button>Save Privacy Settings</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Password & Authentication */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Password & Authentication
                </CardTitle>
                <CardDescription>Manage your password and authentication settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input id="currentPassword" type="password" placeholder="Enter current password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input id="newPassword" type="password" placeholder="Enter new password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input id="confirmPassword" type="password" placeholder="Confirm new password" />
                </div>
                <Button>Update Password</Button>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="twoFactor">Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Disabled</Badge>
                    <Button variant="outline" size="sm" onClick={() => setShowTwoFactorSetup(true)}>
                      Enable
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Active Sessions
                </CardTitle>
                <CardDescription>Manage your active login sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {userSessions.length === 0 ? (
                    <div className="text-center py-4">
                      <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                      <div className="text-sm text-muted-foreground">No active sessions</div>
                    </div>
                  ) : (
                    userSessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getDeviceIcon(session.user_agent)}
                          <div>
                            <div className="font-medium text-sm">
                              {session.device_info?.device || 'Unknown Device'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {session.ip_address} • Last active {formatDate(session.last_activity)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {session.is_active && (
                            <Badge variant="secondary" className="text-xs">Current</Badge>
                          )}
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* API Keys */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys
              </CardTitle>
              <CardDescription>Manage your API keys for programmatic access</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {apiKeys.length === 0 ? (
                  <div className="text-center py-8">
                    <Key className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <div className="text-muted-foreground font-medium">No API keys</div>
                    <div className="text-sm text-muted-foreground mt-1">Create an API key to access our API</div>
                    <Button className="mt-4" onClick={() => setShowAddApiKey(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create API Key
                    </Button>
                  </div>
                ) : (
                  <>
                    {apiKeys.map((key) => (
                      <div key={key.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <Key className="h-4 w-4 text-gray-600" />
                          </div>
                          <div>
                            <div className="font-medium">{key.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {key.key_prefix}•••••••• • Created {formatDate(key.created_at)}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {key.permissions.read && <Badge variant="secondary" className="text-xs">Read</Badge>}
                              {key.permissions.write && <Badge variant="secondary" className="text-xs">Write</Badge>}
                              {key.permissions.admin && <Badge variant="secondary" className="text-xs">Admin</Badge>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {key.last_used_at && (
                            <div className="text-xs text-muted-foreground">
                              Last used {formatDate(key.last_used_at)}
                            </div>
                          )}
                          <Button variant="outline" size="sm">
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button onClick={() => setShowAddApiKey(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create API Key
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Choose how you want to be notified about activities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Email Notifications</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Interview Reminders</Label>
                      <p className="text-sm text-muted-foreground">Get notified before interviews</p>
                    </div>
                    <Switch defaultChecked={userSettings?.preferences?.notifications?.interview_reminders || true} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Report Ready</Label>
                      <p className="text-sm text-muted-foreground">When interview reports are completed</p>
                    </div>
                    <Switch defaultChecked={userSettings?.preferences?.notifications?.report_ready || true} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Billing Updates</Label>
                      <p className="text-sm text-muted-foreground">Payment and subscription updates</p>
                    </div>
                    <Switch defaultChecked={userSettings?.preferences?.notifications?.billing_updates || true} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Security Alerts</Label>
                      <p className="text-sm text-muted-foreground">Important security notifications</p>
                    </div>
                    <Switch defaultChecked={userSettings?.preferences?.notifications?.security_alerts || true} />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-medium">Push Notifications</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications in your browser</p>
                  </div>
                  <Switch defaultChecked={userSettings?.preferences?.notifications?.push || false} />
                </div>
              </div>
              
              <Button>Save Notification Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Webhooks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  Webhooks
                </CardTitle>
                <CardDescription>Configure webhook endpoints for real-time updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {webhooks.length === 0 ? (
                    <div className="text-center py-8">
                      <Webhook className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <div className="text-muted-foreground font-medium">No webhooks configured</div>
                      <div className="text-sm text-muted-foreground mt-1">Set up webhooks to receive real-time updates</div>
                      <Button className="mt-4" onClick={() => setShowAddWebhook(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Webhook
                      </Button>
                    </div>
                  ) : (
                    <>
                      {webhooks.map((webhook) => (
                        <div key={webhook.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <div className="font-medium">{webhook.name}</div>
                            <div className="text-sm text-muted-foreground">{webhook.url}</div>
                            <div className="flex items-center gap-2 mt-1">
                              {webhook.events.map((event) => (
                                <Badge key={event} variant="secondary" className="text-xs">
                                  {event}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={webhook.is_active ? "default" : "secondary"}>
                              {webhook.is_active ? "Active" : "Inactive"}
                            </Badge>
                            <Button variant="outline" size="sm">
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button onClick={() => setShowAddWebhook(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Webhook
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Data Export */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Data Export
                </CardTitle>
                <CardDescription>Export your data for backup or migration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Database className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-medium">Full Data Export</div>
                        <div className="text-sm text-muted-foreground">All your data in JSON format</div>
                      </div>
                    </div>
                    <Button className="mt-3" variant="outline" onClick={() => setShowDataExport(true)}>
                      <Download className="h-4 w-4 mr-2" />
                      Request Export
                    </Button>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="font-medium">Interview Reports</div>
                        <div className="text-sm text-muted-foreground">Export all interview reports</div>
                      </div>
                    </div>
                    <Button className="mt-3" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export Reports
                    </Button>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-purple-600" />
                      <div>
                        <div className="font-medium">Candidate Data</div>
                        <div className="text-sm text-muted-foreground">Export candidate information</div>
                      </div>
                    </div>
                    <Button className="mt-3" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export Candidates
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Audit Logs
              </CardTitle>
              <CardDescription>Monitor security events and account activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditLogs.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <div className="text-muted-foreground font-medium">No audit logs</div>
                    <div className="text-sm text-muted-foreground mt-1">Security events will appear here</div>
                  </div>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-4 border rounded-lg">
                      <div className="flex-shrink-0">
                        {log.success ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm">
                            {log.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`text-xs ${getSeverityColor(log.severity)}`}>
                              {log.severity}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(log.created_at)}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {log.description}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {log.ip_address} • {log.event_category}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add API Key Dialog */}
      <Dialog open={showAddApiKey} onOpenChange={setShowAddApiKey}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for programmatic access
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="keyName">Key Name</Label>
              <Input 
                id="keyName" 
                placeholder="My API Key"
                value={newApiKey.name}
                onChange={(e) => setNewApiKey({...newApiKey, name: e.target.value})}
              />
            </div>
            <div>
              <Label>Permissions</Label>
              <div className="space-y-2 mt-2">
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={newApiKey.permissions.read}
                    onCheckedChange={(checked) => setNewApiKey({
                      ...newApiKey, 
                      permissions: {...newApiKey.permissions, read: checked}
                    })}
                  />
                  <Label>Read Access</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={newApiKey.permissions.write}
                    onCheckedChange={(checked) => setNewApiKey({
                      ...newApiKey, 
                      permissions: {...newApiKey.permissions, write: checked}
                    })}
                  />
                  <Label>Write Access</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={newApiKey.permissions.admin}
                    onCheckedChange={(checked) => setNewApiKey({
                      ...newApiKey, 
                      permissions: {...newApiKey.permissions, admin: checked}
                    })}
                  />
                  <Label>Admin Access</Label>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddApiKey(false)}>
                Cancel
              </Button>
              <Button className="flex-1">
                Create Key
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Webhook Dialog */}
      <Dialog open={showAddWebhook} onOpenChange={setShowAddWebhook}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Webhook</DialogTitle>
            <DialogDescription>
              Configure a webhook endpoint to receive real-time updates
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="webhookName">Webhook Name</Label>
              <Input 
                id="webhookName" 
                placeholder="My Webhook"
                value={newWebhook.name}
                onChange={(e) => setNewWebhook({...newWebhook, name: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="webhookUrl">Webhook URL</Label>
              <Input 
                id="webhookUrl" 
                placeholder="https://example.com/webhook"
                value={newWebhook.url}
                onChange={(e) => setNewWebhook({...newWebhook, url: e.target.value})}
              />
            </div>
            <div>
              <Label>Events</Label>
              <div className="space-y-2 mt-2">
                {['interview_completed', 'report_generated', 'candidate_added', 'job_created'].map((event) => (
                  <div key={event} className="flex items-center space-x-2">
                    <Switch 
                      checked={newWebhook.events.includes(event)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setNewWebhook({...newWebhook, events: [...newWebhook.events, event]});
                        } else {
                          setNewWebhook({...newWebhook, events: newWebhook.events.filter(e => e !== event)});
                        }
                      }}
                    />
                    <Label className="text-sm">{event.replace(/_/g, ' ')}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddWebhook(false)}>
                Cancel
              </Button>
              <Button className="flex-1">
                Add Webhook
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Two-Factor Setup Dialog */}
      <Dialog open={showTwoFactorSetup} onOpenChange={setShowTwoFactorSetup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Add an extra layer of security to your account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <QrCode className="h-24 w-24 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-sm text-muted-foreground">
                Two-factor authentication setup will be implemented with TOTP
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowTwoFactorSetup(false)}>
                Cancel
              </Button>
              <Button className="flex-1" disabled>
                Enable 2FA
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Data Export Dialog */}
      <Dialog open={showDataExport} onOpenChange={setShowDataExport}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Data Export</DialogTitle>
            <DialogDescription>
              Request a complete export of your data
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Important</span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                Data exports may take up to 24 hours to process. You'll receive an email when ready.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowDataExport(false)}>
                Cancel
              </Button>
              <Button className="flex-1">
                Request Export
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
