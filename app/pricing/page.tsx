import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Gift, Star, Users, MessageSquare } from 'lucide-react';

export default function PricingPage() {
  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-background to-muted/40 original-dark">
      <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-0 pointer-events-none" />
      <div className="relative w-full max-w-4xl mx-auto bg-card rounded-2xl shadow-2xl border border-border p-4 md:p-10 my-8 z-10">
        <div className="py-0 px-0">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-start mb-6">
              <Link 
                href="/" 
                className="inline-flex items-center justify-center h-12 w-12 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-colors"
              >
                <div className="relative flex items-center justify-center rounded-full bg-orange-500/10 p-2.5">
                  <ArrowLeft className="h-7 w-7 text-orange-600 dark:text-orange-400" />
                </div>
              </Link>
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">Pricing</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Currently free for all traders. Enjoy premium features while we build the future of trading journals.
            </p>
          </div>

          {/* Current Free Plan */}
          <div className="bg-card rounded-2xl p-8 border border-border mb-8">
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Gift className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Currently Free</h2>
              <p className="text-muted-foreground">Enjoy all features at no cost</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">What&apos;s Included:</h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-green-500" />
                    <span className="text-foreground">Unlimited trade recording</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-green-500" />
                    <span className="text-foreground">AI-powered analysis</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-green-500" />
                    <span className="text-foreground">Performance analytics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-green-500" />
                    <span className="text-foreground">Social trading features</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-green-500" />
                    <span className="text-foreground">Trade sharing & collaboration</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-green-500" />
                    <span className="text-foreground">Community access</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Future Plans:</h3>
                <p className="text-muted-foreground mb-4">
                  In the future, some premium features will be available only to subscribed users. 
                  We&apos;re committed to keeping the core functionality free while offering advanced 
                  analytics and exclusive features for power users.
                </p>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> Current users will be grandfathered into free access 
                    for existing features when we introduce premium tiers.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Section */}
          <div className="bg-card rounded-2xl p-8 border border-border text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Help Us Improve</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              We value your feedback! Share your experience with Trader&apos;s Journal and help us 
              understand how we can make it even better for traders like you.
            </p>
            <Link 
              href="/feedback" 
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              <Users className="h-4 w-4" />
              Share Your Feedback
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 