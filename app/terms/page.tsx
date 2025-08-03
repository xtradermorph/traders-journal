"use client"

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

function useBackNavigation() {
  const [backUrl, setBackUrl] = useState<string>("/");
  
  useEffect(() => {
    const determineBackUrl = async () => {
      // Check if there's a previous page in browser history
      if (typeof window !== 'undefined' && window.history.length > 1) {
        // Check if we came from a specific page via sessionStorage
        const fromPage = sessionStorage.getItem('fromPage');
        if (fromPage) {
          sessionStorage.removeItem('fromPage');
          setBackUrl(fromPage);
          return;
        }
        
        // Check referrer to see where we came from
        const referrer = document.referrer;
        if (referrer) {
          const referrerUrl = new URL(referrer);
          const currentUrl = new URL(window.location.href);
          
          // If referrer is from the same domain
          if (referrerUrl.origin === currentUrl.origin) {
            const referrerPath = referrerUrl.pathname;
            
            // Don't go back to the same page or to auth pages
            if (referrerPath !== currentUrl.pathname && 
                !referrerPath.includes('/auth') && 
                !referrerPath.includes('/login') && 
                !referrerPath.includes('/register')) {
              setBackUrl(referrerPath);
              return;
            }
          }
        }
      }
      
      // Fallback: check if user is authenticated and default appropriately
      const supabase = createClientComponentClient();
      const { data: { session } } = await supabase.auth.getSession();
      setBackUrl(session ? "/dashboard" : "/");
    };
    
    determineBackUrl();
  }, []);
  
  return backUrl;
}

export default function TermsPage() {
  const backUrl = useBackNavigation();
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
          <h1 className="text-4xl font-bold text-foreground mb-4">Terms of Service</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Terms and conditions for using Trader&apos;s Journal
          </p>
        </div>

        {/* Content */}
        <div className="bg-card rounded-2xl p-8 border border-border">
          <p className="text-muted-foreground mb-6">
            By using Trader&apos;s Journal, you agree to these terms of service. Please read them carefully.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Acceptance of Terms</h2>
          <p className="text-muted-foreground mb-6">
            By accessing and using Trader&apos;s Journal, you accept and agree to be bound by the terms and provision of this agreement.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Use License</h2>
          <p className="text-muted-foreground mb-6">
            Permission is granted to temporarily use Trader&apos;s Journal for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">User Responsibilities</h2>
          <p className="text-muted-foreground mb-6">
            As a user of Trader&apos;s Journal, you agree to:
          </p>
          <ul className="list-disc ml-6 mb-6 text-muted-foreground space-y-2">
            <li>Provide accurate and complete information when creating your account</li>
            <li>Maintain the security of your account credentials</li>
            <li>Use the platform in compliance with applicable laws and regulations</li>
            <li>Not attempt to gain unauthorized access to the platform or other users&apos; accounts</li>
            <li>Not use the platform for any illegal or harmful purposes</li>
            <li>Respect the intellectual property rights of others</li>
          </ul>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Trading Disclaimer</h2>
          <p className="text-muted-foreground mb-6">
            Trader&apos;s Journal is a trading journal and analysis platform. We do not provide financial advice, investment recommendations, or trading signals. All trading decisions are your own responsibility, and you acknowledge that trading involves substantial risk of loss.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Data and Privacy</h2>
          <p className="text-muted-foreground mb-6">
            Your use of Trader&apos;s Journal is also governed by our Privacy Policy. By using our platform, you consent to the collection and use of your information as described in our Privacy Policy.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Intellectual Property</h2>
          <p className="text-muted-foreground mb-6">
            The content, features, and functionality of Trader&apos;s Journal are owned by us and are protected by international copyright, trademark, and other intellectual property laws.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">User Content</h2>
          <p className="text-muted-foreground mb-6">
            You retain ownership of any content you create on our platform. By posting content, you grant us a license to use, display, and distribute your content in connection with the platform.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Service Availability</h2>
          <p className="text-muted-foreground mb-6">
            We strive to maintain high availability of our platform, but we do not guarantee uninterrupted access. We may temporarily suspend or restrict access for maintenance, updates, or other operational reasons.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Account Termination</h2>
          <p className="text-muted-foreground mb-6">
            We reserve the right to terminate or suspend your account at any time for violations of these terms or for any other reason at our sole discretion. You may also terminate your account at any time.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Limitation of Liability</h2>
          <p className="text-muted-foreground mb-6">
            Trader&apos;s Journal shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Indemnification</h2>
          <p className="text-muted-foreground mb-6">
            You agree to indemnify and hold harmless Trader&apos;s Journal from any claims, damages, or expenses arising from your use of the platform or violation of these terms.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Governing Law</h2>
          <p className="text-muted-foreground mb-6">
            These terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Trader&apos;s Journal operates.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Changes to Terms</h2>
          <p className="text-muted-foreground mb-6">
            We reserve the right to modify these terms at any time. We will notify users of any material changes by posting the updated terms on this page.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Contact Information</h2>
          <p className="text-muted-foreground mb-6">
            If you have any questions about these Terms of Service, please contact us through our support channels.
          </p>
        </div>
      </div>
    </div>
  );
} 