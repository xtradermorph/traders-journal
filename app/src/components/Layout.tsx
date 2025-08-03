"use client"

import { useState, useEffect, useRef } from "react"; // Added useRef
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import MobileNavigation from "./MobileNavigation";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Users, 
  LineChart, 
  BookOpen, 
  MessageSquare, 
  Calendar, 
  Settings, 
  Menu,
  X,
  TrendingUp
} from "lucide-react";
import DashboardHeader from "./DashboardHeader";
import DashboardFooter from "./DashboardFooter";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/lib/supabase/index";
import { UserProfileProvider } from "./UserProfileContext";
import { Input } from "@/components/ui/input";

interface LayoutProps {
  children: React.ReactNode;
  pathname: string; // Add pathname to props
}

const getPageTitle = (pathname: string): string => {
  // Simple title mapping, can be expanded
  if (pathname.startsWith('/dashboard')) return "Dashboard";
  if (pathname.startsWith('/trades')) return "Trades";
  if (pathname.startsWith('/calendar')) return "Calendar";
  if (pathname.startsWith('/analysis')) return "Analysis";
  if (pathname.startsWith('/settings')) return "Settings";
  if (pathname.startsWith('/profile')) return "Profile";
  if (pathname.startsWith('/support')) return "Support";
  // Add more mappings as needed
  return "Trader&apos;s Journal"; // Default title
};

const Layout = ({ children, pathname }: LayoutProps) => {
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Define page types based on pathname
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password' || pathname === '/reset-password';
  const isLandingPage = pathname === '/';
  const isAdminPage = pathname.startsWith('/admin');
  
  // Any page that's not auth or landing is considered authenticated
  const isAuthenticatedPage = !isAuthPage && !isLandingPage;
  
  // Handle page type changes and setup mainScrollRef
  useEffect(() => {
    if (!isClient) return;
    
    // Only log in development mode when debugging is needed
    if (process.env.NODE_ENV === 'development') {
      // console.log('Current page type:', {
      //   pathname,
      //   isAuthPage,
      //   isLandingPage,
      //   isAdminPage,
      //   isAuthenticatedPage
      // });
    }
    
    // Ensure the mainScrollRef is properly set up
    if (isAuthenticatedPage && mainScrollRef.current) {
      if (process.env.NODE_ENV === 'development') {
        // console.log('Setting up mainScrollRef for authenticated page');
      }
      // Force a scroll event to initialize the header visibility
      const scrollEvent = new Event('scroll');
      mainScrollRef.current.dispatchEvent(scrollEvent);
    }
  }, [pathname, isAuthPage, isLandingPage, isAdminPage, isAuthenticatedPage, isClient]);

  const router = useRouter();
  
  // Use Supabase to fetch user profile data
  const { data: userData, isSuccess, refetch } = useQuery({
    queryKey: ['userProfile'],
    enabled: !isAuthPage && !isLandingPage && isClient,
    retry: false,
    refetchOnWindowFocus: true, // Enable refetch on window focus
    refetchOnMount: true, // Always refetch when component mounts
    staleTime: 0, // Consider data stale immediately
    refetchInterval: 60000, // Refetch every minute to keep user data fresh
    queryFn: async () => {
      if (!isClient) return { user: null };
      
      try {
        // Get the current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // If not authenticated and not on auth page, redirect to login
          if (!isAuthPage && !isLandingPage) {
            router.push('/login');
          }
          return { user: null };
        }
        
        // Fetch the user profile from Supabase
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (error) {
          console.error('Error fetching profile:', error);
          return { user: null };
        }
        
        return { user: profile };
      } catch (error) {
        console.error('Error fetching user data:', error);
        return { user: null };
      }
    }
  });
  
  // Extract user from userData
  const user = userData?.user;

  // Close mobile menu and refetch user data when pathname changes
  useEffect(() => {
    if (!isClient) return;
    
    setIsMobileMenuOpen(false);
    
    // If returning from profile page to dashboard, refetch user data
    if (!isAuthPage && !isLandingPage) {
      refetch();
    }
  }, [pathname, refetch, isAuthPage, isLandingPage, isClient]);

  // Listen for profile update events to refetch user data
  useEffect(() => {
    if (!isClient) return;
    
    const handleProfileUpdated = () => {
      refetch();
    };
    window.addEventListener('profile-updated', handleProfileUpdated);
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdated);
    };
  }, [refetch, isClient]);

  // Don't show layout elements on auth pages
  if (isAuthPage) {
    return <>{children}</>;
  }

  // Don't show dashboard layout on landing page
  if (isLandingPage) {
    return (
      <div className="bg-background min-h-screen">
        <header className="bg-bg-surface shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <img src="https://oweimywvzmqoizsyotrt.supabase.co/storage/v1/object/public/tj.images//proper%20logo.png" alt="Logo" className="h-20 w-20" />
            </Link>
            <h1 className="ml-2 text-lg font-semibold text-neutral">Trader&apos;s Journal</h1>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" size="lg" asChild>
              <Link href="/login">Log In</Link>
            </Button>
            <Button size="lg" asChild>
              <Link href="/register">Sign Up</Link>
            </Button>
          </div>
        </header>
        {children}
      </div>
    );
  }

  // Render authenticated layout with header, sidebar, and footer
  if (isAuthenticatedPage) {
    // Only log in development mode when debugging is needed
    if (process.env.NODE_ENV === 'development') {
      // console.log('Rendering authenticated layout with mainScrollRef');
    }
    
    return (
      <UserProfileProvider>
      <div className="flex flex-col h-screen">
        <DashboardHeader 
          user={user || null} 
          pageTitle={getPageTitle(pathname)} 
          mainScrollRef={mainScrollRef} 
        />
          <div className="flex-1 flex flex-col items-center justify-center relative">
            {/* Glassmorphism background overlay */}
            <div className="absolute inset-0 bg-white/90 backdrop-blur-md pointer-events-none z-0" />
            <div className="relative w-full h-full bg-white/95 shadow-2xl border border-border p-4 md:p-8 z-10 flex-1 flex flex-col">
            <main 
              ref={mainScrollRef} 
                className="flex-1 overflow-y-auto"
              id="main-scroll-container"
            >
              {children}
            </main>
            </div>
          </div>
        <MobileNavigation />
      </div>
      </UserProfileProvider>
    );
  }
  
  // Render landing page or auth pages without dashboard header/sidebar/footer
  return (
    <div className="min-h-screen flex flex-col">
      {isLandingPage && (
        <header className="bg-background z-10 border-b border-border">
          <div className="container flex h-16 items-center justify-between py-4">
            <Link href="/" className="flex items-center space-x-2">
              <TrendingUp className="h-6 w-6" />
              <span className="font-bold">Trader&apos;s Journal</span>
            </Link>
            <nav className="flex items-center space-x-4">
              <Link href="/login" className="text-sm font-medium hover:underline">
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
              >
                Sign Up
              </Link>
            </nav>
          </div>
        </header>
      )}
      {children}
    </div>
  );
};

export default Layout;