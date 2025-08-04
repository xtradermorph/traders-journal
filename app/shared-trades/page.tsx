"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { PageHeader } from "@/components/PageHeader";
import SharedTradesContent from "@/components/SharedTradesContent";
import DashboardFooter from "@/components/DashboardFooter";
import { LoadingPage } from '../components/ui/loading-spinner';

export default function SharedTradesPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login?redirect=/shared-trades');
        return;
      }
      
      setLoading(false);
    };

    checkAuth();
  }, [router, supabase.auth]);

  if (loading) {
    return (
      <LoadingPage 
        title="Loading Shared Trades" 
        description="Fetching shared trades..." 
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Shared Trades"
        showBackButton
        backUrl="/dashboard"
      />
      <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-background to-muted/40">
        {/* Glassmorphism background overlay */}
        <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-0 pointer-events-none" />
        <div className="relative w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-6xl xl:max-w-7xl mx-auto bg-card/90 rounded-2xl shadow-2xl border border-border p-3 sm:p-4 md:p-6 lg:p-8 xl:p-12 my-4 sm:my-6 md:my-8 z-10 flex flex-col min-h-[80vh] max-h-[90vh]">
          <div className="flex-1 overflow-y-auto">
            <div className="container mx-auto py-3 sm:py-4 md:py-6 px-2 sm:px-4">
              <SharedTradesContent />
            </div>
          </div>
          <DashboardFooter />
        </div>
      </div>
    </>
  );
} 