"use client";

import { PageHeader } from '../src/components/PageHeader';
import SocialForumContent from '../src/components/SocialForumContent';
import DashboardFooter from '../src/components/DashboardFooter';
import { useEffect, useState } from 'react';

export default function SocialForumClient() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  console.log('SocialForumPage component loading...');
  
  if (!isClient) {
    return (
      <>
        <PageHeader title="Social Forum" showBackButton backUrl="/dashboard" />
        <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-background to-muted/40">
          <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-0 pointer-events-none" />
          <div className="relative w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-6xl xl:max-w-7xl mx-auto bg-card/90 rounded-2xl shadow-2xl border border-border p-3 sm:p-4 md:p-6 lg:p-8 xl:p-12 my-4 sm:my-6 md:my-8 z-10 flex flex-col min-h-[80vh]">
            <div className="flex-1 overflow-y-auto">
              <div className="container mx-auto py-3 sm:py-4 md:py-6 px-2 sm:px-4">
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Loading Social Forum...</p>
                </div>
              </div>
            </div>
            <DashboardFooter />
          </div>
        </div>
      </>
    );
  }
  
  return (
    <>
      <PageHeader
        title="Social Forum"
        showBackButton
        backUrl="/dashboard"
      />
      <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-background to-muted/40">
        {/* Glassmorphism background overlay */}
        <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-0 pointer-events-none" />
        <div className="relative w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-6xl xl:max-w-7xl mx-auto bg-card/90 rounded-2xl shadow-2xl border border-border p-3 sm:p-4 md:p-6 lg:p-8 xl:p-12 my-4 sm:my-6 md:my-8 z-10 flex flex-col min-h-[80vh]">
          <div className="flex-1 overflow-y-auto">
            <div className="container mx-auto py-3 sm:py-4 md:py-6 px-2 sm:px-4">
              <SocialForumContent />
            </div>
          </div>
          <DashboardFooter />
        </div>
      </div>
    </>
  );
} 