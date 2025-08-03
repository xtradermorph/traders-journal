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

export default function DisclaimerPage() {
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
          <h1 className="text-4xl font-bold text-foreground mb-4">Disclaimer</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Important information about using Trader&apos;s Journal
          </p>
        </div>

        {/* Content */}
        <div className="bg-card rounded-2xl p-8 border border-border">
          <p className="text-muted-foreground mb-6">
            By using Trader&apos;s Journal, you acknowledge and agree to the following disclaimer. Please read it carefully before using our platform.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Trading Risk Disclaimer</h2>
          <p className="text-muted-foreground mb-6">
            Trading in financial markets involves substantial risk and may not be suitable for all investors. The value of investments can go down as well as up, and you may lose some or all of your invested capital. Past performance is not indicative of future results.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">No Investment Advice</h2>
          <p className="text-muted-foreground mb-6">
            Trader&apos;s Journal is a trading journal and analysis platform. We do not provide investment advice, financial advice, or trading recommendations. All content, tools, and features are for educational and informational purposes only.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">User Responsibility</h2>
          <p className="text-muted-foreground mb-6">
            You are solely responsible for your trading decisions and the outcomes of your trades. You should:
          </p>
          <ul className="list-disc ml-6 mb-6 text-muted-foreground space-y-2">
            <li>Conduct your own research and analysis</li>
            <li>Understand the risks involved in trading</li>
            <li>Only trade with capital you can afford to lose</li>
            <li>Consider seeking advice from qualified financial professionals</li>
            <li>Comply with all applicable laws and regulations</li>
          </ul>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Platform Limitations</h2>
          <p className="text-muted-foreground mb-6">
            While we strive to provide accurate and reliable information, we cannot guarantee:
          </p>
          <ul className="list-disc ml-6 mb-6 text-muted-foreground space-y-2">
            <li>The accuracy of market data or analysis tools</li>
            <li>Uninterrupted access to the platform</li>
            <li>The completeness of trading information</li>
            <li>That the platform will meet your specific needs</li>
          </ul>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Third-Party Content</h2>
          <p className="text-muted-foreground mb-6">
            Our platform may contain content from third-party sources, including other users. We do not endorse, verify, or take responsibility for the accuracy of such content. You should independently verify any information before making trading decisions.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Limitation of Liability</h2>
          <p className="text-muted-foreground mb-6">
            To the maximum extent permitted by law, Trader&apos;s Journal shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising from your use of the platform, including but not limited to trading losses, data loss, or service interruptions.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Jurisdiction</h2>
          <p className="text-muted-foreground mb-6">
            This disclaimer is governed by the laws of the jurisdiction in which Trader&apos;s Journal operates. If any provision of this disclaimer is found to be unenforceable, the remaining provisions will continue to be valid and enforceable.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Updates to Disclaimer</h2>
          <p className="text-muted-foreground mb-6">
            We may update this disclaimer from time to time. Continued use of the platform after changes constitutes acceptance of the updated disclaimer.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Contact Information</h2>
          <p className="text-muted-foreground mb-6">
            If you have questions about this disclaimer, please contact us through our support channels.
          </p>
        </div>
      </div>
    </div>
  );
} 