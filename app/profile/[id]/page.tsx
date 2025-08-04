'use client';

import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { PublicProfileView } from '@/components/PublicProfileView';
import { UserProfile } from '@/types';

import { LoadingPage } from '../../components/ui/loading-spinner';

export default function TraderProfilePage() {
  const router = useRouter();
  const params = useParams();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const traderId = params?.id as string;
    
    if (!traderId) {
      setError('Invalid profile ID');
      setLoading(false);
      return;
    }

    const fetchTraderProfile = async () => {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', traderId)
          .single();

        if (profileError) {
          console.error('Error fetching trader profile data:', profileError);
          setError('Failed to load trader profile');
          return;
        }

        if (!profileData) {
          setError('Trader profile not found');
          return;
        }

        setProfile(profileData);
      } catch (error) {
        console.error('Trader profile fetch error:', error);
        setError('Failed to load trader profile');
      } finally {
        setLoading(false);
      }
    };

    fetchTraderProfile();
  }, [params?.id]);

  if (loading) {
    return (
      <LoadingPage 
        title="Loading Trader Profile" 
        description="Fetching trader information..." 
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Trader Profile" />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-red-500">{error}</p>
            <button 
              onClick={() => router.back()} 
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Trader Profile" />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-red-500">Profile not found</p>
            <button 
              onClick={() => router.back()} 
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-background to-muted/40">
      {/* Glassmorphism background overlay */}
      <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-0 pointer-events-none" />
      <div className="relative w-full max-w-4xl mx-auto bg-card/90 rounded-2xl shadow-2xl border border-border p-4 md:p-10 my-8 z-10">
        <PageHeader title={`${profile.username}'s Profile`} />
        <PublicProfileView profile={profile} isOpen={true} onClose={() => {}} />
      </div>
    </div>
  );
}
