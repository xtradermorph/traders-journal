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

export default function DisclaimerPage() {
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
          <h1 className="text-4xl font-bold text-foreground mb-4">Trading Disclaimer</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Important information about trading risks and our platform
          </p>
        </div>

        {/* Content */}
        <div className="bg-card rounded-2xl p-8 border border-border">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-red-800 mb-4">⚠️ Important Disclaimer</h2>
            <p className="text-red-700">
              Trading involves substantial risk of loss and is not suitable for all investors. The value of investments can go down as well as up, and you may lose some or all of your invested capital.
            </p>
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">No Financial Advice</h2>
          <p className="text-muted-foreground mb-6">
            Trader's Journal is a trading journal and analysis platform. We do not provide financial advice, investment recommendations, or trading signals. All content and tools are for informational and educational purposes only.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">AI Analysis Disclaimer</h2>
          <p className="text-muted-foreground mb-6">
            Our AI-powered analysis tools are designed to help you analyze your trading patterns and performance. These tools are for informational purposes only and should not be used as the sole basis for trading decisions. The AI analysis is not financial advice and does not guarantee future results.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Your Responsibility</h2>
          <ul className="list-disc ml-6 mb-6 text-muted-foreground space-y-2">
            <li>You are solely responsible for all trading decisions</li>
            <li>You should conduct your own research and analysis</li>
            <li>You should consider consulting with a licensed financial advisor</li>
            <li>You should only trade with money you can afford to lose</li>
            <li>You should understand the risks involved in trading</li>
          </ul>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Past Performance</h2>
          <p className="text-muted-foreground mb-6">
            Past performance is not indicative of future results. Historical data and analysis provided by our platform should not be interpreted as a guarantee of future performance.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Market Risks</h2>
          <p className="text-muted-foreground mb-6">
            Trading involves various risks including but not limited to market volatility, economic factors, political events, and technological issues. These risks can affect the value of your investments.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Limitation of Liability</h2>
          <p className="text-muted-foreground mb-6">
            Trader's Journal and its operators are not liable for any losses, damages, or expenses arising from the use of our platform or any trading decisions made based on our tools or analysis.
          </p>
          
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Seek Professional Advice</h2>
          <p className="text-muted-foreground">
            Before making any trading decisions, consider seeking advice from a qualified financial advisor who can assess your individual circumstances and provide personalized recommendations.
          </p>
        </div>
      </div>
    </div>
  );
} 