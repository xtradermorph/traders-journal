"use client"

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useToast } from '../src/hooks/use-toast';
import { Button } from '../src/components/ui/button';
import { Input } from '../src/components/ui/input';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '../src/lib/utils';
import { Check, X, Eye, EyeOff } from 'lucide-react';
import { LOGO_CONFIG } from '../src/lib/logo-config';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Separate component for the form content
function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const accessToken = searchParams.get('access_token');
  const refreshToken = searchParams.get('refresh_token');

  // Password validation
  const validatePassword = (password: string) => {
    const errors: {[key: string]: string} = {};
    
    if (password.length < 8) {
      errors.length = 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(password)) {
      errors.uppercase = 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      errors.lowercase = 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      errors.number = 'Password must contain at least one number';
    }
    
    return errors;
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setValidationErrors(validatePassword(value));
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (value !== password) {
      setValidationErrors(prev => ({ ...prev, confirm: 'Passwords do not match' }));
    } else {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.confirm;
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accessToken || !refreshToken) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Check for validation errors
    const passwordErrors = validatePassword(password);
    if (Object.keys(passwordErrors).length > 0) {
      setValidationErrors(passwordErrors);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          confirmPassword,
          accessToken,
          refreshToken,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        toast({
          title: "Password Reset Successful",
          description: "Your password has been updated successfully. You will receive a confirmation email shortly.",
        });
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (err) {
      setError('An error occurred while resetting your password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessOk = () => {
    router.push('/login');
  };

  // Check if we have valid tokens
  useEffect(() => {
    if (!accessToken || !refreshToken) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [accessToken, refreshToken]);

  if (error && !accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Image
              src={LOGO_CONFIG.MAIN_LOGO_URL}
              alt={LOGO_CONFIG.ALT_TEXT}
              width={48}
              height={48}
              className="mx-auto h-12 w-auto"
            />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Invalid Reset Link
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {error}
            </p>
          </div>
          <div className="mt-8 space-y-6">
            <div className="text-center">
              <Link
                href="/login"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Return to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Image
            src={LOGO_CONFIG.MAIN_LOGO_URL}
            alt={LOGO_CONFIG.ALT_TEXT}
            width={48}
            height={48}
            className="mx-auto h-12 w-auto"
          />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Reset Your Password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your new password below
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <X className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {error}
                  </h3>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <div className="mt-1 relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className={cn(
                    "pr-10",
                    Object.keys(validationErrors).length > 0 && "border-red-300 focus:border-red-500 focus:ring-red-500"
                  )}
                  placeholder="Enter your new password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              
              {/* Password validation indicators */}
              <div className="mt-2 space-y-1">
                <div className={cn("flex items-center text-xs", password.length >= 8 ? "text-green-600" : "text-gray-400")}>
                  <Check className={cn("h-3 w-3 mr-1", password.length >= 8 ? "text-green-600" : "text-gray-400")} />
                  At least 8 characters
                </div>
                <div className={cn("flex items-center text-xs", /[A-Z]/.test(password) ? "text-green-600" : "text-gray-400")}>
                  <Check className={cn("h-3 w-3 mr-1", /[A-Z]/.test(password) ? "text-green-600" : "text-gray-400")} />
                  One uppercase letter
                </div>
                <div className={cn("flex items-center text-xs", /[a-z]/.test(password) ? "text-green-600" : "text-gray-400")}>
                  <Check className={cn("h-3 w-3 mr-1", /[a-z]/.test(password) ? "text-green-600" : "text-gray-400")} />
                  One lowercase letter
                </div>
                <div className={cn("flex items-center text-xs", /[0-9]/.test(password) ? "text-green-600" : "text-gray-400")}>
                  <Check className={cn("h-3 w-3 mr-1", /[0-9]/.test(password) ? "text-green-600" : "text-gray-400")} />
                  One number
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <div className="mt-1 relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  className={cn(
                    "pr-10",
                    validationErrors.confirm && "border-red-300 focus:border-red-500 focus:ring-red-500"
                  )}
                  placeholder="Confirm your new password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {validationErrors.confirm && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.confirm}</p>
              )}
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={isLoading || Object.keys(validationErrors).length > 0 || password !== confirmPassword}
              className="w-full"
            >
              {isLoading ? "Resetting Password..." : "Reset Password"}
            </Button>
          </div>

          <div className="text-center">
            <Link
              href="/login"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Back to Login
            </Link>
          </div>
        </form>
      </div>

      {/* Success Dialog */}
      <Dialog open={isSuccess} onOpenChange={setIsSuccess}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Check className="h-5 w-5 text-green-600 mr-2" />
              Password Reset Successful
            </DialogTitle>
            <DialogDescription>
              Your password has been successfully updated. You will receive a confirmation email with your new password details shortly.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={handleSuccessOk}>
              Continue to Login
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Main component with Suspense boundary
export default function ResetPassword() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}