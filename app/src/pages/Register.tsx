"use client"

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/index";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { count } from "console";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2 } from "lucide-react";
import Image from 'next/image';
import { Turnstile } from '../../components/ui/turnstile';

const registerSchema = z.object({
  username: z.string()
    .min(6, "Username must be at least 6 characters"),
  email: z.string()
    .email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const Register = () => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState<string | null>(null);

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    }
  });

  const { handleSubmit } = registerForm;

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormValues) => {
      try {
        // Validate the data first
        const validatedData = registerSchema.parse(data);
        
        if (validatedData.password !== validatedData.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          total_trades: 0,
          win_rate: 0,
          medal_type: 'bronze',
          performance_rank: 0,
          role: 'user'
        });
        
        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Continue anyway since the user was created
        }
        
        return authData;
      } catch (error: any) {
        console.error('Submit error:', error);
        throw new Error(error.message || 'Registration failed');
      }
    },
    onSuccess: (data) => {
      console.log('Registration successful:', data);
      setShowSuccessModal(true);
      setIsLoading(false);
      
      // Reset form after successful registration
      registerForm.reset();
      
      // Redirect to login after a delay
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    },
    onError: (error: Error) => {
      console.error('Registration error:', error);
      setError(error.message || 'Registration failed');
      setIsLoading(false);
      
      // Show error toast
      toast.error('Registration Failed', {
        description: error.message || 'An error occurred during registration'
      });
    }
  });

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      setIsLoading(true);
      setError(null);
      setTurnstileError(null);
      
      // Check if Turnstile token is present
      if (!turnstileToken) {
        setTurnstileError('Please complete the security check');
        setIsLoading(false);
        return;
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
    <div 
      className="min-h-screen bg-cover bg-center flex flex-col items-center justify-center p-4 relative"
      style={{ backgroundImage: "url('/images/auth-fullpage-background.jpg')" }}
    > 
      {/* Close button */}
      <Link href="/" passHref legacyBehavior>
        <a className="absolute top-6 right-6 text-primary p-1.5 rounded-full hover:bg-black transition-colors z-10">
          <X size={28} aria-label="Close" />
        </a>
      </Link>
      <div 
        className="w-full max-w-md space-y-8 bg-cover bg-center p-8 sm:p-12 rounded-xl shadow-2xl"
        style={{ backgroundImage: "url('/images/auth-card-background.jpg')" }}
      >
        <div className="flex flex-col items-start w-full">
          <Link href="/" className="hover:opacity-80 transition-opacity self-center mb-4">
            <img src="https://oweimywvzmqoizsyotrt.supabase.co/storage/v1/object/public/tj.images//proper%20logo.png" alt="Logo" className="h-20 w-20 mb-4" />
          </Link>
          <h2 className="text-3xl font-bold text-foreground">
            Sign up for
          </h2>
          <h2 className="text-3xl font-bold gradient-heading">
            Trader's Journal
          </h2>
        </div>

        <Form {...registerForm}>
          <form onSubmit={registerForm.handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-sm">
                {error}
              </div>
            )}

            <FormField
              control={registerForm.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      placeholder="Choose a username" 
                      {...field} 
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
                      type="email" 
                      placeholder="Enter your email" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormField
                control={registerForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a password" 
                          className="pr-10" 
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            registerForm.trigger("password");
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </FormControl>
                    <div className="mt-2">
                      {password && (
                        <>
                          {!hasMinLength && (
                            <div className="flex items-center text-red-500 text-sm">
                              <Check className="mr-1 opacity-0" />
                              <span>Minimum 8 characters</span>
                            </div>
                          )}
                          {!hasUpperCase && (
                            <div className="flex items-center text-red-500 text-sm">
                              <Check className="mr-1 opacity-0" />
                              <span>At least one uppercase letter</span>
                            </div>
                          )}
                          {!hasLowerCase && (
                            <div className="flex items-center text-red-500 text-sm">
                              <Check className="mr-1 opacity-0" />
                              <span>At least one lowercase letter</span>
                            </div>
                          )}
                          {!hasNumber && (
                            <div className="flex items-center text-red-500 text-sm">
                              <Check className="mr-1 opacity-0" />
                              <span>At least one number</span>
                            </div>
                          )}
                          {!hasSpecialChar && (
                            <div className="flex items-center text-red-500 text-sm">
                              <Check className="mr-1 opacity-0" />
                              <span>At least one special character</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <FormMessage />
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
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your password" 
                          className="pr-10"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            registerForm.trigger("confirmPassword");
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Turnstile Security Check */}
            <div className="space-y-2">
              <Turnstile
                siteKey="0x4AAAAAABm43D0IOh0X_ZLm"
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
                className="flex justify-center"
              />
              {turnstileError && (
                <div className="text-sm text-destructive text-center">
                  {turnstileError}
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full text-lg py-6"
              disabled={registerMutation.isPending || !turnstileToken}
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
              className="w-full flex items-center justify-center gap-2 py-6"
              onClick={async () => {
                try {
                  setIsLoading(true);
                  setError(null);
                  
                  // Use signUp with OAuth for registration flow
                  const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: `${window.location.origin}/auth/callback`,
                      queryParams: {
                        access_type: 'offline',
                        prompt: 'consent'
                      }
                    }
                  });
                  
                  if (error) {
                    setError(error.message);
                    console.error('Google sign-up error:', error);
                  } else if (!data.url) {
                    setError('Failed to get authentication URL');
                  } else {
                    // Redirect to Google's OAuth page
                    window.location.href = data.url;
                  }
                } catch (err) {
                  console.error('Exception during Google sign-up:', err);
                  setError('Failed to sign up with Google');
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading || registerMutation.isPending}
            >
              <Image 
                src="/google-logo.svg" 
                alt="Google" 
                width={18} 
                height={18} 
              />
              Sign up with Google
            </Button>
          </form>
        </Form>

        <div className="space-y-6">
          <Separator />
          <p className="text-center text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-foreground hover:text-primary transition-colors">
              Log in to Trader's Journal
            </Link>
          </p>
        </div>
      </div>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-[425px] bg-card">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl font-bold">Registration Successful!</DialogTitle>
            <DialogDescription className="text-center text-base">
              Your account has been created successfully. Check your email to verify your account.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex justify-center">
            <Button 
              onClick={() => {
                setShowSuccessModal(false);
                // Clear form and redirect to login
                registerForm.reset();
                router.push('/login');
              }}
              className="px-8"
            >
              Continue to Login
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Register;