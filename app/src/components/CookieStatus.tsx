"use client"

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { getCookieConsent, clearCookieConsent } from '../lib/cookie-utils';
import { Cookie, Shield, BarChart3, Settings, RefreshCw } from 'lucide-react';

const CookieStatus: React.FC = () => {
  const [consent, setConsent] = useState(getCookieConsent());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show status component after a delay for testing
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const refreshStatus = () => {
    setConsent(getCookieConsent());
  };

  const clearConsent = () => {
    clearCookieConsent();
    setConsent(null);
    // Reload page to show banner again
    window.location.reload();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-40 bg-background/95 backdrop-blur-md border border-border rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex items-center gap-2 mb-3">
        <Cookie className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Cookie Status</h3>
      </div>
      
      {consent ? (
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <Shield className="h-3 w-3 text-green-500" />
            <span>Essential: {consent.essential ? '✅' : '❌'}</span>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-3 w-3 text-blue-500" />
            <span>Analytics: {consent.analytics ? '✅' : '❌'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Settings className="h-3 w-3 text-purple-500" />
            <span>Functional: {consent.functional ? '✅' : '❌'}</span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No consent recorded</p>
      )}
      
      <div className="flex gap-2 mt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={refreshStatus}
          className="text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={clearConsent}
          className="text-xs"
        >
          Clear & Test
        </Button>
      </div>
    </div>
  );
};

export default CookieStatus;
