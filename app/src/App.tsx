"use client"

import { useRouter, usePathname } from "next/navigation";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import LoadingSpinner from "./components/LoadingSpinner";
import { useEffect, useState } from "react";
import { checkAuth } from "./lib/supabase";
import Layout from "./components/Layout";

function AuthenticatedRoute({ component: Component, ...rest }: { component: React.ComponentType<Record<string, unknown>>, [key: string]: unknown }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    async function checkAuthStatus() {
      try {
        await checkAuth();
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
        router.push("/login");
      }
    }
    
    checkAuthStatus();
  }, [router, isClient]);

  if (!isClient || isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  return isAuthenticated ? <Component {...rest} /> : null;
}

function App() {
  const pathname = usePathname(); // Get pathname here
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Global error handlers
  useEffect(() => {
    if (!isClient) return;

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      // Prevent the default browser behavior
      event.preventDefault();
    };

    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      // Prevent the default browser behavior
      event.preventDefault();
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [isClient]);
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider>
          <Toaster />
          <Layout pathname={pathname}> {/* Pass pathname as a prop */}
            {/* Let Next.js handle the routing - this component just provides the layout */}
            <div className="min-h-screen">
              {/* The actual page content will be rendered by Next.js */}
            </div>
          </Layout>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;