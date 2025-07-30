"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { supabase } from "./supabase";

// Auth context types
type User = {
  id: number;
  username: string;
  email: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Export getSession function
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Auth provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  // User query
  const {
    data: user,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async ({ queryKey }) => {
      try {
        const res = await fetch(queryKey[0] as string, {
          credentials: "include",
        });
        
        if (res.status === 401) {
          return null;
        }
        
        return await res.json();
      } catch (error) {
        return null;
      }
    },
    retry: false,
  });
  
  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", { username, password });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/auth/user'], data);
      toast({
        id: "login-success",
        title: "Login successful",
        description: "Welcome back!",
        variant: "default"
      });
      router.push("/dashboard");
    },
    onError: (error: any) => {
      toast({
        id: "login-error",
        title: "Login failed",
        description: error.message || "Invalid username or password",
        variant: "destructive"
      });
    },
  });
  
  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async ({ username, email, password }: { username: string; email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/register", { username, email, password });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        id: "register-success",
        title: "Registration successful",
        description: "Welcome to the platform!",
        variant: "default"
      });
      router.push("/login");
    },
    onError: (error: any) => {
      toast({
        id: "register-error",
        title: "Registration failed",
        description: error.message || "Failed to create account",
        variant: "destructive"
      });
    },
  });
  
  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/logout");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.clear();
      toast({
        id: "logout-success",
        title: "Logged out",
        description: "You have been logged out successfully",
        variant: "default"
      });
      router.push("/login");
    },
    onError: (error: any) => {
      toast({
        id: "logout-error",
        title: "Logout failed",
        description: error.message || "Failed to logout",
        variant: "destructive"
      });
    },
  });
  
  // Auth methods
  const login = async (username: string, password: string) => {
    await loginMutation.mutateAsync({ username, password });
  };
  
  const register = async (username: string, email: string, password: string) => {
    await registerMutation.mutateAsync({ username, email, password });
  };
  
  const logout = async () => {
    await logoutMutation.mutateAsync();
  };
  
  // Auth context value
  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Auth hook for easy access
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};