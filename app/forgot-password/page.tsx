"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/index';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { LOGO_CONFIG } from '@/lib/logo-config';
import { ArrowLeft, Mail, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
  
    try {
      console.log('Sending password reset email to:', email);
      
      // Generate a unique reset token
      const resetToken = uuidv4();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24 hours

      // Store the reset token in the database
      const { error: tokenError } = await supabase
        .from('password_reset_tokens')
        .insert({
          email: email,
          token: resetToken,
          expires_at: expiresAt.toISOString(),
          used: false
        });

      if (tokenError) {
        console.error('Failed to store reset token:', tokenError);
        throw new Error('Failed to create reset token. Please try again.');
      }

      // Create the reset link
      const resetLink = `${window.location.origin}/reset-password?token=${resetToken}`;

      // Send email using Resend function
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/resend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          subject: 'Password Reset - Trader\'s Journal',
          type: 'passwordReset',
          resetLink: resetLink
        })
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        console.error('Email sending failed:', errorData);
        throw new Error(errorData.error || 'Failed to send email');
      }

      console.log('Password reset email sent successfully');
      
      // Show success modal
      setShowSuccessModal(true);
      
      toast({
        id: `password-reset-${Date.now()}`,
        title: 'Password Reset Email Sent',
        description: 'Check your email for the password reset link',
        variant: 'default'
      });
  
    } catch (error: unknown) {
      console.error('Password reset failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
      
      toast({
        id: `error-${Date.now()}`,
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="w-full max-w-md">
        {/* Main Card */}
        <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-2xl shadow-2xl p-8 space-y-6">
          <div className="flex flex-col items-center">
            <Link href="/" className="hover:opacity-80 transition-all duration-300 hover:scale-105">
              <img 
                src="https://oweimywvzmqoizsyotrt.supabase.co/storage/v1/object/public/tj.images/traders-journal_pro.png" 
                alt="Trader's Journal Logo" 
                className="h-20 w-20 mb-4 drop-shadow-lg" 
              />
            </Link>
            <h2 className="text-3xl font-bold text-foreground mb-2">Forgot Password?</h2>
            <p className="text-muted-foreground text-center text-sm leading-relaxed">
              No worries! Enter your email address and we'll send you a secure link to reset your password.
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl flex items-center space-x-3 animate-in slide-in-from-top-2 duration-300">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-foreground">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-12 h-12 border-border/50 focus:border-primary/50 transition-colors"
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300" 
              disabled={isLoading || !email}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Sending Reset Link...
                </>
              ) : (
                'Send Reset Link'
              )}
            </Button>
          </form>

          <div className="text-center space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Remember your password?{' '}
              <Link 
                href="/login" 
                className="text-primary hover:text-primary/80 font-semibold transition-colors"
              >
                Sign in
              </Link>
            </p>
            <Link 
              href="/login" 
              className="flex items-center justify-center text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Login
            </Link>
          </div>
        </div>
      </div>

      {/* Enhanced Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-2xl shadow-2xl p-8 w-full max-w-md space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-end">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex justify-center">
              <div className="h-20 w-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
            </div>
            
            <div className="text-center space-y-3">
              <h3 className="text-2xl font-bold text-foreground">Check Your Email</h3>
              <p className="text-muted-foreground leading-relaxed">
                We've sent a secure password reset link to{' '}
                <span className="font-semibold text-foreground">{email}</span>. 
                Please check your email and click the link to reset your password.
              </p>
              <p className="text-xs text-muted-foreground">
                The link will expire in 24 hours for security.
              </p>
            </div>
            
            <div className="flex flex-col space-y-3 pt-4">
              <Button 
                onClick={handleBackToLogin}
                className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Back to Login
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowSuccessModal(false)}
                className="w-full h-12 text-base font-semibold"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}