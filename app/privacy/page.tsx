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

export default function PrivacyPage() {
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
          <h1 className="text-4xl font-bold text-foreground mb-4">Privacy Policy</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            How we collect, use, and protect your personal information
          </p>
        </div>

        {/* Content */}
        <div className="bg-card rounded-2xl p-8 border border-border">
          <p className="text-muted-foreground mb-6">
            At Trader&apos;s Journal, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Information We Collect</h2>
          
          <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Personal Information</h3>
          <p className="text-muted-foreground mb-4">
            We collect information you provide directly to us, such as when you create an account, update your profile, or contact us for support. This may include:
          </p>
          <ul className="list-disc ml-6 mb-6 text-muted-foreground space-y-2">
            <li>Name and email address</li>
            <li>Username and profile information</li>
            <li>Trading preferences and settings</li>
            <li>Communication history with our support team</li>
          </ul>
          
          <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Trading Data</h3>
          <p className="text-muted-foreground mb-4">
            We collect and store your trading data, including:
          </p>
          <ul className="list-disc ml-6 mb-6 text-muted-foreground space-y-2">
            <li>Trade entries and exits</li>
            <li>Profit and loss information</li>
            <li>Trading strategies and notes</li>
            <li>Performance analytics</li>
          </ul>
          
          <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Usage Information</h3>
          <p className="text-muted-foreground mb-4">
            We automatically collect certain information about your use of our platform, including:
          </p>
          <ul className="list-disc ml-6 mb-6 text-muted-foreground space-y-2">
            <li>IP address and device information</li>
            <li>Browser type and version</li>
            <li>Pages visited and features used</li>
            <li>Time spent on the platform</li>
          </ul>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">How We Use Your Information</h2>
          <p className="text-muted-foreground mb-6">
            We use the information we collect to:
          </p>
          <ul className="list-disc ml-6 mb-6 text-muted-foreground space-y-2">
            <li>Provide and maintain our trading journal platform</li>
            <li>Process your trades and generate analytics</li>
            <li>Personalize your experience and improve our services</li>
            <li>Communicate with you about your account and our services</li>
            <li>Ensure the security and integrity of our platform</li>
            <li>Comply with legal obligations</li>
          </ul>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Information Sharing</h2>
          <p className="text-muted-foreground mb-6">
            We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except in the following circumstances:
          </p>
          <ul className="list-disc ml-6 mb-6 text-muted-foreground space-y-2">
            <li><strong>Service Providers:</strong> We may share information with trusted third-party service providers who assist us in operating our platform</li>
            <li><strong>Legal Requirements:</strong> We may disclose information if required by law or to protect our rights and safety</li>
            <li><strong>Business Transfers:</strong> In the event of a merger or acquisition, your information may be transferred as part of the business assets</li>
          </ul>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Data Security</h2>
          <p className="text-muted-foreground mb-6">
            We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
          </p>
          <ul className="list-disc ml-6 mb-6 text-muted-foreground space-y-2">
            <li>Encryption of data in transit and at rest</li>
            <li>Regular security assessments and updates</li>
            <li>Access controls and authentication measures</li>
            <li>Secure hosting and infrastructure</li>
          </ul>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Your Rights</h2>
          <p className="text-muted-foreground mb-6">
            You have the right to:
          </p>
          <ul className="list-disc ml-6 mb-6 text-muted-foreground space-y-2">
            <li>Access and review your personal information</li>
            <li>Update or correct inaccurate information</li>
            <li>Request deletion of your personal information</li>
            <li>Opt out of certain communications</li>
            <li>Export your data in a portable format</li>
          </ul>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Cookies and Tracking</h2>
          <p className="text-muted-foreground mb-6">
            We use cookies and similar technologies to enhance your experience on our platform. For more information about how we use cookies, please see our Cookies Policy.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Data Retention</h2>
          <p className="text-muted-foreground mb-6">
            We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this Privacy Policy. We may retain certain information for longer periods to comply with legal obligations or resolve disputes.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Children&apos;s Privacy</h2>
          <p className="text-muted-foreground mb-6">
            Our platform is not intended for children under the age of 18. We do not knowingly collect personal information from children under 18. If you believe we have collected information from a child under 18, please contact us immediately.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">International Transfers</h2>
          <p className="text-muted-foreground mb-6">
            Your information may be transferred to and processed in countries other than your own. We ensure that such transfers comply with applicable data protection laws and implement appropriate safeguards to protect your information.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Changes to This Policy</h2>
          <p className="text-muted-foreground mb-6">
            We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the &quot;Last Updated&quot; date.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Contact Us</h2>
          <p className="text-muted-foreground mb-6">
            If you have any questions about this Privacy Policy or our privacy practices, please contact us through our support channels.
          </p>
          
          <p className="text-sm text-muted-foreground mt-8">
            Last Updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
} 