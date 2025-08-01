'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState } from 'react';

function useIsAuthenticatedOrFromLanding() {
  const [backUrl, setBackUrl] = useState<string>("/dashboard");
  useEffect(() => {
    let fromLanding = false;
    try {
      fromLanding = sessionStorage.getItem('fromLanding') === 'true';
      if (fromLanding) sessionStorage.removeItem('fromLanding');
    } catch {}
    if (fromLanding) {
      setBackUrl("/");
      return;
    }
    const supabase = createClientComponentClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setBackUrl(session ? "/dashboard" : "/");
    });
  }, []);
  return backUrl;
}

export default function TermsPage() {
  const backUrl = useIsAuthenticatedOrFromLanding();
  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(false); }, []);
  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-background to-muted/40 original-dark">
      <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-0 pointer-events-none" />
      <div className="relative w-full max-w-4xl mx-auto bg-card rounded-2xl shadow-2xl border border-border p-4 md:p-10 my-8 z-10">
        <div className="py-0 px-0">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-start mb-6">
              {loading ? (
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/20 opacity-50">
                  <div className="relative flex items-center justify-center rounded-full bg-orange-500/10 p-2.5">
                    <ArrowLeft className="h-7 w-7 text-orange-600 dark:text-orange-400 animate-pulse" />
                  </div>
                </div>
              ) : (
                <Link 
                  href={backUrl}
                  className="inline-flex items-center justify-center h-12 w-12 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-colors"
                >
                  <div className="relative flex items-center justify-center rounded-full bg-orange-500/10 p-2.5">
                    <ArrowLeft className="h-7 w-7 text-orange-600 dark:text-orange-400" />
                  </div>
                </Link>
              )}
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">Terms of Service</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Terms and conditions for using Trader's Journal
            </p>
          </div>

          {/* Content */}
          <div className="bg-card rounded-2xl p-8 border border-border">
            <p className="text-muted-foreground mb-6">
              By using Trader's Journal, you agree to these terms of service. Please read them carefully.
            </p>
            
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Acceptance of Terms</h2>
            <p className="text-muted-foreground mb-6">
              By accessing and using Trader's Journal, you accept and agree to be bound by the terms and provision of this agreement.
            </p>
            
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Use License</h2>
            <p className="text-muted-foreground mb-6">
              Permission is granted to temporarily use Trader's Journal for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.
            </p>
            
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">User Responsibilities</h2>
            <ul className="list-disc ml-6 mb-6 text-muted-foreground space-y-2">
              <li>You are responsible for maintaining the confidentiality of your account</li>
              <li>You must not use the service for any unlawful purpose</li>
              <li>You are responsible for all activities that occur under your account</li>
              <li>You must provide accurate and complete information</li>
            </ul>
            
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">AI Analysis Disclaimer</h2>
            <p className="text-muted-foreground mb-6">
              Our AI-powered analysis tools are provided for informational purposes only. They do not constitute financial advice, investment recommendations, or trading signals. All trading decisions are your sole responsibility. We are not liable for any financial losses resulting from the use of our AI features.
            </p>
            
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Limitation of Liability</h2>
            <p className="text-muted-foreground mb-6">
              Trader's Journal shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
            </p>
            
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Termination</h2>
            <p className="text-muted-foreground mb-6">
              We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
            </p>
            
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Changes to Terms</h2>
            <p className="text-muted-foreground mb-6">
              We reserve the right to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days notice prior to any new terms taking effect.
            </p>
            
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Contact Information</h2>
            <p className="text-muted-foreground">
              If you have any questions about these Terms, please contact us at <a href="mailto:support@tradersjournal.pro" className="text-primary underline hover:text-primary/80">support@tradersjournal.pro</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 