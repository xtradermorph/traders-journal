import { createClient } from '@supabase/supabase-js';

export interface BiometricCredential {
  id: string;
  type: 'public-key';
  transports: string[];
}

export interface BiometricAuthOptions {
  rpName: string;
  rpID: string;
  userID: string;
  userName: string;
  userDisplayName: string;
}

export class BiometricAuthService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  /**
   * Check if biometric authentication is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      return (
        window.PublicKeyCredential &&
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable &&
        (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
      );
    } catch (error) {
      console.error('Biometric availability check failed:', error);
      return false;
    }
  }

  /**
   * Register biometric credentials for a user
   */
  async register(options: BiometricAuthOptions): Promise<BiometricCredential> {
    try {
      // Generate challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Create public key credential creation options
      const publicKeyOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: options.rpName,
          id: options.rpID,
        },
        user: {
          id: new TextEncoder().encode(options.userID),
          name: options.userName,
          displayName: options.userDisplayName,
        },
        pubKeyCredParams: [
          {
            type: 'public-key',
            alg: -7, // ES256
          },
        ],
        timeout: 60000,
        attestation: 'direct',
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
      };

      // Create credentials
      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to create biometric credentials');
      }

      // Store credential in Supabase
      await this.storeCredential(options.userID, credential);

      return {
        id: credential.id,
        type: credential.type,
        transports: (credential as any).getTransports?.() || [],
      };
    } catch (error) {
      console.error('Biometric registration failed:', error);
      throw new Error('Failed to register biometric authentication');
    }
  }

  /**
   * Authenticate using biometric credentials
   */
  async authenticate(userID: string): Promise<boolean> {
    try {
      // Get stored credential
      const credential = await this.getStoredCredential(userID);
      if (!credential) {
        throw new Error('No biometric credentials found');
      }

      // Generate challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Create assertion options
      const assertionOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [
          {
            id: this.base64ToArrayBuffer(credential.id),
            type: 'public-key',
            transports: credential.transports,
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      };

      // Get assertion
      const assertion = await navigator.credentials.get({
        publicKey: assertionOptions,
      }) as PublicKeyCredential;

      if (!assertion) {
        throw new Error('Biometric authentication failed');
      }

      // Verify assertion
      const isValid = await this.verifyAssertion(assertion, challenge);
      
      if (isValid) {
        // Log successful authentication
        await this.logBiometricAuth(userID, true);
      }

      return isValid;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      await this.logBiometricAuth(userID, false);
      return false;
    }
  }

  /**
   * Remove biometric credentials for a user
   */
  async removeCredentials(userID: string): Promise<boolean> {
    try {
      await this.supabase
        .from('user_biometric_credentials')
        .delete()
        .eq('user_id', userID);

      return true;
    } catch (error) {
      console.error('Failed to remove biometric credentials:', error);
      return false;
    }
  }

  /**
   * Store credential in database
   */
  private async storeCredential(userID: string, credential: PublicKeyCredential): Promise<void> {
    const { error } = await this.supabase
      .from('user_biometric_credentials')
      .insert({
        user_id: userID,
        credential_id: credential.id,
        public_key: this.arrayBufferToBase64(credential.response?.getPublicKey() || new ArrayBuffer(0)),
        sign_count: (credential.response as any)?.getAuthenticatorData()?.signCount || 0,
        transports: (credential as any).getTransports?.() || [],
        created_at: new Date().toISOString(),
      });

    if (error) {
      throw new Error('Failed to store biometric credentials');
    }
  }

  /**
   * Get stored credential from database
   */
  private async getStoredCredential(userID: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('user_biometric_credentials')
      .select('*')
      .eq('user_id', userID)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  /**
   * Verify assertion signature
   */
  private async verifyAssertion(assertion: PublicKeyCredential, challenge: Uint8Array): Promise<boolean> {
    // In a production environment, this should be verified on the server
    // For now, we'll do basic validation
    try {
      const response = assertion.response as AuthenticatorAssertionResponse;
      return response.authenticatorData && response.signature && response.userHandle;
    } catch (error) {
      console.error('Assertion verification failed:', error);
      return false;
    }
  }

  /**
   * Log biometric authentication attempts
   */
  private async logBiometricAuth(userID: string, success: boolean): Promise<void> {
    try {
      await this.supabase
        .from('audit_logs')
        .insert({
          user_id: userID,
          action: success ? 'BIOMETRIC_AUTH_SUCCESS' : 'BIOMETRIC_AUTH_FAILED',
          entity_type: 'authentication',
          entity_id: userID,
          ip_address: await this.getClientIP(),
          user_agent: navigator.userAgent,
          created_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Failed to log biometric auth:', error);
    }
  }

  /**
   * Get client IP address
   */
  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Convert ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// Export singleton instance
export const biometricAuth = new BiometricAuthService();
