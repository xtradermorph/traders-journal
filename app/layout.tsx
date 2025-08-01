"use client"

import React, { useRef, useEffect } from "react";
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import '@/src/globals.css'
import { usePathname } from 'next/navigation'
import ThemeSyncProvider from './src/components/auth/ThemeSyncProvider'
import { UserProfileProvider } from './src/components/UserProfileContext'
import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ChatWidget from "@/components/chat/ChatWidget";

import { CloudflareAnalytics } from "./components/ui/cloudflare-analytics";
import VersionDisplay from "./src/components/VersionDisplay";

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get the current pathname to determine if we're on a public page
  const pathname = usePathname();
  const isPublicPage = pathname === '/' || pathname === '/login' || pathname === '/register';
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const chatButtonRef = useRef<HTMLDivElement>(null);
  const chatDrawerRef = useRef<HTMLDivElement>(null);
  const chatWidgetRef = useRef<HTMLDivElement>(null);

  // Robust device detection
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Keep drawer open if mouse is over icon or drawer
  React.useEffect(() => {
    if (isMobile) return;
    function handleMouseMove(e: MouseEvent) {
      if (!chatButtonRef.current || !chatDrawerRef.current) return;
      const iconRect = chatButtonRef.current.getBoundingClientRect();
      const drawerRect = chatDrawerRef.current.getBoundingClientRect();
      const { clientX: x, clientY: y } = e;
      const overIcon = x >= iconRect.left && x <= iconRect.right && y >= iconRect.top && y <= iconRect.bottom;
      const overDrawer = x >= drawerRect.left && x <= drawerRect.right && y >= drawerRect.top && y <= drawerRect.bottom;
      if (!overIcon && !overDrawer) setIsChatOpen(false);
    }
    if (isChatOpen) {
      window.addEventListener('mousemove', handleMouseMove);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
    }
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isChatOpen, isMobile]);

  // Click-away to close logic
  useEffect(() => {
    if (!isChatOpen) return;
    function handleClick(e: MouseEvent) {
      if (!chatWidgetRef.current) return;
      if (!chatWidgetRef.current.contains(e.target as Node)) {
        setIsChatOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isChatOpen]);

  const handleOpen = () => setIsChatOpen(true);
  const handleClose = () => setIsChatOpen(false);
  
  return (
    <html 
      lang="en" 
      suppressHydrationWarning
      className={isPublicPage ? 'original-dark' : ''}
    >
      <head>
        {/* iOS PWA Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Trader's Journal" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#3B82F6" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* iOS Icons */}
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-152x152.png" />
        
        {/* Splash Screens for iOS */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" href="/splash/iPhone_14_Pro_Max_landscape.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" href="/splash/iPhone_14_Pro_landscape.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)" href="/splash/iPhone_14_Plus__iPhone_13_Pro_Max__iPhone_12_Pro_Max_landscape.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" href="/splash/iPhone_14__iPhone_13_Pro__iPhone_13__iPhone_12_Pro__iPhone_12_landscape.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" href="/splash/iPhone_13_mini__iPhone_12_mini__iPhone_11_Pro__iPhone_XS__iPhone_X_landscape.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)" href="/splash/iPhone_11_Pro_Max__iPhone_XS_Max_landscape.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)" href="/splash/iPhone_11__iPhone_XR_landscape.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" href="/splash/iPhone_SE__iPod_touch_5th_generation_and_later_landscape.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)" href="/splash/iPad_Pro_12.9-inch_landscape.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)" href="/splash/iPad_Pro_11-inch_landscape.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2)" href="/splash/iPad_Air_landscape.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2)" href="/splash/iPad_Pro_10.5-inch_landscape.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2)" href="/splash/iPad_landscape.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)" href="/splash/iPad_Mini_landscape.png" />
        
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Theme Color */}
        <meta name="theme-color" content="#3B82F6" />
        <meta name="msapplication-TileColor" content="#3B82F6" />
      </head>
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider
            attribute="class"
            defaultTheme="original-dark"
            enableSystem={!isPublicPage} // Disable system theme on public pages
            forcedTheme={isPublicPage ? 'original-dark' : undefined} // Force original-dark theme on public pages
            disableTransitionOnChange
          >
            <ThemeSyncProvider>
              <UserProfileProvider>
            {children}
                {!isPublicPage && <ChatWidget />}
              </UserProfileProvider>
            </ThemeSyncProvider>
            
            {/* Version Display */}
            <VersionDisplay />
            
            {/* Cloudflare Analytics */}
            {process.env.NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN && (
              <CloudflareAnalytics token={process.env.NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN} />
            )}
          </ThemeProvider>
        </QueryClientProvider>
      </body>
    </html>
  )
}