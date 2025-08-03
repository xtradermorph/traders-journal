import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types/user';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface UserProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  isOnline: boolean;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

const usernameSchema = z.object({
  username: z.string().min(6, 'Username must be at least 6 characters'),
});

export const UserProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setProfile(null);
        setIsOnline(false);
        setLoading(false);
        return;
      }
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      // Fetch presence
      const { data: presenceData, error: presenceError } = await supabase
        .from('user_presence')
        .select('status, last_seen_at')
        .eq('user_id', session.user.id)
        .single();
      if (profileError || presenceError) {
        setProfile(null);
        setIsOnline(false);
      } else {
        setProfile(profileData);
        // Online if status is ONLINE and last_seen_at within 15 minutes
        const lastActive = presenceData?.last_seen_at ? new Date(presenceData.last_seen_at).getTime() : 0;
        setIsOnline(presenceData?.status === 'ONLINE' && (Date.now() - lastActive < 15 * 60 * 1000));
      }
    } catch {
      setProfile(null);
      setIsOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    // Listen for profile-updated event
    const handler = () => fetchProfile();
    window.addEventListener('profile-updated', handler);

    let intervalId: NodeJS.Timeout | null = null;
    let isTabActive = true;

    const updateOnlineStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        await supabase.from('user_presence').update({ status: 'ONLINE', last_seen_at: new Date().toISOString() }).eq('user_id', session.user.id);
      } catch {
        // Ignore errors
      }
    };

    const startInterval = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        if (isTabActive) updateOnlineStatus();
      }, 2 * 60 * 1000); // 2 minutes
    };

    const stopInterval = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = null;
    };

    // Initial online status update
    updateOnlineStatus();
    startInterval();

    // Handle tab visibility
    const handleVisibility = () => {
      isTabActive = !document.hidden;
      if (isTabActive) {
        fetchProfile();
        updateOnlineStatus();
        startInterval();
      } else {
        stopInterval();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Set offline on unload
    const handleUnload = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        await supabase.from('user_presence').update({ status: 'OFFLINE' }).eq('user_id', session.user.id);
      } catch {}
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('profile-updated', handler);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
      stopInterval();
    };
  }, [fetchProfile]);

  useEffect(() => {
    if (!loading && profile && (!profile.username || profile.username.trim().length < 6)) {
      setShowUsernameModal(true);
    } else {
      setShowUsernameModal(false);
    }
  }, [loading, profile]);

  // Username form
  const usernameForm = useForm({
    resolver: zodResolver(usernameSchema),
    defaultValues: { username: '' },
  });

  const handleUsernameSubmit = async (values: { username: string }) => {
    setSubmitting(true);
    try {
      // Check uniqueness
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', values.username)
        .maybeSingle();
      if (existing) {
        usernameForm.setError('username', { message: 'Username is already taken' });
        setSubmitting(false);
        return;
      }
      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({ username: values.username })
        .eq('id', profile?.id)
        .select()
        .single();
      if (error) {
        usernameForm.setError('username', { message: error.message });
        setSubmitting(false);
        return;
      }
      toast.success('Username set successfully! Please log in again.');
      setShowUsernameModal(false);
      await supabase.auth.signOut();
      router.push('/login');
    } catch {
      usernameForm.setError('username', { message: 'Unexpected error. Try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    // Listen for auth state changes and refetch profile
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      fetchProfile();
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  return (
    <UserProfileContext.Provider value={{ profile, loading, refreshProfile: fetchProfile, isOnline }}>
      {children}
      <Dialog open={showUsernameModal}>
        <DialogContent className="sm:max-w-[425px] bg-card">
          <DialogHeader>
            <DialogTitle>Choose a Username</DialogTitle>
            <DialogDescription>
              To complete your registration, please choose a unique username (at least 6 characters).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={usernameForm.handleSubmit(handleUsernameSubmit)} className="space-y-4">
            <Input
              {...usernameForm.register('username')}
              placeholder="Enter username"
              disabled={submitting}
              autoFocus
            />
            {usernameForm.formState.errors.username && (
              <div className="text-red-500 text-sm">{usernameForm.formState.errors.username.message}</div>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Username'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error('useUserProfile must be used within a UserProfileProvider');
  return ctx;
}; 