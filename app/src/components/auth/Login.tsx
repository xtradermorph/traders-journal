"use client"

import React from "react";
import { useState, useEffect, useCallback } from "react";
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
import { User } from '@supabase/supabase-js';
import Image from 'next/image';
import { Turnstile } from '../../../components/ui/turnstile-simple'
import { LOGO_CONFIG } from '../../../lib/logo-config';

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
  session: unknown; // Changed from Session to unknown
  error?: Error;
}

const Login = () => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState<string | null>(null);
  
  // Check if we're in development mode
  const [isDevelopment, setIsDevelopment] = useState(false);
  
  useEffect(() => {
    // Check if we're in development mode (client-side only)
    const isDev = process.env.NODE_ENV === 'development' || 
                  window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1';
    setIsDevelopment(isDev);
  }, []);
  
  // Get redirect URL from query parameters
  const [redirectUrl, setRedirectUrl] = useState<string>('/dashboard');
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect');
      if (redirect) {
        setRedirectUrl(redirect);
      }
    }
  }, []);

  // Get Turnstile site key - use proper environment variable or fallback
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAABm43D0IOh0X_ZLm";

  // Turnstile is enabled for bot protection
  const enableTurnstile = true;

  // Memoize Turnstile callback functions to prevent multiple renders
  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
    setTurnstileError(null);
  }, []);

  const handleTurnstileError = useCallback((error: string) => {
    setTurnstileError('Security check failed. Please try again.');
    setTurnstileToken(null);
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken(null);
    setTurnstileError('Security check expired. Please try again.');
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
        
        // Call our custom login API that handles Turnstile verification
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: data.email,
            password: data.password,
            turnstileToken: enableTurnstile && !isDevelopment ? turnstileToken : undefined
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Authentication failed');
        }

        // Store username
        if (result.username) {
          localStorage.setItem('username', result.username);
        }

        // Handle remember me
        if (data.rememberMe) {
          localStorage.setItem('rememberedCredentials', JSON.stringify({
            email: data.email,
            password: data.password
          }));
        } else {
          localStorage.removeItem('rememberedCredentials');
        }

        return result;
      } catch (error) {
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: () => {
      router.push(redirectUrl);
      router.refresh();
      toast.success("Login successful", {
        description: "Welcome back!"
      });
    },
    onError: (error: Error) => {
      const errorMessage = error.message;
      setError(errorMessage);
      
      // Show toast with error details
      toast.error(
        "Login Failed",
        {
          description: errorMessage
        }
      );
    }
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setIsLoading(true);
      setError(null);
      setTurnstileError(null);
      
      // Check if Turnstile token is present (only if enabled and in production)
      if (enableTurnstile && !isDevelopment && !turnstileToken) {
        setTurnstileError('Please complete the security check');
        setIsLoading(false);
        return;
      }
      
      await loginMutation.mutateAsync(data);
    } catch (error: unknown) {
      // Error is handled by the mutation's onError callback
      setIsLoading(false);
    }
  };

  const handleSubmit = loginForm.handleSubmit(onSubmit);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Clear any stored credentials
          localStorage.removeItem('rememberedCredentials');
          
          // Sign out to prevent automatic login
          await supabase.auth.signOut();
        }
      } catch (error) {
        // Ignore auth check errors
      }
    };

    checkAuth();
  }, [router]);
  
  // Handle back button to prevent showing remembered credentials
  useEffect(() => {
    const handlePopState = () => {
      // Clear any stored credentials when navigating back to login
      loginForm.reset({
        email: '',
        password: '',
        rememberMe: false
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [loginForm]);

  return (
    <div className="min-h-screen bg-cover bg-center flex flex-col items-center justify-center p-4 relative"
      style={{ backgroundImage: "url('/images/auth-fullpage-background.jpg')" }}
    >
      <Link href="/" passHref legacyBehavior>
        <a className="absolute top-6 right-6 text-primary p-1.5 rounded-full hover:bg-black transition-colors z-10">
          <X size={28} aria-label="Close" />
        </a>
      </Link>
      <div className="w-full max-w-md space-y-8 bg-cover bg-center p-8 sm:p-12 rounded-xl shadow-2xl"
        style={{ backgroundImage: "url('/images/auth-card-background.jpg')" }}
      >
        <div className="flex flex-col items-center">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <img src={LOGO_CONFIG.MAIN_LOGO_URL} alt={LOGO_CONFIG.ALT_TEXT} className="h-20 w-20 mb-4" />
          </Link>
          <h2 className="text-3xl font-bold text-foreground">
            Log in to
          </h2>
          <h2 className="text-3xl font-bold gradient-heading">
            Trader&apos;s Journal
          </h2>
        </div>
        <div className="space-y-6">
          <ClientOnly>
            <Form {...loginForm}>
              <form onSubmit={handleSubmit} className="space-y-6">
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          {...field}
                          disabled={isLoading}
                          className={`bg-background/50 backdrop-blur-sm border-border/50 focus-visible:ring-primary/50 ${
                            field.value && !field.value.includes('@') ? 'border-red-500 focus-visible:ring-red-500' : ''
                          }`}
                          onBlur={(e) => {
                            field.onBlur();
                            // Trigger validation on blur
                            if (e.target.value && !e.target.value.includes('@')) {
                              loginForm.setError('email', {
                                type: 'manual',
                                message: 'Please enter a valid email address'
                              });
                            } else if (e.target.value && e.target.value.includes('@')) {
                              loginForm.clearErrors('email');
                            }
                          }}
                          onChange={(e) => {
                            field.onChange(e);
                            // Clear error when user starts typing a valid email
                            if (e.target.value.includes('@')) {
                              loginForm.clearErrors('email');
                            }
                          }}
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
                            type={showPassword ? "text" : "password"}
                            {...field}
                            disabled={isLoading}
                            className="bg-background/50 backdrop-blur-sm border-border/50 focus-visible:ring-primary/50 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
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
                    render={({ field: { onChange, value } }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox checked={value} onCheckedChange={(checked) => onChange(checked)} />
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
                
                {/* Turnstile Security Check */}
                {enableTurnstile && !isDevelopment && (
                  <div className="space-y-2">
                    <p className="text-center text-sm text-muted-foreground">
                      Let us know you&apos;re human
                    </p>
                    <div className="flex justify-center">
                      <Turnstile
                        siteKey={turnstileSiteKey}
                        onVerify={handleTurnstileVerify}
                        onError={handleTurnstileError}
                        onExpire={handleTurnstileExpire}
                        theme="auto"
                        size="normal"
                      />
                    </div>
                    {turnstileError && (
                      <div className="text-red-500 text-sm text-center">
                        {turnstileError}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Development mode message */}
                {enableTurnstile && isDevelopment && (
                  <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500">
                    <p>Security check disabled in development mode</p>
                    <p className="text-xs mt-1">Security check will be enabled in production</p>
                  </div>
                )}
                
              <Button
                type="submit"
                className="w-full"
                disabled={
                  isLoading || 
                  (enableTurnstile && !isDevelopment && !turnstileToken) ||
                  !loginForm.formState.isValid ||
                  !loginForm.watch('email') ||
                  !loginForm.watch('password')
                }
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
                  className="w-full flex items-center justify-center gap-2"
                  onClick={async () => {
                    try {
                      setIsLoading(true);
                      setError(null);
                      const { data, error } = await supabase.auth.signInWithOAuth({
                        provider: 'google',
                        options: {
                          redirectTo: `${window.location.origin}/auth/callback`,
                          queryParams: {
                            access_type: 'offline',
                            prompt: 'select_account'
                          }
                        }
                      });
                      
                      if (error) {
                        setError(error.message);
                      } else if (!data.url) {
                        setError('Failed to get authentication URL');
                      } else {
                        // Redirect to Google's OAuth page
                        window.location.href = data.url;
                      }
                    } catch (err) {
                      setError('Failed to sign in with Google');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={isLoading}
                >
                  <Image 
                    src="/google-logo.svg" 
                    alt="Google" 
                    width={18} 
                    height={18} 
                  />
                  Sign in with Google
                </Button>
              </form>
            </Form>
          </ClientOnly>
        </div>
      </div>
      
      <div className="space-y-6">
        <Separator />
        <p className="text-center text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-foreground hover:text-primary transition-colors">
            Sign up for Trader&apos;s Journal
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
