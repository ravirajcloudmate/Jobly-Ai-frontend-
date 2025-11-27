'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User,
  Building,
  Mail,
  Save,
  Loader2,
  CheckCircle,
  Settings,
  Eye,
  EyeOff,
  Key
} from 'lucide-react';
import { PageSkeleton } from './SkeletonLoader';
import { globalEvents } from '../hooks/useRealtimeUpdates';

interface SettingsSecurityProps {
  user: any;
  globalRefreshKey?: number;
}

export function SettingsSecurity({ user, globalRefreshKey }: SettingsSecurityProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('account');
  
  // Account form data
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Email settings form data
  const [companyEmail, setCompanyEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    loadAccountDetails();
  }, [user?.id, globalRefreshKey]);

  const loadAccountDetails = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Get user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, full_name, company_id')
        .eq('id', user.id)
        .single();
      
      if (userError) {
        console.error('Error loading user data:', userError);
        setError('Failed to load account details');
        setLoading(false);
        return;
      }

      if (userData) {
        setFullName(userData.full_name || '');
        setEmail(userData.email || '');
        setCompanyId(userData.company_id || null);

        // Try to load account details from company_settings table first
        if (userData.company_id) {
          try {
            const { data: accountSettingsData, error: accountSettingsError } = await supabase
              .from('company_settings')
              .select('settings')
              .eq('company_id', userData.company_id)
              .eq('category', 'account')
              .maybeSingle();

            if (!accountSettingsError && accountSettingsData?.settings) {
              const accountSettings = accountSettingsData.settings as any;
              if (accountSettings.full_name) {
                setFullName(accountSettings.full_name);
              }
              if (accountSettings.company_name) {
                setCompanyName(accountSettings.company_name);
              }
              if (accountSettings.email) {
                setEmail(accountSettings.email);
              }
              console.log('✅ Loaded account details from company_settings table');
            }
          } catch (accountError: any) {
            // Table might not exist or no record found - this is okay, we'll use fallback
            if (accountError?.code !== '42P01' && !accountError?.message?.includes('does not exist')) {
              console.warn('⚠️ Error loading account details from company_settings:', accountError?.message || accountError);
            }
          }

          // If account settings not found, load from companies table (fallback)
          if (!companyName) {
            const { data: companyData, error: companyError } = await supabase
              .from('companies')
              .select('id, name')
              .eq('id', userData.company_id)
              .single();
            
            if (companyError) {
              console.error('Error loading company data:', companyError);
              // Don't set error here, just continue without company name
            } else if (companyData) {
              setCompanyName(companyData.name || '');
            }
          }
        } else {
          // If no company_id, try to get from user_metadata
          const companyNameFromMetadata = user?.user_metadata?.company_name || '';
          if (companyNameFromMetadata) {
            setCompanyName(companyNameFromMetadata);
          }
        }
      }

      // Load email settings if company exists
      if (userData?.company_id) {
        await loadEmailSettings(userData.company_id);
      }
    } catch (error) {
      console.error('Error loading account details:', error);
      setError('Failed to load account details');
    } finally {
      setLoading(false);
    }
  };

  const loadEmailSettings = async (cid: string) => {
    try {
      // Try to get from companies.settings JSONB field first (more reliable)
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('settings')
        .eq('id', cid)
        .maybeSingle();

      if (companyError) {
        // Only log if it's not a "not found" error
        if (companyError.code !== 'PGRST116') {
          console.warn('Could not load email settings from companies table:', companyError.message || companyError);
        }
      } else if (companyData?.settings) {
        const settings = companyData.settings as any;
        if (settings.email_settings?.email) {
          setCompanyEmail(settings.email_settings.email);
          // Also load password if available
          if (settings.email_settings?.password) {
            setEmailPassword(settings.email_settings.password);
            // If we have both email and password from companies.settings, no need to check company_settings
            return;
          }
          // If email found but password not found, continue to check company_settings for password
        }
      }

      // Also try company_settings table (if it exists) - especially if password wasn't found above
      try {
        const { data: settingsData, error: settingsError } = await supabase
          .from('company_settings')
          .select('settings')
          .eq('company_id', cid)
          .eq('category', 'email')
          .maybeSingle();

        if (settingsError) {
          // Check if table doesn't exist (common error codes)
          if (settingsError.code === 'PGRST116' || settingsError.code === '42P01' || settingsError.message?.includes('does not exist')) {
            // Table doesn't exist or no record found - this is okay, we'll use companies.settings
            console.log('company_settings table not found or no email settings record - will use companies.settings');
          } else {
            console.warn('Error loading from company_settings table:', settingsError.message || settingsError);
          }
        } else if (settingsData?.settings) {
          const emailSettings = settingsData.settings as any;
          if (emailSettings.email) {
            setCompanyEmail(emailSettings.email);
            // Load password if available
            if (emailSettings.password) {
              setEmailPassword(emailSettings.password);
            }
          }
        }
      } catch (tableError: any) {
        // Table might not exist - this is okay, we'll use companies.settings as fallback
        if (tableError?.code !== '42P01' && !tableError?.message?.includes('does not exist')) {
          console.warn('Error accessing company_settings table:', tableError?.message || tableError);
        }
      }
    } catch (error: any) {
      // Only log actual errors, not "table doesn't exist" which is expected
      if (error?.code !== '42P01' && error?.message && !error.message.includes('does not exist')) {
        console.error('Error loading email settings:', error?.message || error);
      }
      // Don't set error state, just continue without email settings
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate required fields
      if (!fullName.trim()) {
        setError('Full name is required');
        setSaving(false);
        return;
      }

      if (!companyName.trim()) {
        setError('Company name is required');
        setSaving(false);
        return;
      }

      // Update user's full_name
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({ 
          full_name: fullName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (userUpdateError) {
        console.error('Error updating user:', userUpdateError);
        throw new Error(userUpdateError.message || 'Failed to update user details');
      }

      // Update or create company
      if (companyId) {
        // Update existing company
        const { error: companyUpdateError } = await supabase
          .from('companies')
          .update({ 
            name: companyName.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', companyId);

        if (companyUpdateError) {
          console.error('Error updating company:', companyUpdateError);
          throw new Error(companyUpdateError.message || 'Failed to update company details');
        }

        // Also update company_branding table to keep it in sync
        try {
          // Check if company_branding record exists
          const { data: existingBranding } = await supabase
            .from('company_branding')
            .select('id')
            .eq('company_id', companyId)
            .maybeSingle();

          if (existingBranding) {
            // Update existing company_branding record
            const { error: brandingUpdateError } = await supabase
              .from('company_branding')
              .update({ 
                company_name: companyName.trim(),
                updated_at: new Date().toISOString()
              })
              .eq('company_id', companyId);

            if (brandingUpdateError) {
              console.warn('Warning: Could not update company_branding:', brandingUpdateError);
              // Don't throw error, just log warning
            } else {
              console.log('✅ Updated company_branding table with new company name');
            }
          } else {
            // Create company_branding record if it doesn't exist
            const { error: brandingCreateError } = await supabase
              .from('company_branding')
              .insert({
                company_id: companyId,
                company_name: companyName.trim()
              });

            if (brandingCreateError) {
              console.warn('Warning: Could not create company_branding:', brandingCreateError);
              // Don't throw error, just log warning
            } else {
              console.log('✅ Created company_branding record with company name');
            }
          }
        } catch (brandingError) {
          console.warn('Warning: Error updating company_branding:', brandingError);
          // Don't fail the entire operation if branding update fails
        }
      } else {
        // Create new company and link to user
        const { data: newCompany, error: companyCreateError } = await supabase
          .from('companies')
          .insert({ 
            name: companyName.trim()
          })
          .select('id')
          .single();

        if (companyCreateError) {
          console.error('Error creating company:', companyCreateError);
          throw new Error(companyCreateError.message || 'Failed to create company');
        }

        if (newCompany?.id) {
          // Link user to the new company
          const { error: linkError } = await supabase
            .from('users')
            .update({ 
              company_id: newCompany.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

          if (linkError) {
            console.error('Error linking company to user:', linkError);
            throw new Error(linkError.message || 'Failed to link company to user');
          }

          setCompanyId(newCompany.id);

          // Create company_branding record for the new company
          try {
            const { error: brandingCreateError } = await supabase
              .from('company_branding')
              .insert({
                company_id: newCompany.id,
                company_name: companyName.trim()
              });

            if (brandingCreateError) {
              console.warn('Warning: Could not create company_branding for new company:', brandingCreateError);
              // Don't throw error, just log warning
            } else {
              console.log('✅ Created company_branding record for new company');
            }
          } catch (brandingError) {
            console.warn('Warning: Error creating company_branding:', brandingError);
            // Don't fail the entire operation if branding creation fails
          }
        }
      }

      // Update auth user metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          company_name: companyName.trim()
        }
      });

      if (metadataError) {
        console.error('Error updating user metadata:', metadataError);
        // Don't throw error here, as the main updates succeeded
      }

      // Save account details to company_settings table
      let finalCompanyId = companyId;
      if (!finalCompanyId) {
        const { data: userDataForCompany } = await supabase
          .from('users')
          .select('company_id')
          .eq('id', user.id)
          .single();
        finalCompanyId = userDataForCompany?.company_id || null;
      }
      
      if (finalCompanyId) {
        try {
          const accountSettings = {
            full_name: fullName.trim(),
            company_name: companyName.trim(),
            email: email || user.email || '',
            updated_at: new Date().toISOString()
          };

          const { error: accountSettingsError } = await supabase
            .from('company_settings')
            .upsert({
              company_id: finalCompanyId,
              category: 'account',
              settings: accountSettings,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'company_id,category'
            });

          if (accountSettingsError) {
            // Check if table doesn't exist
            if (accountSettingsError.code === '42P01' || accountSettingsError.message?.includes('does not exist')) {
              console.warn('⚠️ company_settings table does not exist. Account details not saved to company_settings.');
            } else {
              console.warn('⚠️ Could not save account details to company_settings:', accountSettingsError.message);
            }
            // Don't throw error, just log warning
          } else {
            console.log('✅ Account details saved to company_settings table');
          }
        } catch (accountError: any) {
          console.warn('⚠️ Error saving account details to company_settings:', accountError?.message || accountError);
          // Don't fail the entire operation if company_settings save fails
        }
      }

      setSuccess('Account details updated successfully!');
      
      // Trigger global refresh to update Company Profile and other components
      globalEvents.emit('refresh');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('refresh'));
        window.dispatchEvent(new CustomEvent('branding:updated', {
          detail: {
            companyName: companyName.trim(),
            companyId: companyId
          }
        }));
      }
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (error: any) {
      console.error('Error saving account details:', error);
      setError(error.message || 'Failed to save account details');
      setTimeout(() => setError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmailSettings = async () => {
    if (!user?.id || !companyId) {
      setError('Company not found. Please set up your company first.');
      return;
    }

    setSavingEmail(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate email format
      if (companyEmail && !companyEmail.includes('@')) {
        setError('Please enter a valid email address');
        setSavingEmail(false);
        return;
      }

      // Validate password if email is provided
      if (companyEmail && !emailPassword) {
        setError('Please enter Google App Password when email is provided');
        setSavingEmail(false);
        return;
      }

      // Remove spaces from password (Google App Passwords often have spaces for readability)
      const passwordWithoutSpaces = emailPassword ? emailPassword.replace(/\s+/g, '') : '';

      // Validate password length (Google App Password is 16 characters without spaces)
      if (passwordWithoutSpaces && passwordWithoutSpaces.length !== 16) {
        setError(`Google App Password must be exactly 16 characters (without spaces). Current length: ${passwordWithoutSpaces.length}`);
        setSavingEmail(false);
        return;
      }

      // Prepare email settings object - save password without spaces
      const emailSettings = {
        email: companyEmail.trim(),
        password: passwordWithoutSpaces, // Save without spaces (Google App Passwords work without spaces)
        provider: 'gmail',
        updated_at: new Date().toISOString()
      };

      let savedToCompanySettings = false;
      let savedToCompaniesTable = false;

      // First, try to save to company_settings table (primary location)
      try {
        const { error: settingsError } = await supabase
          .from('company_settings')
          .upsert({
            company_id: companyId,
            category: 'email',
            settings: emailSettings,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'company_id,category'
          });

        if (settingsError) {
          // Check if table doesn't exist
          if (settingsError.code === '42P01' || settingsError.message?.includes('does not exist')) {
            console.warn('⚠️ company_settings table does not exist. Please run migration 011_create_company_settings_table.sql');
            console.warn('⚠️ Falling back to companies.settings JSONB field');
          } else {
            console.error('❌ Error saving to company_settings table:', settingsError);
            throw new Error(settingsError.message || 'Failed to save email settings to company_settings table');
          }
        } else {
          savedToCompanySettings = true;
          console.log('✅ Email settings saved to company_settings table');
        }
      } catch (settingsTableError: any) {
        console.error('❌ Error saving to company_settings table:', settingsTableError);
        // Continue to fallback
      }

      // Also save to companies.settings JSONB field as backup/fallback
      try {
        const { data: currentCompany, error: fetchError } = await supabase
          .from('companies')
          .select('settings')
          .eq('id', companyId)
          .single();

        if (fetchError) {
          console.warn('⚠️ Could not fetch company settings:', fetchError.message);
        } else {
          const currentSettings = (currentCompany?.settings as any) || {};
          const updatedSettings = {
            ...currentSettings,
            email_settings: {
              email: companyEmail.trim(),
              password: passwordWithoutSpaces, // Use password without spaces
              provider: 'gmail'
            }
          };

          const { error: companyUpdateError } = await supabase
            .from('companies')
            .update({
              settings: updatedSettings,
              updated_at: new Date().toISOString()
            })
            .eq('id', companyId);

          if (companyUpdateError) {
            console.warn('⚠️ Could not save to companies.settings:', companyUpdateError.message);
          } else {
            savedToCompaniesTable = true;
            console.log('✅ Email settings also saved to companies.settings JSONB field');
          }
        }
      } catch (companiesError: any) {
        console.warn('⚠️ Error saving to companies.settings:', companiesError.message || companiesError);
      }

      // Ensure at least one save was successful
      if (!savedToCompanySettings && !savedToCompaniesTable) {
        throw new Error('Failed to save email settings to both locations. Please check database connection and table existence.');
      }

      if (savedToCompanySettings && savedToCompaniesTable) {
        console.log('✅ Email settings saved to both company_settings table and companies.settings JSONB field');
      } else if (savedToCompanySettings) {
        console.log('✅ Email settings saved to company_settings table');
      } else if (savedToCompaniesTable) {
        console.log('✅ Email settings saved to companies.settings JSONB field (company_settings table not available)');
      }

      setSuccess('Email settings saved successfully!');
      setTimeout(() => setSuccess(null), 5000);
    } catch (error: any) {
      console.error('Error saving email settings:', error);
      setError(error.message || 'Failed to save email settings');
      setTimeout(() => setError(null), 5000);
    } finally {
      setSavingEmail(false);
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account details and email configuration</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="account">Account Details</TabsTrigger>
          <TabsTrigger value="email">Email Settings</TabsTrigger>
        </TabsList>

        {/* Account Details Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
            Account Details
                </CardTitle>
          <CardDescription>
            Update your personal and company information
          </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Full Name
              </Label>
              <Input 
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={saving}
                className="h-11"
              />
            </div>

            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="companyName" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Company Name
              </Label>
              <Input 
                id="companyName"
                type="text"
                placeholder="Enter your company name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={saving}
                className="h-11"
              />
            </div>

            {/* Email (Read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <Input 
                id="email"
                type="email"
                value={email}
                disabled
                className="h-11 bg-gray-50 cursor-not-allowed"
              />
              <p className="text-sm text-muted-foreground">
                Email address cannot be changed
              </p>
            </div>

            {/* Save Button */}
            <div className="pt-4">
              <Button 
                onClick={handleSave}
                disabled={saving}
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {saving ? (
              <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
              </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Save Changes
            </div>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        {/* Email Settings Tab */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Configuration
              </CardTitle>
              <CardDescription>
                Configure Gmail settings for sending interview invitations to candidates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {success && (
                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}

              {!companyId && (
                <Alert>
                  <AlertDescription>
                    Please set up your company in Account Details tab first.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                {/* Company Email */}
                <div className="space-y-2">
                  <Label htmlFor="companyEmail" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Company Email (Gmail)
                  </Label>
                  <Input 
                    id="companyEmail"
                    type="email"
                    placeholder="your-company@gmail.com"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    disabled={savingEmail || !companyId}
                    className="h-11"
                  />
                  <p className="text-sm text-muted-foreground">
                    This email will be used to send interview invitations to candidates
                  </p>
                </div>

                {/* Google App Password */}
                <div className="space-y-2">
                  <Label htmlFor="emailPassword" className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Google App Password (16 characters)
                  </Label>
                  <div className="relative">
                    <Input 
                      id="emailPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter 16-character Google App Password (spaces will be removed automatically)"
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      disabled={savingEmail || !companyId}
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      disabled={savingEmail || !companyId}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Get your App Password from: Google Account → Security → 2-Step Verification → App passwords.
                    <br />
                    <span className="text-blue-600 font-medium">Note: You can paste the password with spaces (e.g., "eecy luvf llvk ixby") - spaces will be automatically removed.</span>
                  </p>
                </div>

                {/* Info Box */}
                <Alert>
                  <AlertDescription className="text-sm">
                    <strong>How to get Google App Password:</strong>
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                      <li>Go to your Google Account settings</li>
                      <li>Navigate to Security → 2-Step Verification</li>
                      <li>Scroll down to "App passwords"</li>
                      <li>Generate a new app password for "Mail"</li>
                      <li>Copy the 16-character password and paste it here</li>
                    </ol>
                  </AlertDescription>
                </Alert>

                {/* Save Button */}
                <div className="pt-4">
                  <Button 
                    onClick={handleSaveEmailSettings}
                    disabled={savingEmail || !companyId}
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {savingEmail ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Save className="w-4 h-4" />
                        Save Email Settings
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
