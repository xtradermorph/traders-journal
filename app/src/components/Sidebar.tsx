"use client"

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
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
  TrendingUp,
  BarChart2,
  User,
  Activity,
  MonitorCheck,
  LifeBuoy
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/index";
import { useToast } from "@/hooks/use-toast";

// Define interface for navigation items
interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  active: boolean;
  hidden?: boolean;
}

function HydrationGuard({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  if (!hydrated) return null;
  return <>{children}</>;
}

const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: userData, refetch: refetchUserData } = useQuery({
    queryKey: ['userProfile'],
    retry: 3,
    retryDelay: 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 0, // Don't cache this data to ensure fresh data on navigation
    queryFn: async () => {
      try {
        // Get the current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          return { user: null, isAdmin: false };
        }
        
        // Fetch the user profile from Supabase
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (error) {
          console.error('Error fetching profile:', error);
          return { user: null, isAdmin: false };
        }
        
        const isAdmin = profile?.role?.toLowerCase() === 'admin';
        // Only log on initial load, not on every refetch
        if (process.env.NODE_ENV === 'development') {
          console.log('User profile loaded, isAdmin:', isAdmin);
        }
        
        return { 
          user: profile, 
          isAdmin: isAdmin 
        };
      } catch (error) {
        console.error('Error fetching user data:', error);
        return { user: null, isAdmin: false };
      }
    }
  });
  
  // Store admin status in localStorage to persist across page navigation
  useEffect(() => {
    // Check if we have stored admin status
    const storedAdminStatus = localStorage.getItem('isAdmin');
    
    // If admin status changes, update localStorage
    if (userData?.isAdmin !== undefined) {
      localStorage.setItem('isAdmin', String(userData.isAdmin));
      // Only log in development mode
      if (process.env.NODE_ENV === 'development') {
        // console.log('Updated stored admin status:', userData.isAdmin);
      }
    }
  }, [userData?.isAdmin]);
  
  // Refresh user data when pathname changes
  useEffect(() => {
    refetchUserData();
    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
      // console.log('Pathname changed, refetching user data:', pathname);
    }
  }, [pathname]);
  
  // Force refetch on component mount
  useEffect(() => {
    // Initial fetch
    refetchUserData();
    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
      // console.log('Sidebar mounted, fetching user data');
    }
    
    // Set up interval to periodically check admin status
    const intervalId = setInterval(() => {
      refetchUserData();
      // Only log in development mode
      if (process.env.NODE_ENV === 'development') {
        // console.log('Periodic admin status check');
      }
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Use localStorage as fallback for admin status to prevent menu items from disappearing
  const storedAdminStatus = typeof window !== 'undefined' ? localStorage.getItem('isAdmin') === 'true' : false;
  const isAdmin = userData?.isAdmin ?? storedAdminStatus;
  
  const navItems: NavItem[] = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard"
    },
    // Admin links only
    {
    name: "Monitoring",
    href: "/admin/monitoring",
    icon: MonitorCheck,
    active: pathname.startsWith("/admin/monitoring"),
    hidden: !isAdmin
    }
  ];
  
  // If user is not an admin, do not render the sidebar at all
  if (!isAdmin) {
    // Optional: log for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Sidebar: User is not admin, rendering null. Current isAdmin state:', isAdmin);
    }
    return null;
  }

  // Optional: log for debugging in development if user is admin
  if (process.env.NODE_ENV === 'development') {
    console.log('Sidebar: User is admin, rendering sidebar. Current isAdmin state:', isAdmin);
    // console.log('Nav items with admin items:', navItems); // Original log for nav items
  }
  
  return (
    <aside className="hidden lg:block w-64 bg-background border-r border-border h-full overflow-y-auto">
      <div className="py-4">
        <div className="px-4 mb-6">
          <Link href="/dashboard" className="flex items-center">
            <img 
              src="https://oweimywvzmqoizsyotrt.supabase.co/storage/v1/object/public/tj.images//proper%20logo.png" 
              alt="Logo" 
              className="h-10 w-10" 
            />
            <span className="ml-2 text-lg font-semibold text-foreground">Trader's Journal</span>
          </Link>
        </div>
        
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            // Skip hidden items (admin items when user is not admin)
            if (item.hidden) return null;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  item.active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default function SidebarWithHydration() {
  return (
    <HydrationGuard>
      <Sidebar />
    </HydrationGuard>
  );
}
