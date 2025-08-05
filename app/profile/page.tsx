'use client';

import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/supabase/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { ProfileContent } from '@/components/ProfileContent';
import { UserProfile } from '@/types/user';

import DashboardFooter from '@/components/DashboardFooter';
import { LoadingPage } from '../components/ui/loading-spinner';

export default function ProfilePage() {
  const router = useRouter();
  const [initialProfile, setInitialProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);


  useEffect(() => {
    const fetchSession = async () => {
      try {
        const session = await getSession();
        setSession(session);
        
        if (!session) {
          router.push('/login');
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile data:', profileError);
          setError('Failed to load profile data');
          return;
        }

        setInitialProfile(profileData);
      } catch (error) {
        console.error('Profile fetch error:', error);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [router]);

  if (loading) {
    return (
      <LoadingPage 
        title="Loading Profile" 
        description="Fetching your profile information..." 
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Profile" />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-red-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!initialProfile) {
    return (
      <div className="min-h-screen bg-background">
        {/* PageHeader will be moved outside the modal frame below */}
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-red-500">Profile data not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Profile" />
      <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-background to-muted/40">
        {/* Glassmorphism background overlay */}
        <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-0 pointer-events-none" />
        <div className="relative w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-4xl xl:max-w-5xl mx-auto bg-card/90 rounded-2xl shadow-2xl border border-border p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10 my-4 sm:my-6 md:my-8 z-10">
          <ProfileContent 
            initialProfile={initialProfile}
            onProfileUpdate={(updatedProfile: UserProfile) => setInitialProfile(updatedProfile)}
          />
          <DashboardFooter />
        </div>
      </div>
    </>
  );
}
