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
import { Eye, EyeOff } from "lucide-react";
import { Session, User } from '@supabase/supabase-js';
import Image from 'next/image';
import { Turnstile } from '../../components/ui/turnstile';

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

interface RegisterResponse {
  user: User;
  session: Session;
  error?: Error;
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
    // Check both NODE_ENV and domain to ensure proper detection
    const isDev = process.env.NODE_ENV === 'development' || 
                  window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1';
    setIsDevelopment(isDev);
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
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
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
        
        if (!authData.user) {
          throw new Error('No user data returned');
        }
        
        console.log('User created successfully:', authData.user);
        
        // Create profile manually
        const { error: profileError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          username: data.username,
          email: data.email.toLowerCase().trim(),
          created_at: new Date().toISOString()
        });
        
        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Don't throw error here as user is already created
        }
        
        return authData;
      } catch (error) {
        console.error('Registration error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
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
      
      // Skip Turnstile check in development mode
      if (!isDevelopment) {
        // Check if Turnstile token is present
        if (!turnstileToken) {
          setTurnstileError('Please complete the security check');
          setIsLoading(false);
          return;
        }
      }
      
      await registerMutation.mutateAsync(data);
    } catch (error: any) {
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
    <ClientOnly>
      <div 
        className="min-h-screen bg-cover bg-center flex flex-col items-center justify-center p-4 relative"
        style={{ backgroundImage: "url('/images/auth-fullpage-background.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/50"></div>
        
        <div className="relative z-10 w-full max-w-md">
          <div className="w-full max-w-md space-y-8 bg-cover bg-center p-8 sm:p-12 rounded-xl shadow-2xl"
            style={{ backgroundImage: "url('/images/auth-card-background.jpg')" }}
          >
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Create Account
              </h1>
              <p className="text-muted-foreground">
                Join Trader's Journal and start tracking your trades
              </p>
            </div>

            <Form {...registerForm}>
              <form onSubmit={registerForm.handleSubmit(onSubmit)} className="space-y-4">
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
                          className="h-12"
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
                          className={`h-12 ${
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
                            className="h-12 pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
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
                            className="h-12 pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
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

                {/* Turnstile Security Check - Only show in production */}
                {!isDevelopment && (
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
                      action="register"
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

                

                <Button 
                  type="submit" 
                  className="w-full text-lg py-6"
                  disabled={
                    registerMutation.isPending || 
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
                  {registerMutation.isPending ? "Creating account..." : "Create Account"}
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
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary hover:underline">
                    Sign in
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

export default Register;