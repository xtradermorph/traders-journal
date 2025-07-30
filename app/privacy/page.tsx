'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState } from 'react';

function useIsAuthenticated() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  useEffect(() => {
    const supabase = createClientComponentClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });
  }, []);
  return isAuthenticated;
}

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

export default function PrivacyPage() {
  const backUrl = useIsAuthenticatedOrFromLanding();
  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(false); }, []);
  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-background to-muted/40 original-dark">
      <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-0 pointer-events-none" />
      <div className="relative w-full max-w-4xl mx-auto bg-card rounded-2xl shadow-2xl border border-border p-4 md:p-10 my-8 z-10">
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
          <h1 className="text-4xl font-bold text-foreground mb-4">Privacy Policy</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            How we protect and handle your personal information
          </p>
        </div>

        {/* Content */}
        <div className="bg-card rounded-2xl p-8 border border-border">
          <p className="text-muted-foreground mb-6">
            Trader's Journal ("we", "us", or "our") is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your information when you use our platform.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Information We Collect</h2>
          <ul className="list-disc ml-6 mb-6 text-muted-foreground space-y-2">
            <li>Account information (such as email, username, and profile details)</li>
            <li>Trade records and journal entries you create</li>
            <li>Usage analytics to improve our services</li>
          </ul>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">How We Use Your Data</h2>
          <ul className="list-disc ml-6 mb-6 text-muted-foreground space-y-2">
            <li>To provide and improve our trading journal features</li>
            <li>To offer AI-powered analysis and performance insights</li>
            <li>To communicate with you about updates or support</li>
          </ul>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">AI Analysis Disclaimer</h2>
          <p className="text-muted-foreground mb-6">
            Our platform uses AI tools for trade analysis and performance scoring. These tools are for informational and analytical purposes only. They do <strong>not</strong> provide financial advice, recommendations, or trading signals. All trading decisions are your own responsibility. We are not liable for any losses incurred as a result of using our AI features.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Data Security</h2>
          <p className="text-muted-foreground mb-6">
            Your data is stored securely and is never sold to third parties. You may request deletion of your account and data at any time.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Contact</h2>
          <p className="text-muted-foreground">
            If you have questions about this policy, contact us at <a href="mailto:support@tradersjournal.pro" className="text-primary underline hover:text-primary/80">support@tradersjournal.pro</a>.
          </p>
        </div>
      </div>
    </div>
  );
} 