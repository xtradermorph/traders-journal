"use client"

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { X, Cookie, Shield, BarChart3, Settings } from 'lucide-react';
import Link from 'next/link';
import { CookiePreferences, getCookieConsent, updateCookieConsent } from '../lib/cookie-utils';

const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true, // Always true, can't be disabled
    analytics: false,
    functional: false
  });

  useEffect(() => {
    // Check if user has already made a choice
    const existingConsent = getCookieConsent();
    if (!existingConsent) {
      // Show banner after a short delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      essential: true,
      analytics: true,
      functional: true
    };
    setPreferences(allAccepted);
    saveConsent(allAccepted);
  };

  const handleAcceptEssential = () => {
    const essentialOnly: CookiePreferences = {
      essential: true,
      analytics: false,
      functional: false
    };
    setPreferences(essentialOnly);
    saveConsent(essentialOnly);
  };

  const handleSavePreferences = () => {
    saveConsent(preferences);
  };

  const saveConsent = (cookiePrefs: CookiePreferences) => {
    updateCookieConsent(cookiePrefs);
    setIsVisible(false);
    
    // Show feedback to user
    if (cookiePrefs.analytics) {
      console.log('✅ Analytics cookies enabled');
    } else {
      console.log('🚫 Analytics cookies disabled');
    }
    
    if (cookiePrefs.functional) {
      console.log('✅ Functional cookies enabled');
    } else {
      console.log('🚫 Functional cookies disabled');
    }
  };

  const handlePreferenceChange = (type: keyof CookiePreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [type]: value
    }));
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-500">
      <div className="bg-background/95 backdrop-blur-md border-t border-border shadow-2xl">
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          {!showDetails ? (
            // Simple view
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Cookie className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">
                    We use cookies to enhance your experience
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    We use cookies to provide essential functionality, analyze site usage, and personalize content.
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetails(true)}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Customize
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAcceptEssential}
                  className="flex items-center gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Essential Only
                </Button>
                <Button
                  size="sm"
                  onClick={handleAcceptAll}
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Accept All
                </Button>
              </div>
            </div>
          ) : (
            // Detailed view
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                  Cookie Preferences
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                {/* Essential Cookies */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-green-500" />
                    <div>
                      <h4 className="font-medium text-foreground">Essential Cookies</h4>
                      <p className="text-sm text-muted-foreground">
                        Required for the website to function properly
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Always Active</span>
                    <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    <div>
                      <h4 className="font-medium text-foreground">Analytics Cookies</h4>
                      <p className="text-sm text-muted-foreground">
                        Help us understand how visitors interact with our website
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) => handlePreferenceChange('analytics', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                  </label>
                </div>

                {/* Functional Cookies */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Settings className="h-5 w-5 text-purple-500" />
                    <div>
                      <h4 className="font-medium text-foreground">Functional Cookies</h4>
                      <p className="text-sm text-muted-foreground">
                        Enable enhanced functionality and personalization
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.functional}
                      onChange={(e) => handlePreferenceChange('functional', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                  </label>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Link 
                  href="/cookies" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Learn more about our cookie policy
                </Link>
                <div className="flex gap-2 ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAcceptEssential}
                  >
                    Essential Only
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSavePreferences}
                  >
                    Save Preferences
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
