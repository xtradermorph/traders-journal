"use client"

import React from "react";
import { useState, useEffect } from "react";
import { ClientOnly } from "@/components/ClientOnly";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/index";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Session, User } from '@supabase/supabase-js';
import Image from 'next/image';
import { Turnstile } from '../../../components/ui/turnstile';

const loginFormSchema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean()
});

interface LoginFormValues {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface LoginResponse {
  user: User;
  session: Session;
  error?: Error;
}

const Login = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState('/dashboard');
  const [isDevelopment, setIsDevelopment] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Check if we're in development mode (client-side only)
    const hostname = window.location.hostname;
    const isDev = hostname === 'localhost' || 
                  hostname === '127.0.0.1' ||
                  hostname.includes('localhost') ||
                  hostname.includes('dev') ||
                  hostname.includes('staging');
    setIsDevelopment(isDev);
    
    // Debug logging
    console.log('Environment detection:', {
      hostname: hostname,
      isDevelopment: isDev,
      shouldShowTurnstile: !isDev,
      isProduction: hostname === 'tradersjournal.pro' || hostname.includes('tradersjournal')
    });
  }, []);

  const loginForm = useForm({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false
    }
  });

  const loginMutation = useMutation<LoginResponse, Error, LoginFormValues>({
    mutationFn: async (data: LoginFormValues) => {
      try {
        setError(null);
        setIsLoading(true);
        
        // Skip Turnstile verification in development mode
        if (!isDevelopment || window.location.hostname === 'tradersjournal.pro') {
          // Verify Turnstile token
          if (!turnstileToken) {
            throw new Error('Security check required');
          }
          
          const verificationResponse = await fetch('/api/turnstile/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              token: turnstileToken,
              action: 'login'
            })
          });
          
          const verificationResult = await verificationResponse.json();
          
          if (!verificationResult.success) {
            throw new Error('Security check failed. Please try again.');
          }
        }

        // Attempt to sign in
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (authError) {
          throw authError;
        }

        if (!authData.user || !authData.session) {
          throw new Error('Authentication failed');
        }

        // Handle remember me
        if (!data.rememberMe) {
          // Clear session storage for non-remembered sessions
          sessionStorage.clear();
        }

        return {
          user: authData.user,
          session: authData.session
        };
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: (data) => {
      toast.success('Login successful!');
      router.push(redirectUrl);
    },
    onError: (error) => {
      console.error('Login mutation error:', error);
      setError(error.message || 'Login failed. Please try again.');
      setIsLoading(false);
    }
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      await loginMutation.mutateAsync(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  // Force logout function for debugging
  const forceLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Force logout error:', error);
      } else {
        console.log('Force logout successful');
        router.push('/login');
      }
    } catch (error) {
      console.error('Force logout failed:', error);
    }
  };

  // Don't render until client-side
  if (!isClient) {
    return null;
  }

  return (
    <ClientOnly>
      <div 
        className="min-h-screen bg-cover bg-center flex flex-col items-center justify-center p-4 relative"
        style={{ backgroundImage: "url('/images/auth-fullpage-background.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/50"></div>
        
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-background/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-border p-6 sm:p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Welcome back
              </h1>
              <p className="text-muted-foreground">
                Sign in to your account to continue
              </p>
            </div>

            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="Enter your email"
                          className="h-12"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            className="h-12 pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-between">
                  <FormField
                    control={loginForm.control}
                    name="rememberMe"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked)} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Remember me
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  <Button variant="link" className="p-0 h-auto" asChild>
                    <Link href="/forgot-password">Forgot password?</Link>
                  </Button>
                </div>
                {error && (
                  <div className="text-red-500 text-sm">{error}</div>
                )}
                
                {/* Turnstile Security Check - Show in production */}
                {(!isDevelopment || window.location.hostname === 'tradersjournal.pro') && isClient && (
                  <div className="space-y-2">
                    <Turnstile
                      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAABm43D0IOh0X_ZLm"}
                      onVerify={(token) => {
                        setTurnstileToken(token);
                        setTurnstileError(null);
                      }}
                      onError={(error) => {
                        setTurnstileError('Security check failed. Please try again.');
                        setTurnstileToken(null);
                      }}
                      onExpire={() => {
                        setTurnstileToken(null);
                        setTurnstileError('Security check expired. Please try again.');
                      }}
                      action="login"
                      appearance="interaction-only"
                      theme="auto"
                      className="flex justify-center"
                    />
                    {turnstileError && (
                      <div className="text-sm text-destructive text-center">
                        {turnstileError}
                      </div>
                    )}
                  </div>
                )}
                
                {isDevelopment && !window.location.hostname.includes('tradersjournal') && isClient && (
                  <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-center">
                    🔧 Development Mode: Security check bypassed
                  </div>
                )}
                
                <Button
                  type="submit"
                  className="w-full text-lg py-6"
                  disabled={isLoading || ((!isDevelopment || window.location.hostname === 'tradersjournal.pro') && !turnstileToken)}
                >
                  {isLoading ? (
                    <>
                      <span className="mr-2">Signing in...</span>
                      <div className="h-4 w-4 animate-spin border-2 border-primary border-t-transparent rounded-full"></div>
                    </>
                  ) : (
                    "Log in"
                  )}
                </Button>
                
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border"></span>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>
                
                <Button 
                  type="button"
                  variant="outline"
                  className="w-full h-12"
                  onClick={async () => {
                    try {
                      const { error } = await supabase.auth.signInWithOAuth({
                        provider: 'google',
                        options: {
                          redirectTo: `${window.location.origin}/auth/callback`
                        }
                      });
                      if (error) throw error;
                    } catch (error) {
                      console.error('Google sign-in error:', error);
                      toast.error('Google sign-in failed');
                    }
                  }}
                >
                  <Image
                    src="/google-logo.svg"
                    alt="Google"
                    width={20}
                    height={20}
                    className="mr-2"
                  />
                  Continue with Google
                </Button>
                
                <div className="text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link href="/register" className="text-primary hover:underline">
                    Sign up
                  </Link>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </ClientOnly>
  );
};

export default Login;
