"use client"

import React, { useEffect, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, X } from "lucide-react";
import Image from 'next/image';
import { Turnstile } from '../../components/ui/turnstile';
import { LOGO_CONFIG } from '../../lib/logo-config';

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username must be less than 20 characters"),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  agreeToTerms: z.boolean().refine((val) => val === true, "You must agree to the terms and conditions")
});

interface RegisterFormValues {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

const Register = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isDevelopment, setIsDevelopment] = useState(false);

  useEffect(() => {
    // Check if we're in development mode (client-side only)
    const isDev = process.env.NODE_ENV === 'development' || 
                  window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1';
    setIsDevelopment(isDev);
    
    // Debug logging
    console.log('Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      hostname: window.location.hostname,
      isDevelopment: isDev,
      turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
      // For testing purposes, you can temporarily enable Turnstile in development
      // by setting this to false
      forceProductionMode: false
    });
    
    // For testing purposes, you can temporarily enable Turnstile in development
    // by uncommenting the line below
    // setIsDevelopment(false);
  }, []);

  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      agreeToTerms: false
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormValues) => {
      try {
        // Validate the data first
        const validatedData = registerSchema.parse(data);
        
        if (validatedData.password !== validatedData.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        
        // Skip Turnstile verification in development mode
        if (!isDevelopment) {
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
              action: 'register'
            })
          });
          
          const verificationResult = await verificationResponse.json();
          
          if (!verificationResult.success) {
            throw new Error('Security check failed. Please try again.');
          }
        }
        
        // Use direct client-side signup
        console.log('Attempting direct client-side signup');
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: data.email.toLowerCase().trim(),
          password: data.password,
          options: {
            data: {
              username: data.username
            },
            emailRedirectTo: `${window.location.origin}/login`
          }
        });
        
        if (signUpError) {
          console.error('Supabase signup error:', signUpError);
          throw new Error(signUpError.message || 'Registration failed');
        }
        
        // Create profile manually if user data is available
        if (signUpData && signUpData.user) {
          const { error: profileError } = await supabase.from('profiles').insert({
            id: signUpData.user.id,
            username: data.username,
            email: data.email.toLowerCase().trim(),
            created_at: new Date().toISOString()
          });
          if (profileError) {
            console.error('Profile creation error:', profileError);
            // Don't throw error here as user is already created
          }
        }
        
        return signUpData;
      } catch (error) {
        console.error('Registration error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Account created successfully!", {
        description: "Please check your email to verify your account before logging in."
      });
      router.push('/login');
    },
    onError: (error: Error) => {
      console.error('Registration failed:', error);
      const errorMessage = error.message || 'An error occurred during registration';
      setError(errorMessage);
      
      toast.error("Registration Failed", {
        description: errorMessage
      });
    }
  });

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      setIsLoading(true);
      setError(null);
      setTurnstileError(null);
      
      // Check if Turnstile token is present (only in production)
      if (!isDevelopment && !turnstileToken) {
        setTurnstileError('Please complete the security check');
        setIsLoading(false);
        return;
      }

      // Verify Turnstile token (only in production)
      if (!isDevelopment) {
        const verificationResponse = await fetch('/api/turnstile/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: turnstileToken,
            action: 'register',
          }),
        });

        const verificationResult = await verificationResponse.json();
        if (!verificationResult.success) {
          setTurnstileError('Security check failed. Please try again.');
          setIsLoading(false);
          return;
        }
      }
      
      await registerMutation.mutateAsync(data);
    } catch (error: unknown) {
      // Error is handled by the mutation's onError callback
      console.error('Submit error:', error);
      setIsLoading(false);
    }
  };

  const password = registerForm.watch('password');
  const hasMinLength = password?.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password || '');
  const hasLowerCase = /[a-z]/.test(password || '');
  const hasNumber = /[0-9]/.test(password || '');
  const hasSpecialChar = /[^a-zA-Z0-9]/.test(password || '');

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
            <Image src={LOGO_CONFIG.MAIN_LOGO_URL} alt={LOGO_CONFIG.ALT_TEXT} width={80} height={80} className="h-20 w-20 mb-4" />
          </Link>
          <h2 className="text-3xl font-bold text-foreground">
            Join
          </h2>
          <h2 className="text-3xl font-bold gradient-heading">
            Trader&apos;s Journal
          </h2>
        </div>
        <div className="space-y-6">
          <ClientOnly>
            <Form {...registerForm}>
              <form onSubmit={registerForm.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={registerForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Choose a username"
                          disabled={isLoading}
                          className="bg-background/50 backdrop-blur-sm border-border/50 focus-visible:ring-primary/50"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="Enter your email"
                          disabled={isLoading}
                          className={`bg-background/50 backdrop-blur-sm border-border/50 focus-visible:ring-primary/50 ${
                            field.value && !field.value.includes('@') ? 'border-red-500 focus-visible:ring-red-500' : ''
                          }`}
                          onBlur={(e) => {
                            field.onBlur();
                            // Trigger validation on blur
                            if (e.target.value && !e.target.value.includes('@')) {
                              registerForm.setError('email', {
                                type: 'manual',
                                message: 'Please enter a valid email address'
                              });
                            } else if (e.target.value && e.target.value.includes('@')) {
                              registerForm.clearErrors('email');
                            }
                          }}
                          onChange={(e) => {
                            field.onChange(e);
                            // Clear error when user starts typing a valid email
                            if (e.target.value.includes('@')) {
                              registerForm.clearErrors('email');
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a password"
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
                      
                      {/* Password strength indicator */}
                      {password && (
                        <div className="mt-2 space-y-2">
                          <div className="text-xs text-muted-foreground">Password strength:</div>
                          <div className="space-y-1">
                            <div className={`text-xs ${hasMinLength ? 'text-green-600' : 'text-gray-400'}`}>
                              ✓ At least 8 characters
                            </div>
                            <div className={`text-xs ${hasUpperCase ? 'text-green-600' : 'text-gray-400'}`}>
                              ✓ One uppercase letter
                            </div>
                            <div className={`text-xs ${hasLowerCase ? 'text-green-600' : 'text-gray-400'}`}>
                              ✓ One lowercase letter
                            </div>
                            <div className={`text-xs ${hasNumber ? 'text-green-600' : 'text-gray-400'}`}>
                              ✓ One number
                            </div>
                            <div className={`text-xs ${hasSpecialChar ? 'text-green-600' : 'text-gray-400'}`}>
                              ✓ One special character
                            </div>
                          </div>
                        </div>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your password"
                            disabled={isLoading}
                            className="bg-background/50 backdrop-blur-sm border-border/50 focus-visible:ring-primary/50 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            tabIndex={-1}
                          >
                            {showConfirmPassword ? (
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

                <FormField
                  control={registerForm.control}
                  name="agreeToTerms"
                  render={({ field: { onChange, value } }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={value} onCheckedChange={(checked) => onChange(checked)} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm">
                          I agree to the{" "}
                          <Link href="/terms" className="text-primary hover:underline">
                            Terms of Service
                          </Link>{" "}
                          and{" "}
                          <Link href="/privacy" className="text-primary hover:underline">
                            Privacy Policy
                          </Link>
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                {error && (
                  <div className="text-red-500 text-sm">{error}</div>
                )}

                {/* Turnstile Security Check */}
                <div className="space-y-2">
                  <p className="text-center text-sm text-muted-foreground">
                    Let us know you're human
                  </p>
                  <div className="flex justify-center">
                    {!isDevelopment && (
                      <Turnstile
                        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAABm43D0IOh0X_ZLm"}
                        onVerify={(token) => {
                          console.log('Turnstile verified with token:', token);
                          setTurnstileToken(token);
                          setTurnstileError(null);
                        }}
                        onError={(error) => {
                          console.error('Turnstile error:', error);
                          setTurnstileError('Security check failed. Please try again.');
                          setTurnstileToken(null);
                        }}
                        onExpire={() => {
                          console.log('Turnstile token expired');
                          setTurnstileToken(null);
                          setTurnstileError('Security check expired. Please try again.');
                        }}
                        action="register"
                        appearance="interaction-only"
                        theme="auto"
                        size="normal"
                      />
                    )}
                    {isDevelopment && (
                      <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500">
                        <p>Turnstile disabled in development mode</p>
                        <p className="text-xs mt-1">Security check will be enabled in production</p>
                      </div>
                    )}
                  </div>
                  {turnstileError && (
                    <div className="text-red-500 text-sm text-center">
                      {turnstileError}
                    </div>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={
                    isLoading || 
                    (!isDevelopment && !turnstileToken) ||
                    !registerForm.formState.isValid ||
                    !registerForm.watch('agreeToTerms') ||
                    !registerForm.watch('username') ||
                    !registerForm.watch('email') ||
                    !registerForm.watch('password') ||
                    !registerForm.watch('confirmPassword') ||
                    registerForm.watch('password') !== registerForm.watch('confirmPassword')
                  }
                >
                  {isLoading ? (
                    <>
                      <span className="mr-2">Creating account...</span>
                      <div className="h-4 w-4 animate-spin border-2 border-primary border-t-transparent rounded-full"></div>
                    </>
                  ) : (
                    "Create Account"
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
                      const { error } = await supabase.auth.signInWithOAuth({
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
                        console.error('Google sign-in error:', error);
                      } else {
                        setError('Failed to get authentication URL');
                      }
                    } catch (err) {
                      console.error('Exception during Google sign-in:', err);
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
                  Continue with Google
                </Button>
              </form>
            </Form>
          </ClientOnly>
        </div>
      </div>
      
      <div className="space-y-6">
        <p className="text-center text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-foreground hover:text-primary transition-colors">
            Sign in to Trader&apos;s Journal
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;