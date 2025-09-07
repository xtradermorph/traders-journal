"use client"

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/index';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { LOGO_CONFIG } from '@/lib/logo-config';
import { Eye, EyeOff, CheckCircle, AlertCircle, Loader2, X, Lock } from 'lucide-react';

// Separate component that uses useSearchParams
function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    // Check if we have a valid token for password reset
    checkToken();
  }, []);

  const checkToken = async () => {
    try {
      // Get URL parameters that Supabase includes in the reset link
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const type = searchParams.get('type');
      const code = searchParams.get('code');

      console.log('URL params:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type, code: !!code });

      // If we have tokens in the URL, set the session
      if (accessToken && refreshToken && type === 'recovery') {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (error) {
          console.error('Session setting error:', error);
          setError('Invalid reset link. Please check your email or request a new password reset.');
          setIsValidToken(false);
          return;
        }

        if (data.session) {
          setEmail(data.session.user.email || '');
          setIsValidToken(true);

          // Get username from profiles table
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username')
            .eq('email', data.session.user.email)
            .single();

          if (profileData) {
            setUsername(profileData.username);
          }
          return;
        }
      }

      // If we have a code parameter, this might be from the auth callback
      if (code && type === 'recovery') {
        // The auth callback should have already handled this, but let's check the session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error after callback:', error);
          setError('Invalid reset link. Please check your email or request a new password reset.');
          setIsValidToken(false);
          return;
        }

        if (session && session.user) {
          setEmail(session.user.email || '');
          setIsValidToken(true);

          // Get username from profiles table
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username')
            .eq('email', session.user.email)
            .single();

          if (profileData) {
            setUsername(profileData.username);
          }
          return;
        }
      }

      // Fallback: check existing session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session error:', error);
        setError('Invalid reset link. Please check your email or request a new password reset.');
        setIsValidToken(false);
        return;
      }

      if (!session) {
        setError('Invalid reset link. Please check your email or request a new password reset.');
        setIsValidToken(false);
        return;
      }

      setEmail(session.user.email || '');
      setIsValidToken(true);

      // Get username from profiles table
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username')
        .eq('email', session.user.email)
        .single();

      if (profileData) {
        setUsername(profileData.username);
      }

    } catch (err) {
      console.error('Token check error:', err);
      setError('An error occurred while validating the reset link. Please try again.');
      setIsValidToken(false);
    }
  };


  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Update password using Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      setSuccess(true);
      setShowSuccessModal(true);

    } catch (err) {
      console.error('Password reset error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while resetting your password');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValidToken && error) {
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
              Reset Password
            </h2>
          </div>
          
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>

          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              Please request a new password reset link from the login page.
            </p>
            <Button asChild className="w-full">
              <Link href="/forgot-password">Request New Reset Link</Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/login">Back to Login</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
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
            <div className="flex justify-center mb-4">
              <div className="h-20 w-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-foreground">
              Password Reset Successful!
            </h2>
            <p className="text-muted-foreground text-center mt-2">
              Your password has been successfully updated. You can now log in with your new password.
            </p>
          </div>

          <div className="space-y-4">
            <Button asChild className="w-full">
              <Link href="/login">Go to Login</Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/">Go to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
            Reset Your Password
          </h2>
          <p className="text-muted-foreground text-center mt-2">
            Enter your new password below.
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="bg-background/50 backdrop-blur-sm border-border/50 focus-visible:ring-primary/50 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                className="bg-background/50 backdrop-blur-sm border-border/50 focus-visible:ring-primary/50 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating Password...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Update Password
              </>
            )}
          </Button>
        </form>

        <div className="text-center">
          <Link 
            href="/login" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function ResetPassword() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cover bg-center flex items-center justify-center"
        style={{ backgroundImage: "url('/images/auth-fullpage-background.jpg')" }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}