"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LOGO_CONFIG } from '../lib/logo-config';
import { supabase } from '@/lib/supabase/index';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const router = useRouter();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Use Supabase's built-in password reset
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });

      if (error) {
        throw new Error(error.message);
      }

      setShowSuccessModal(true);

    } catch (err) {
      console.error('Password reset error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

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
            Forgot Password?
          </h2>
          <p className="text-muted-foreground text-center mt-2">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="bg-background/50 backdrop-blur-sm border-border/50 focus-visible:ring-primary/50"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </form>

        <div className="text-center">
          <Link 
            href="/login" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4 inline mr-2" />
            Back to Login
          </Link>
        </div>
      </div>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Check Your Email</DialogTitle>
            <DialogDescription>
              We've sent a password reset link to <strong>{email}</strong>. 
              Please check your email and click the link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-2">
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                router.push('/login');
              }}
              className="w-full"
            >
              Go to Login
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
