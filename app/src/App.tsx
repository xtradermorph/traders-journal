"use client"

import { useRouter, usePathname } from "next/navigation";
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/LandingPage";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Layout from "@/components/Layout";
import { useEffect, useState } from "react";
import { checkAuth } from "@/lib/supabase";

function AuthenticatedRoute({ component: Component, ...rest }: { component: React.ComponentType<any>, [key: string]: any }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        await checkAuth();
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
        router.push("/login");
      }
    }
    
    checkAuth();
  }, [router]);

  if (isAuthenticated === null) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return isAuthenticated ? <Component {...rest} /> : null;
}

function Router() {
  const pathname = usePathname();

  // Simulate Switch/Route behavior with Next.js routing
  if (pathname === "/") return <LandingPage />;
  if (pathname === "/login") return <Login />;
  if (pathname === "/register") return <Register />;
  
  // All authenticated routes should use the AuthenticatedRoute wrapper
  if (pathname === "/dashboard") return <AuthenticatedRoute component={Dashboard} />;
  if (pathname.startsWith("/traders")) return <AuthenticatedRoute component={() => <div className="min-h-screen" />} />;
  if (pathname.startsWith("/trade-records")) return <AuthenticatedRoute component={() => <div className="min-h-screen" />} />;
  if (pathname.startsWith("/social-forum")) return <AuthenticatedRoute component={() => <div className="min-h-screen" />} />;
  if (pathname.startsWith("/profile")) return <AuthenticatedRoute component={() => <div className="min-h-screen" />} />;
  if (pathname.startsWith("/settings")) return <AuthenticatedRoute component={() => <div className="min-h-screen" />} />;
  if (pathname.startsWith("/admin")) return <AuthenticatedRoute component={() => <div className="min-h-screen" />} />;
  if (pathname.startsWith("/support")) return <AuthenticatedRoute component={() => <div className="min-h-screen" />} />;
  
  // If we reach here, no route matched, so return NotFound
  return <NotFound />;
}

function App() {
  const pathname = usePathname(); // Get pathname here
  
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
            <Router />
          </Layout>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;