"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { PageHeader } from "@/components/PageHeader";
import FriendsContent from '@/components/FriendsContent';
import DashboardFooter from '@/components/DashboardFooter';
import { Loader2 } from 'lucide-react';
import { LoadingPage } from '../components/ui/loading-spinner';

export default function FriendsPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login?redirect=/friends');
        return;
      }
      
      setLoading(false);
    };

    checkAuth();
  }, [router, supabase.auth]);

  if (loading) {
    return (
      <LoadingPage 
        title="Loading Friends" 
        description="Fetching your friends list..." 
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Friends"
        showBackButton
        backUrl="/dashboard"
      />
      <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-background to-muted/40">
        {/* Glassmorphism background overlay */}
        <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-0 pointer-events-none" />
        <div className="relative w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-4xl xl:max-w-5xl mx-auto bg-card/90 rounded-2xl shadow-2xl border border-border p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10 my-4 sm:my-6 md:my-8 z-10">
          <FriendsContent />
          <DashboardFooter />
        </div>
      </div>
    </>
  );
}
