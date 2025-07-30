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