'use client'

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

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

export default function CookiesPage() {
  const backUrl = useIsAuthenticatedOrFromLanding();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    setLoading(false);
  }, []);

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
          <h1 className="text-4xl font-bold text-foreground mb-4">Cookies Policy</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            How we use cookies and similar technologies
          </p>
        </div>

        {/* Content */}
        <div className="bg-card rounded-2xl p-8 border border-border">
          <p className="text-muted-foreground mb-6">
            This Cookies Policy explains how Trader's Journal uses cookies and similar technologies to provide, customize, evaluate, improve, promote and protect our services.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">What Are Cookies?</h2>
          <p className="text-muted-foreground mb-6">
            Cookies are small text files that are stored on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and analyzing how you use our platform.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">How We Use Cookies</h2>
          <ul className="list-disc ml-6 mb-6 text-muted-foreground space-y-2">
            <li><strong>Essential Cookies:</strong> Required for the website to function properly</li>
            <li><strong>Authentication Cookies:</strong> To keep you logged in and secure</li>
            <li><strong>Preference Cookies:</strong> To remember your settings and preferences</li>
            <li><strong>Analytics Cookies:</strong> To understand how you use our platform</li>
            <li><strong>Performance Cookies:</strong> To improve website performance</li>
          </ul>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Types of Cookies We Use</h2>
          
          <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Session Cookies</h3>
          <p className="text-muted-foreground mb-4">
            These cookies are temporary and are deleted when you close your browser. They help maintain your session and security while using our platform.
          </p>
          
          <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Persistent Cookies</h3>
          <p className="text-muted-foreground mb-4">
            These cookies remain on your device for a set period or until you delete them. They remember your preferences and settings for future visits.
          </p>
          
          <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Third-Party Cookies</h3>
          <p className="text-muted-foreground mb-4">
            Some cookies are placed by third-party services we use, such as analytics providers. These help us understand how our platform is used and improve our services.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Managing Your Cookie Preferences</h2>
          <p className="text-muted-foreground mb-6">
            You can control and manage cookies in several ways. Please note that removing or blocking cookies may impact your user experience and some features may not function properly.
          </p>
          
          <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Browser Settings</h3>
          <p className="text-muted-foreground mb-4">
            Most browsers allow you to view, manage, delete, and block cookies. You can usually find these settings in the "Privacy" or "Security" section of your browser settings.
          </p>
          
          <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Opt-Out Options</h3>
          <p className="text-muted-foreground mb-6">
            You can opt out of certain types of cookies, particularly analytics cookies, through your browser settings or by using opt-out tools provided by third-party services.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Updates to This Policy</h2>
          <p className="text-muted-foreground mb-6">
            We may update this Cookies Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Contact Us</h2>
          <p className="text-muted-foreground">
            If you have any questions about our use of cookies, please contact us at <a href="mailto:support@tradersjournal.pro" className="text-primary underline hover:text-primary/80">support@tradersjournal.pro</a>.
          </p>
        </div>
      </div>
    </div>
  );
} 