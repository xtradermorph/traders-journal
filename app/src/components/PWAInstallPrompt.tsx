'use client'

import { useState, useEffect, useRef } from "react";
import { DownloadIcon, XIcon, Smartphone, Monitor, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import QRCode from 'qrcode';

interface PWAInstallPromptProps {
  onClose?: () => void;
}

const PWAInstallPrompt = ({ onClose }: PWAInstallPromptProps) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showManualPrompt, setShowManualPrompt] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    // Generate QR code for both desktop and mobile
    const generateQRCode = async () => {
      try {
        // Always use production URL for QR code
        const url = 'https://tradersjournal.pro/install';
        
        const dataUrl = await QRCode.toDataURL(url, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrCodeDataUrl(dataUrl);
      } catch (err) {
        console.error('Error generating QR code:', err);
      }
    };

    generateQRCode();

    // Check if mobile device
    const checkMobile = () => {
      const mobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Check if the app is already installed
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInApp = (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone || isInApp);
    };

    checkIfInstalled();

    // Listen for the beforeinstallprompt event (mobile only)
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show our custom prompt only on mobile
      if (isMobile) {
        setShowPrompt(true);
      }
    });

    // Listen for app installation
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setShowManualPrompt(false);
    });
    
    return () => {
      window.removeEventListener('beforeinstallprompt', () => {});
      window.removeEventListener('appinstalled', () => {});
      window.removeEventListener('resize', checkMobile);
    };
  }, [isMobile]);
  
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

  const showManualInstall = () => {
    setShowManualPrompt(true);
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    setShowManualPrompt(false);
    onClose?.();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      dismissPrompt();
    }
  };

  // Don't show if already installed
  if (isInstalled) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" 
      style={{ minHeight: '100vh' }}
      onClick={handleBackdropClick}
    >
      <div className="flex items-center justify-center w-full h-full">
        <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto relative">
          {/* X button in top-right corner */}
          <button
            onClick={dismissPrompt}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors z-10"
            aria-label="Close dialog"
          >
            <XIcon className="h-5 w-5" />
          </button>
          
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isMobile ? (
                <>
                  <DownloadIcon className="h-5 w-5 text-primary" />
                  Install Trader&apos;s Journal
                </>
              ) : (
                <>
                  <QrCode className="h-5 w-5 text-primary" />
                  Get Mobile App
                </>
              )}
            </CardTitle>
            <CardDescription>
              {isMobile 
                ? "Download the app for a better experience with offline access"
                : "Scan the QR code with your phone to download the mobile app"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* QR Code Section - Show on both desktop and mobile */}
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg">
                {qrCodeDataUrl ? (
                  <img 
                    src={qrCodeDataUrl} 
                    alt="QR Code for Trader&apos;s Journal" 
                    className="w-48 h-48"
                  />
                ) : (
                  <div className="w-48 h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <QrCode className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-xs text-gray-500">Loading QR Code...</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-sm font-medium">Download the mobile app</p>
                <p className="text-xs text-muted-foreground">
                  1. Open your phone's camera app<br/>
                  2. Point it at the QR code<br/>
                  3. Tap the notification to open<br/>
                  4. Tap "Install Now" on the install page
                </p>
              </div>
            </div>

            {/* Mobile-specific installation options */}
            {isMobile && (
              <div className="space-y-3">
                {showPrompt && deferredPrompt ? (
                  <div className="flex gap-2">
                    <Button onClick={handleInstall} className="flex-1">
                      Install Now
                    </Button>
                    <Button variant="outline" onClick={dismissPrompt}>
                      Not Now
                    </Button>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center">
                    <p>The app will be downloaded and installed automatically.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
