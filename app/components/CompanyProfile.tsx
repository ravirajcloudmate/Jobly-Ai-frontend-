
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Upload, 
  Users, 
  Plus, 
  Trash2, 
  Crown, 
  User,
  Eye,
  Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const BRANDING_NAME_STORAGE_KEY = 'branding_company_name';
const BRANDING_LOGO_STORAGE_KEY = 'branding_company_logo';

interface CompanyProfileProps {
  user: any;
  globalRefreshKey?: number;
}

export function CompanyProfile({ user, globalRefreshKey }: CompanyProfileProps) {
  const [companyLogo, setCompanyLogo] = useState('/logo.svg');
  const [welcomeMessage, setWelcomeMessage] = useState(`Welcome to ${user.company} AI Interview`);
  const [primaryColor, setPrimaryColor] = useState('#030213');
  const [secondaryColor, setSecondaryColor] = useState('#6366F1');
  const [backgroundColor, setBackgroundColor] = useState('#F8FAFC');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [effectiveCompanyId, setEffectiveCompanyId] = useState<string | null>(user?.company_id || null);
  const [companyName, setCompanyName] = useState<string>(user.company || '');
  const [industry, setIndustry] = useState<string>('Technology Services');
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [newRole, setNewRole] = useState('');

  const updateBrandingCache = (
    name?: string | null,
    logoUrl?: string | null,
    companyIdOverride?: string | null,
    emitEvent = true
  ) => {
    if (typeof window === 'undefined') return;

    const resolvedName = typeof name === 'string' ? name : companyName;
    const resolvedLogo = logoUrl !== undefined ? logoUrl : companyLogo;
    const companyIdValue = companyIdOverride ?? effectiveCompanyId ?? null;

    try {
      if (resolvedName) {
        localStorage.setItem(BRANDING_NAME_STORAGE_KEY, resolvedName);
        localStorage.setItem('companyName', resolvedName);
      }
      if (logoUrl !== undefined) {
        if (resolvedLogo) {
          localStorage.setItem(BRANDING_LOGO_STORAGE_KEY, resolvedLogo);
        } else {
          localStorage.removeItem(BRANDING_LOGO_STORAGE_KEY);
        }
      } else if (!localStorage.getItem(BRANDING_LOGO_STORAGE_KEY) && resolvedLogo) {
        localStorage.setItem(BRANDING_LOGO_STORAGE_KEY, resolvedLogo);
      }
    } catch (error) {
      console.warn('Branding cache update failed:', error);
    }

    if (emitEvent) {
      window.dispatchEvent(new CustomEvent('branding:updated', {
        detail: {
          companyName: resolvedName,
          logoUrl: resolvedLogo,
          companyId: companyIdValue
        }
      }));
    }
  };

  useEffect(() => {
    const loadAllData = async () => {
      console.log('Starting data load...');
      setError(null);
      
      try {
        // Get current user and resolve company_id
        const { data: authData } = await supabase.auth.getUser();
        const authUserId = authData?.user?.id;
        console.log('Auth user ID:', authUserId);
        
        if (!authUserId) {
          console.log('No authenticated user found');
          // Set default values for unauthenticated users
          setCompanyName(user?.company || '');
          setIndustry('Technology Services');
          setWelcomeMessage(`Welcome to ${user?.company || 'Our Company'} AI Interview`);
          return;
        }

        // Get user data including company_id
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('company_id, full_name, role')
          .eq('id', authUserId)
          .maybeSingle();

        if (userError) {
          console.error('Error fetching user data:', userError);
        }
        
        console.log('User data:', userData);

        // Only use existing company_id if user actually has one and it's valid
        let cid = userData?.company_id || effectiveCompanyId || user?.company_id;
        
        // Verify the company actually exists if we have a company_id
        if (cid) {
          const { data: companyExists } = await supabase
            .from('companies')
            .select('id')
            .eq('id', cid)
            .maybeSingle();
          
          if (!companyExists) {
            console.log('Company ID exists but company not found, will create new one');
            cid = null;
            setEffectiveCompanyId(null);
          }
        }
        
        console.log('Resolved company ID:', cid);
        
        if (cid) {
          setEffectiveCompanyId(cid);
          
          // Load company name from companies table (Settings module)
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('name')
            .eq('id', cid)
            .maybeSingle();

          if (companyError) {
            console.error('Error fetching company data:', companyError);
          }

          if (companyData?.name) {
            setCompanyName(companyData.name);
            console.log('Loaded company name from companies table:', companyData.name);
          }
          
          // Load all data from company_branding table
          const { data: brandingData, error: brandingError } = await supabase
            .from('company_branding')
            .select('*')
            .eq('company_id', cid)
            .maybeSingle();

          if (brandingError) {
            console.error('Error fetching branding data:', brandingError);
          }

          console.log('Loaded branding data:', brandingData);

          if (brandingData) {
            // Set all fields from company_branding table (except company name which comes from companies table)
            setIndustry(brandingData.industry || 'Technology Services');
            setCompanyLogo(brandingData.logo_url || '/logo.svg');
            setWelcomeMessage(brandingData.welcome_message || `Welcome to ${companyData?.name || user.company || 'Our Company'} AI Interview`);
            setPrimaryColor(brandingData.primary_color || '#030213');
            setSecondaryColor(brandingData.secondary_color || '#6366F1');
            setBackgroundColor(brandingData.background_color || '#F8FAFC');
            
            console.log('Set industry to:', brandingData.industry);
            updateBrandingCache(companyData?.name || null, brandingData.logo_url || null, cid);
          } else {
            console.log('No branding data found, setting defaults');
            // Set default values if no branding data exists
            setIndustry('Technology Services');
            setCompanyLogo('/logo.svg');
            setWelcomeMessage(`Welcome to ${companyData?.name || user?.company || 'Our Company'} AI Interview`);
            setPrimaryColor('#030213');
            setSecondaryColor('#6366F1');
            setBackgroundColor('#F8FAFC');
            updateBrandingCache(companyData?.name || null, '/logo.svg', cid);
          }

          // Load team members and pending invitations
          await loadTeamMembers(cid);
          await loadPendingInvitations(cid);
        } else {
          console.log('No company ID found, user needs to create a company');
          // Set default values for new company creation
          setCompanyName(user?.company || `${user?.name || 'User'}'s Company`);
          setIndustry('Technology Services');
          setCompanyLogo('/logo.svg');
          setWelcomeMessage(`Welcome to ${user?.company || user?.name || 'Our Company'} AI Interview`);
          setPrimaryColor('#030213');
          setSecondaryColor('#6366F1');
          setBackgroundColor('#F8FAFC');
          
          // For new users, show empty team (they'll be the first member after save)
          setTeamMembers([]);
          setPendingInvitations([]);
          updateBrandingCache(user?.company || null, '/logo.svg', null);
        }
      } catch (e: any) {
        console.error('Load data error:', e);
        setError(e?.message || 'Failed to load data');
        // Set defaults even on error
        setCompanyName(user?.company || '');
        setIndustry('Technology Services');
        setCompanyLogo('/logo.svg');
        setWelcomeMessage(`Welcome to ${user?.company || 'Our Company'} AI Interview`);
        setPrimaryColor('#030213');
        setSecondaryColor('#6366F1');
        setBackgroundColor('#F8FAFC');
        updateBrandingCache(user?.company || null, '/logo.svg', null);
      } finally {
        console.log('Data load complete');
      }
    };

    // Only load data when we have user information
    if (user) {
      loadAllData();
    } else {
      console.log('No user prop provided');
    }
  }, [user?.company_id, user?.company, effectiveCompanyId]);

  // Respond to global refresh key changes
  useEffect(() => {
    if (globalRefreshKey && globalRefreshKey > 0) {
      console.log('CompanyProfile: Global refresh triggered');
      if (effectiveCompanyId) {
        // Reload company name from companies table when Settings updates it
        const reloadCompanyName = async () => {
          const { data: companyData } = await supabase
            .from('companies')
            .select('name')
            .eq('id', effectiveCompanyId)
            .maybeSingle();
          
          if (companyData?.name) {
            setCompanyName(companyData.name);
            console.log('Company name refreshed from Settings:', companyData.name);
            updateBrandingCache(companyData.name, companyLogo, effectiveCompanyId);
          }
        };
        reloadCompanyName();
        // Trigger a reload by updating the reload key
        setReloadKey(globalRefreshKey);
      }
    }
  }, [globalRefreshKey, effectiveCompanyId, companyLogo]);

  // Realtime: update branding and team sections live
  useEffect(() => {
    if (!effectiveCompanyId) return;

    const channel = supabase.channel(`company-profile-rt-${effectiveCompanyId}-${Date.now()}`);

    let debounceTimer: any;
    const schedule = (fn: () => void) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fn, 300);
    };

    try {
      // company_branding updates
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'company_branding', filter: `company_id=eq.${effectiveCompanyId}` },
        (payload) => {
          console.log('CompanyProfile: company_branding changed:', payload.eventType);
          schedule(async () => {
            const { data: brandingData } = await supabase
              .from('company_branding')
              .select('*')
              .eq('company_id', effectiveCompanyId)
              .maybeSingle();
            if (brandingData) {
              setCompanyName(brandingData.company_name || '');
              setIndustry(brandingData.industry || 'Technology Services');
              setCompanyLogo(brandingData.logo_url || '/logo.svg');
              setWelcomeMessage(brandingData.welcome_message || `Welcome to ${brandingData.company_name || 'Our Company'} AI Interview`);
              setPrimaryColor(brandingData.primary_color || '#030213');
              setSecondaryColor(brandingData.secondary_color || '#6366F1');
              setBackgroundColor(brandingData.background_color || '#F8FAFC');
              
              // Broadcast company name update to other components
              updateBrandingCache(brandingData.company_name || null, brandingData.logo_url || null, effectiveCompanyId);
            }
          });
        }
      );

      // users (team)
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users', filter: `company_id=eq.${effectiveCompanyId}` },
        (payload) => {
          console.log('CompanyProfile: users changed:', payload.eventType);
          schedule(() => loadTeamMembers(effectiveCompanyId));
        }
      );

      // team_invitations
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_invitations', filter: `company_id=eq.${effectiveCompanyId}` },
        (payload) => {
          console.log('CompanyProfile: team_invitations changed:', payload.eventType);
          schedule(() => loadPendingInvitations(effectiveCompanyId));
        }
      );

      channel.subscribe((status) => {
        console.log('CompanyProfile realtime subscription status:', status);
      });
    } catch (e) {
      console.error('Company Profile realtime subscription error:', e);
    }

    return () => {
      clearTimeout(debounceTimer);
      try { 
        supabase.removeChannel(channel);
        console.log('CompanyProfile: Removed realtime channel');
      } catch (e) {
        console.warn('CompanyProfile: Error removing channel:', e);
      }
    };
  }, [effectiveCompanyId]);

  // Refresh on focus/visibility only if tab was away for a while
  useEffect(() => {
    let lastHiddenAt = 0;
    const refreshData = async () => {
      if (!effectiveCompanyId) return;
      await loadTeamMembers(effectiveCompanyId);
      await loadPendingInvitations(effectiveCompanyId);
      const { data: brandingData } = await supabase
        .from('company_branding')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .maybeSingle();
      if (brandingData) {
        setCompanyName(brandingData.company_name || '');
        setIndustry(brandingData.industry || 'Technology Services');
        setCompanyLogo(brandingData.logo_url || '/logo.svg');
        setWelcomeMessage(brandingData.welcome_message || `Welcome to ${brandingData.company_name || 'Our Company'} AI Interview`);
        setPrimaryColor(brandingData.primary_color || '#030213');
        setSecondaryColor(brandingData.secondary_color || '#6366F1');
        setBackgroundColor(brandingData.background_color || '#F8FAFC');
      }
    };
    const triggerIfStale = () => {
      const awayMs = Date.now() - lastHiddenAt;
      if (awayMs > 15000) {
        refreshData();
      }
    };
    const onFocus = () => triggerIfStale();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        lastHiddenAt = Date.now();
      } else if (document.visibilityState === 'visible') {
        triggerIfStale();
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [effectiveCompanyId]);

  // Load team members from Supabase
  const loadTeamMembers = async (companyId: string) => {
    try {
      console.log('Loading team members for company:', companyId);
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading team members:', error);
        throw error;
      }

      console.log('Loaded team members count:', data?.length || 0);
      console.log('Team members data:', data);
      setTeamMembers(data || []);
    } catch (e: any) {
      console.error('Error loading team members:', e);
      // Set empty array but don't throw - this allows the UI to show "no members"
      setTeamMembers([]);
    }
  };

  // Load pending invitations
  const loadPendingInvitations = async (companyId: string) => {
    try {
      console.log('Loading pending invitations for company:', companyId);
      const { data, error } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Loaded pending invitations:', data);
      setPendingInvitations(data || []);
    } catch (e: any) {
      console.error('Error loading pending invitations:', e);
      setPendingInvitations([]);
    }
  };

  // Invite new team member
  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !effectiveCompanyId) return;
    
    setInviteLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Get current authenticated user
      const { data: authData } = await supabase.auth.getUser();
      const authUserId = authData?.user?.id;
      if (!authUserId) throw new Error('User not authenticated');

      console.log('Creating invitation for company:', effectiveCompanyId, 'by user:', authUserId);

      // Check if user is already a team member
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', inviteEmail.trim())
        .eq('company_id', effectiveCompanyId)
        .maybeSingle();

      if (existingUser) {
        throw new Error('This user is already a team member');
      }

      // Check if there's already a pending invitation
      const { data: existingInvite } = await supabase
        .from('team_invitations')
        .select('id, status')
        .eq('email', inviteEmail.trim())
        .eq('company_id', effectiveCompanyId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingInvite) {
        throw new Error('An invitation is already pending for this email');
      }

      // Create invitation in database
      const { data: invitation, error: inviteError } = await supabase.rpc('create_team_invitation', {
        p_company_id: effectiveCompanyId,
        p_email: inviteEmail.trim(),
        p_invited_by: authUserId,
        p_role: inviteRole
      });

      if (inviteError) {
        console.error('Invitation creation error:', inviteError);
        throw inviteError;
      }

      console.log('Invitation created successfully:', invitation);

      // Try to send invitation email (don't fail if email service is not configured)
      try {
        console.log('Attempting to send invitation email...');
        const emailResponse = await fetch('/api/send-invitation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: inviteEmail.trim(),
            role: inviteRole,
            companyName: companyName || user.company,
            inviterName: user.name || user.email,
            invitationToken: invitation.invitation_token
          })
        });

        const emailResult = await emailResponse.json();
        console.log('Email API response:', emailResult);
        
        if (emailResponse.ok) {
          console.log('Email sent successfully');
          // Show different messages based on email service
          if (emailResult.previewUrl) {
            setSuccess(`✅ Invitation created! Preview: ${emailResult.previewUrl}`);
          } else if (emailResult.messageId) {
            setSuccess(`✅ Invitation email sent to ${inviteEmail}!`);
          } else {
            setSuccess(`✅ Invitation sent to ${inviteEmail}!`);
          }
          
          // Show invitation link in console for testing
          if (emailResult.invitationLink) {
            console.log('🔗 Invitation link (for testing):', emailResult.invitationLink);
          }
        } else {
          console.warn('Email sending failed, but invitation was created:', emailResult.error);
          setSuccess(`✅ Invitation created for ${inviteEmail}! (Email service not configured - check console for invitation link)`);
          console.log('🔗 Invitation link (copy to test):', `${window.location.origin}/auth/accept-invitation?token=${invitation.invitation_token}`);
        }
      } catch (emailError: any) {
        console.warn('Email sending failed, but invitation was created:', emailError.message);
        setSuccess(`✅ Invitation created for ${inviteEmail}! (Email service not configured - check console for invitation link)`);
        console.log('🔗 Invitation link (copy to test):', `${window.location.origin}/auth/accept-invitation?token=${invitation.invitation_token}`);
      }
      
      // Reload pending invitations
      await loadPendingInvitations(effectiveCompanyId);
      
      setShowInviteDialog(false);
      setInviteEmail('');
      setInviteRole('viewer');
      
      setTimeout(() => setSuccess(null), 8000);
      
    } catch (e: any) {
      console.error('Invitation error:', e);
      setError(`❌ Failed to invite member: ${e?.message}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setInviteLoading(false);
    }
  };

  // Remove team member
  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!window.confirm(`Are you sure you want to remove ${memberEmail} from the team?`)) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      // Reload team members
      if (effectiveCompanyId) {
        await loadTeamMembers(effectiveCompanyId);
      }
      
      setSuccess(`✅ ${memberEmail} removed from team`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(`❌ Failed to remove member: ${e?.message}`);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleSave = async () => {
    let cid = effectiveCompanyId || user?.company_id;
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Validate required fields (company name is read-only, loaded from companies table)
      if (!industry.trim()) {
        throw new Error('Industry is required');
      }

      // Get current user
      const { data: authData } = await supabase.auth.getUser();
      const authUserId = authData?.user?.id;
      if (!authUserId) throw new Error('User not authenticated');

      // Get current company name from companies table (don't use state as it's read-only)
      let currentCompanyName = companyName;
      if (cid) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('name')
          .eq('id', cid)
          .maybeSingle();
        if (companyData?.name) {
          currentCompanyName = companyData.name;
        }
      }

      console.log('Saving company branding data:', { industry, companyLogo, companyName: currentCompanyName });

      if (!cid) {
        // If no company exists, user should create it in Settings first
        throw new Error('Please create a company in Settings first');
      }

      // Save all data to company_branding table (excluding company name which is in companies table)
      console.log('Saving branding data to company_branding...');
      const { data: savedData, error: brandingError } = await supabase.rpc('upsert_company_branding', {
        p_company_id: cid,
        p_company_name: currentCompanyName, // Use from companies table, not editable
        p_industry: industry.trim(),
        p_logo_url: companyLogo,
        p_welcome_message: welcomeMessage,
        p_primary_color: primaryColor,
        p_secondary_color: secondaryColor,
        p_background_color: backgroundColor,
      });
      
      if (brandingError) {
        console.error('Branding save error:', brandingError);
        console.error('Branding error details:', JSON.stringify(brandingError, null, 2));
        throw new Error(brandingError.message || brandingError.details || 'Failed to save branding data');
      }
      
      console.log('All data saved successfully:', savedData);
      setSuccess(`✅ Industry "${industry}" and branding saved successfully!`);
      
      // Reload company name from companies table to ensure it's up to date
      if (cid) {
        const { data: updatedCompanyData } = await supabase
          .from('companies')
          .select('name')
          .eq('id', cid)
          .maybeSingle();
        if (updatedCompanyData?.name) {
          setCompanyName(updatedCompanyData.name);
          currentCompanyName = updatedCompanyData.name;
        }
      }
      
      // Update auth user metadata with company info
      const { data: currentAuthData } = await supabase.auth.getUser();
      if (currentAuthData?.user) {
        await supabase.auth.updateUser({
          data: {
            company_name: currentCompanyName,
            company_id: cid
          }
        });
        console.log('✅ Updated user metadata with company info');
      }
      
      // Broadcast company name update to other components
      updateBrandingCache(currentCompanyName, companyLogo, cid);
      
      // Trigger global refresh
      window.dispatchEvent(new Event('refresh'));
      
      // Force reload after save to update all components
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
      // Clear success message after 4 seconds
      setTimeout(() => setSuccess(null), 4000);
      
    } catch (e: any) {
      console.error('Save error:', e);
      console.error('Save error details:', JSON.stringify(e, null, 2));
      console.error('Error type:', typeof e);
      console.error('Error constructor:', e?.constructor?.name);
      
      let errorMessage = 'Save failed';
      if (e?.message) {
        errorMessage = e.message;
      } else if (e?.details) {
        errorMessage = e.details;
      } else if (e?.error) {
        errorMessage = e.error;
      } else if (typeof e === 'string') {
        errorMessage = e;
      }
      
      setError(`❌ ${errorMessage}`);
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!file) return;
    setError(null);
    setSuccess(null);
    
    try {
      // Validate file size (2MB limit)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('File size must be less than 2MB');
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file');
      }

      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/upload-logo', { method: 'POST', body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      
      console.log('Logo uploaded successfully:', json.url);
      setCompanyLogo(json.url);

      if (!effectiveCompanyId) {
        setSuccess('🎉 Logo uploaded! Save the company first to store it in your account.');
        setTimeout(() => setSuccess(null), 4000);
        return;
      }

      const brandingPayload = {
        company_id: effectiveCompanyId,
        company_name: (companyName || '').trim() || null,
        industry: (industry || '').trim() || null,
        logo_url: json.url,
        welcome_message: welcomeMessage || null,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        background_color: backgroundColor
      };

      const { error: brandingSaveError } = await supabase
        .from('company_branding')
        .upsert(brandingPayload, { onConflict: 'company_id' });

      if (brandingSaveError) {
        console.error('Failed to persist logo in company_branding:', brandingSaveError);
        setError(`❌ Logo uploaded but could not be saved to database: ${brandingSaveError.message}`);
        setTimeout(() => setError(null), 5000);
        return;
      }
      
      updateBrandingCache(companyName, json.url, effectiveCompanyId);

      setSuccess('🎉 Logo uploaded and saved to your company profile!');
      setTimeout(() => setSuccess(null), 4000);
      
    } catch (e: any) {
      console.error('Logo upload error:', e);
      setError(`❌ ${e?.message || 'Logo upload failed'}`);
      setTimeout(() => setError(null), 5000);
    }
  };

  // Delete invitation
  const handleDeleteInvitation = async (invitationId: string, email: string) => {
    if (!window.confirm(`Are you sure you want to cancel the invitation for ${email}?`)) return;
    
    try {
      const { error } = await supabase
        .from('team_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      // Reload pending invitations
      if (effectiveCompanyId) {
        await loadPendingInvitations(effectiveCompanyId);
      }
      
      setSuccess(`✅ Invitation for ${email} cancelled`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(`❌ Failed to cancel invitation: ${e?.message}`);
      setTimeout(() => setError(null), 5000);
    }
  };

  // Resend invitation
  const handleResendInvitation = async (invitation: any) => {
    try {
      // Send invitation email again
      const emailResponse = await fetch('/api/send-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: invitation.email,
          role: invitation.role,
          companyName: companyName || user.company,
          inviterName: user.name || user.email,
          invitationToken: invitation.invitation_token
        })
      });

      const emailResult = await emailResponse.json();
      
      if (!emailResponse.ok) {
        throw new Error(emailResult.error || 'Failed to resend invitation');
      }

      setSuccess(`✅ Invitation resent to ${invitation.email}!`);
      setTimeout(() => setSuccess(null), 3000);
      
      // Show invitation link in console
      if (emailResult.invitationLink) {
        console.log('🔗 Resent invitation link:', emailResult.invitationLink);
      }
      
    } catch (e: any) {
      setError(`❌ Failed to resend invitation: ${e?.message}`);
      setTimeout(() => setError(null), 5000);
    }
  };

  // Update team member role
  const handleUpdateMemberRole = async () => {
    if (!editingMember || !newRole) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', editingMember.id);

      if (error) throw error;

      // Reload team members
      if (effectiveCompanyId) {
        await loadTeamMembers(effectiveCompanyId);
      }
      
      setEditingMember(null);
      setNewRole('');
      setSuccess(`✅ ${editingMember.email} role updated to ${newRole.replace('_', ' ')}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(`❌ Failed to update member role: ${e?.message}`);
      setTimeout(() => setError(null), 5000);
    }
  };


  // Don't show loading spinner - let the blue progress line handle it

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Company Profile & Branding</h1>
        <p className="text-muted-foreground">Customize your company branding and manage team access.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Branding */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Branding</CardTitle>
              <CardDescription>Upload your logo and customize brand elements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div>
                <Label className="text-base">Company Logo</Label>
                <div className="flex items-center gap-4 mt-2">
                  <div className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden">
                    <img src={companyLogo} alt="Company Logo" className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-2">
                    <Button size="sm" className="gap-2" asChild>
                      <label htmlFor="logo-upload" className="cursor-pointer">
                      <Upload className="h-4 w-4" />
                      Upload New Logo
                      </label>
                    </Button>
                    <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload(file);
                    }} />
                    <p className="text-sm text-muted-foreground">PNG, JPG up to 2MB. Recommended: 200x200px</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Company Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input 
                    id="company-name" 
                    value={companyName} 
                    disabled
                    readOnly
                    className="mt-1 bg-gray-50 cursor-not-allowed" 
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Company name can only be edited in <a href="/settings" className="text-blue-600 hover:underline font-medium">Settings</a>
                  </p>
                </div>
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} className="mt-1" />
                </div>
              </div>

              <div>
                <Label htmlFor="welcome-message">Welcome Message</Label>
                <Textarea 
                  id="welcome-message" 
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  className="mt-1"
                  placeholder="This message will appear when candidates start their interview"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  This greeting will be shown to candidates before their AI interview begins
                </p>
              </div>

              <Separator />

              {/* Brand Colors */}
              <div>
                <Label className="text-base">Brand Colors</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-8 h-8 rounded-full border-2 border-white shadow-sm" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Primary</p>
                      <p className="text-xs text-muted-foreground">Buttons, links, highlights</p>
                      <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="font-mono h-8" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-8 h-8 rounded-full border-2 border-white shadow-sm" />
                      <div className="flex-1">
                      <p className="text-sm font-medium">Secondary</p>
                      <p className="text-xs text-muted-foreground">Accent elements</p>
                      <Input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="font-mono h-8" />
                    </div>
                      </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="w-8 h-8 rounded-full border-2 border-white shadow-sm" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Background</p>
                      <p className="text-xs text-muted-foreground">Page backgrounds</p>
                      <Input value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="font-mono h-8" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    // Create a preview modal or open in new window
                    const previewWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
                    if (previewWindow) {
                      previewWindow.document.write(`
                        <!DOCTYPE html>
                        <html lang="en">
                        <head>
                          <meta charset="UTF-8">
                          <meta name="viewport" content="width=device-width, initial-scale=1.0">
                          <title>Interview Preview - ${companyName}</title>
                          <script src="https://cdn.tailwindcss.com"></script>
                          <style>
                            body { margin: 0; padding: 0; }
                            .preview-container { 
                              background: ${backgroundColor}; 
                              min-height: 100vh; 
                              display: flex; 
                              align-items: center; 
                              justify-content: center; 
                              font-family: system-ui, -apple-system, sans-serif;
                            }
                            .preview-card {
                              background: white;
                              border-radius: 12px;
                              box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                              padding: 2rem;
                              text-align: center;
                              max-width: 500px;
                              width: 90%;
                            }
                            .preview-button {
                              background: ${primaryColor};
                              color: white;
                              border: none;
                              padding: 12px 24px;
                              border-radius: 8px;
                              font-size: 16px;
                              font-weight: 600;
                              cursor: pointer;
                              transition: all 0.2s;
                            }
                            .preview-button:hover {
                              opacity: 0.9;
                              transform: translateY(-1px);
                            }
                            .preview-accent {
                              color: ${secondaryColor};
                            }
                          </style>
                        </head>
                        <body>
                          <div class="preview-container">
                            <div class="preview-card">
                              <img src="${companyLogo}" alt="Company Logo" style="width: 80px; height: 80px; margin: 0 auto 1.5rem; border-radius: 8px; object-fit: cover;" />
                              <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 0.5rem; color: #1f2937;">${companyName}</h1>
                              <p style="color: #6b7280; margin-bottom: 2rem;">AI Interview Session</p>
                              <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem;">
                                <p style="color: #374151; line-height: 1.6;">${welcomeMessage}</p>
                              </div>
                              <button class="preview-button" onclick="alert('This is a preview. In the actual interview, this would start the AI interview session.')">
                                Start Interview
                              </button>
                              <p style="color: #9ca3af; font-size: 14px; margin-top: 1rem;">
                                Preview Mode - This is how candidates will see your interview page
                              </p>
                            </div>
                          </div>
                        </body>
                        </html>
                      `);
                      previewWindow.document.close();
                    }
                  }}
                >
                  Preview Interview Page
                </Button>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}
            </CardContent>
          </Card>

          {/* Team Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Management ({teamMembers.length} members)
                </span>
                <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                  <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Invite Member
                </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Team Member</DialogTitle>
                      <DialogDescription>
                        Send an invitation to join your company team
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <Label htmlFor="invite-email">Email Address</Label>
                        <Input
                          id="invite-email"
                          type="email"
                          placeholder="colleague@example.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="invite-role">Role</Label>
                        <Select value={inviteRole} onValueChange={setInviteRole}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="hr_manager">HR Manager</SelectItem>
                            <SelectItem value="recruiter">Recruiter</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-3 pt-4">
                        <Button 
                          onClick={handleInviteMember} 
                          disabled={inviteLoading || !inviteEmail.trim()}
                          className="flex-1"
                        >
                          {inviteLoading ? 'Sending...' : 'Send Invitation'}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setShowInviteDialog(false);
                            setInviteEmail('');
                            setInviteRole('viewer');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                      
                      {/* Debug info */}
                      <div className="text-xs text-muted-foreground pt-2">
                        Company ID: {effectiveCompanyId || 'Not set'}
                        <br />
                        User ID: {user?.id || 'Not set'}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
              <CardDescription>Manage team members and their access levels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamMembers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No team members found</p>
                    <p className="text-sm">Invite your first team member to get started</p>
                  </div>
                ) : (
                  teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <Avatar>
                        <AvatarFallback>
                          {member.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 
                           member.email?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                          <p className="font-medium">{member.full_name || member.email}</p>
                          {member.role === 'admin' && <Crown className="h-4 w-4 text-yellow-600" />}
                          {member.id === user?.id && <Badge variant="outline" className="text-xs">You</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                          <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                            {member.role.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </Badge>
                          <Badge variant="secondary">
                            Active
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       {/* Edit role button for non-admins and not self, only if current user is admin */}
                       {member.role !== 'admin' && member.id !== user?.id && user?.role === 'admin' && (
                         <Button 
                           size="sm" 
                           variant="outline"
                           onClick={() => {
                             setEditingMember(member);
                             setNewRole(member.role);
                           }}
                           title="Edit role"
                         >
                           <User className="h-4 w-4" />
                      </Button>
                       )}
                       {/* Remove button for non-admins and not self, only if current user is admin */}
                       {member.role !== 'admin' && member.id !== user?.id && user?.role === 'admin' && (
                         <Button 
                           size="sm" 
                           variant="outline"
                           onClick={() => handleRemoveMember(member.id, member.email)}
                           title="Remove member"
                         >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                       )}
                     </div>
                    </div>
                  ))
                )}

                {/* Pending Invitations Section */}
                {pendingInvitations.length > 0 && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Pending Invitations ({pendingInvitations.length})
                      </h4>
                      <div className="space-y-3">
                        {pendingInvitations.map((invitation) => (
                          <div key={invitation.id} className="flex items-center gap-4 p-3 border rounded-lg bg-muted/20">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {invitation.email.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{invitation.email}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {invitation.role.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  Pending
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-xs text-muted-foreground">
                                Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                              </div>
                              {/* Admin can resend and delete invitations */}
                              {user?.role === 'admin' && (
                                <div className="flex gap-1">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 px-2 text-blue-600 hover:text-blue-800"
                                    onClick={() => handleResendInvitation(invitation)}
                                    title="Resend invitation"
                                  >
                                    📧
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 px-2 text-red-600 hover:text-red-800"
                                    onClick={() => handleDeleteInvitation(invitation.id, invitation.email)}
                                    title="Cancel invitation"
                                  >
                                    ✕
                                  </Button>
                                </div>
                      )}
                    </div>
                  </div>
                ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Edit Member Role Dialog */}
          {editingMember && (
            <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Team Member Role</DialogTitle>
                  <DialogDescription>
                    Update role for {editingMember.email}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label htmlFor="new-role">New Role</Label>
                    <Select value={newRole} onValueChange={setNewRole}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="hr_manager">HR Manager</SelectItem>
                        <SelectItem value="recruiter">Recruiter</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button 
                      onClick={handleUpdateMemberRole} 
                      disabled={!newRole || newRole === editingMember.role}
                      className="flex-1"
                    >
                      Update Role
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditingMember(null);
                        setNewRole('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Interview Page Preview</CardTitle>
              <CardDescription>How candidates will see your branding</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 bg-muted/20">
                <div className="text-center space-y-4">
                  <img src={companyLogo} alt="Company Logo" className="w-16 h-16 mx-auto rounded-lg" />
                  <div>
                    <h3 className="font-semibold">{companyName || user.company}</h3>
                    <p className="text-sm text-muted-foreground">AI Interview Session</p>
                  </div>
                  <div className="p-3 bg-background rounded-lg border">
                    <p className="text-sm">{welcomeMessage}</p>
                  </div>
                  <Button size="sm" disabled>Start Interview</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Branding Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <p>Logo appears on interview welcome screen and reports</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <p>Welcome message personalizes candidate experience</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <p>Brand colors maintain consistency across platform</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <p>Team members can have different access levels</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
