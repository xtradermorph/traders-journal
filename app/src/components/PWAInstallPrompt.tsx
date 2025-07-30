'use client'

import { useState, useEffect } from "react";
import { DownloadIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const PWAInstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  useEffect(() => {
    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show our custom prompt
      setShowPrompt(true);
    });
    
    // Check if the app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowPrompt(false);
    }
    
    return () => {
      window.removeEventListener('beforeinstallprompt', () => {});
    };
  }, []);
  
  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    // Show the browser's install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    // We no longer need the prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };
  
  const dismissPrompt = () => {
    setShowPrompt(false);
  };
  
  if (!showPrompt) return null;
  
  return (
    <div className="fixed bottom-16 inset-x-0 px-4 lg:bottom-4 lg:right-4 lg:left-auto lg:w-80 z-10">
      <div className="bg-neutral text-white p-4 rounded-lg shadow-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <DownloadIcon className="h-5 w-5" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium">Install Trader's Journal</h3>
            <p className="mt-1 text-xs">Add to your home screen for quick access to your trading data.</p>
            <div className="mt-2 flex space-x-3">
              <Button 
                size="sm" 
                variant="secondary" 
                className="text-xs" 
                onClick={handleInstall}
              >
                Install
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                className="text-xs text-gray-300" 
                onClick={dismissPrompt}
              >
                Not now
              </Button>
            </div>
          </div>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-5 w-5 shrink-0 rounded-full" 
            onClick={dismissPrompt}
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
