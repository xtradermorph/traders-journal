'use client';

import React, { useState, useEffect } from 'react';
import { biometricAuth, BiometricAuthOptions } from '../lib/biometric-auth';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Fingerprint, 
  Smartphone, 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Loader2 
} from 'lucide-react';

interface BiometricAuthProps {
  userId: string;
  userName: string;
  userDisplayName: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  mode?: 'register' | 'authenticate';
  className?: string;
}

export const BiometricAuth: React.FC<BiometricAuthProps> = ({
  userId,
  userName,
  userDisplayName,
  onSuccess,
  onError,
  mode = 'authenticate',
  className = '',
}) => {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean | null>(null);

  useEffect(() => {
    checkAvailability();
    checkRegistrationStatus();
  }, [userId]);

  const checkAvailability = async () => {
    try {
      const available = await biometricAuth.isAvailable();
      setIsAvailable(available);
    } catch (error) {
      console.error('Failed to check biometric availability:', error);
      setIsAvailable(false);
    }
  };

  const checkRegistrationStatus = async () => {
    try {
      // This would check if user has registered biometric credentials
      // For now, we'll assume not registered
      setIsRegistered(false);
    } catch (error) {
      console.error('Failed to check registration status:', error);
      setIsRegistered(false);
    }
  };

  const handleRegister = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const options: BiometricAuthOptions = {
        rpName: 'Trader\'s Journal',
        rpID: window.location.hostname,
        userID: userId,
        userName: userName,
        userDisplayName: userDisplayName,
      };

      await biometricAuth.register(options);
      setIsRegistered(true);
      setSuccess(true);
      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthenticate = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const isValid = await biometricAuth.authenticate(userId);
      if (isValid) {
        setSuccess(true);
        onSuccess?.();
      } else {
        setError('Biometric authentication failed');
        onError?.('Biometric authentication failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveCredentials = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await biometricAuth.removeCredentials(userId);
      setIsRegistered(false);
      setSuccess(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove credentials';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isAvailable === null) {
    return (
      <Card className={`animate-pulse ${className}`}>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!isAvailable) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Biometric Authentication Not Available
          </CardTitle>
          <CardDescription>
            Your device doesn't support biometric authentication or it's not enabled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              To use biometric authentication, ensure your device supports Face ID, Touch ID, 
              or Windows Hello, and that it's properly configured.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5 text-blue-500" />
          Biometric Authentication
        </CardTitle>
        <CardDescription>
          Secure your account with Face ID, Touch ID, or Windows Hello
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Status:</span>
          <Badge variant={isRegistered ? "default" : "secondary"}>
            {isRegistered ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Registered
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Not Registered
              </>
            )}
          </Badge>
        </div>

        {/* Features List */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-green-500" />
            <span>Secure biometric verification</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Smartphone className="h-4 w-4 text-blue-500" />
            <span>Works with Face ID, Touch ID, and Windows Hello</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>No passwords to remember</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {mode === 'register' && !isRegistered && (
            <Button
              onClick={handleRegister}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting up biometric authentication...
                </>
              ) : (
                <>
                  <Fingerprint className="h-4 w-4 mr-2" />
                  Set Up Biometric Authentication
                </>
              )}
            </Button>
          )}

          {mode === 'authenticate' && isRegistered && (
            <Button
              onClick={handleAuthenticate}
              disabled={isLoading}
              className="w-full"
              size="lg"
              variant="default"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Fingerprint className="h-4 w-4 mr-2" />
                  Authenticate with Biometrics
                </>
              )}
            </Button>
          )}

          {isRegistered && (
            <Button
              onClick={handleRemoveCredentials}
              disabled={isLoading}
              className="w-full"
              variant="outline"
              size="sm"
            >
              Remove Biometric Credentials
            </Button>
          )}
        </div>

        {/* Success/Error Messages */}
        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {mode === 'register' 
                ? 'Biometric authentication has been successfully set up!'
                : 'Authentication successful!'
              }
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Security Note */}
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
          <strong>Security Note:</strong> Biometric data is stored securely on your device 
          and is never transmitted to our servers. Your biometric information remains 
          completely private and under your control.
        </div>
      </CardContent>
    </Card>
  );
};

export default BiometricAuth;
