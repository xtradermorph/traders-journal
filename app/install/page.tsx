'use client'

import { useEffect, useState, useCallback } from 'react';
import { DownloadIcon, Smartphone, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<unknown>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) {
      setInstallError('Installation prompt not available. Please try refreshing the page.');
      return;
    }

    setIsInstalling(true);
    setInstallError(null);

    try {
      // Show the browser's install prompt
      (deferredPrompt as any).prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await (deferredPrompt as any).userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
        setInstallError('Installation was cancelled. You can try again later.');
      }
    } catch (error) {
      console.error('Error during installation:', error);
      setInstallError('Installation failed. Please try again.');
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  useEffect(() => {
    // Check if mobile device
    const checkMobile = () => {
      const mobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
      setIsMobile(mobile);
    };
    checkMobile();

    // Check if already installed
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInApp = (window.navigator as unknown as Record<string, unknown>).standalone === true;
      setIsInstalled(isStandalone || isInApp);
    };
    checkIfInstalled();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: unknown) => {
      (e as Event).preventDefault();
      setDeferredPrompt(e);
    };

    // Listen for app installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstalling(false);
      setInstallError(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Auto-trigger installation on mobile after a short delay
    if (isMobile) {
      const timer = setTimeout(() => {
        if (deferredPrompt && !isInstalled) {
          handleInstall();
        }
      }, 1000);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isMobile, deferredPrompt, isInstalled, handleInstall]);

  const handleManualInstall = () => {
    // For browsers that don't support beforeinstallprompt
    if (isMobile) {
      // Show proper app installation instructions
      alert('To download the app:\n\nChrome/Edge: Tap the menu (⋮) → "Install app"\nSafari: Tap Share → "Add to Home Screen" (this installs the app)\n\nNote: This will download and install the app like a native app, not just add a shortcut.');
    } else {
      // Redirect to main site for desktop users
      window.location.href = '/';
    }
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">App Installed!</CardTitle>
            <CardDescription>
              Trader&apos;s Journal is now installed on your device.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = '/dashboard'}
              className="w-full"
            >
              Open App
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <DownloadIcon className="h-16 w-16 text-blue-500" />
          </div>
          <CardTitle className="text-2xl">Install Trader&apos;s Journal</CardTitle>
          <CardDescription>
            Get the app for a better experience with offline access and push notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {installError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <XCircle className="h-5 w-5 text-red-500" />
              <p className="text-sm text-red-700 dark:text-red-300">{installError}</p>
            </div>
          )}

          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="font-medium text-sm text-gray-900 dark:text-gray-100">Mobile App</p>
              <p className="text-xs text-gray-600 dark:text-gray-300">Download and install the native app</p>
            </div>
          </div>

          {deferredPrompt ? (
            <Button 
              onClick={handleInstall} 
              disabled={isInstalling}
              className="w-full"
            >
              {isInstalling ? 'Installing...' : 'Install Now'}
            </Button>
          ) : (
            <Button 
              onClick={handleManualInstall}
              variant="outline"
              className="w-full"
            >
              Download
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 