/**
 * Development utilities for bypassing verification in development mode
 */

/**
 * Check if the app is running in development mode
 */
export function isDevelopmentMode(): boolean {
  // Check multiple indicators of development mode
  const isDev = (
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === 'development' ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview' ||
    process.env.NEXT_PUBLIC_APP_ENV === 'development' ||
    (typeof window !== 'undefined' && window.location.hostname === 'localhost') ||
    (typeof window !== 'undefined' && window.location.hostname.includes('localhost')) ||
    (typeof window !== 'undefined' && window.location.hostname.includes('127.0.0.1')) ||
    (typeof window !== 'undefined' && window.location.hostname.includes('0.0.0.0'))
  );

  // Log the development mode status for debugging
  if (typeof window !== 'undefined') {
    console.log('🔧 Development Mode Check:', {
      isDev,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV,
      appEnv: process.env.NEXT_PUBLIC_APP_ENV,
      hostname: window.location.hostname
    });
  }

  return isDev;
}

/**
 * Check if Turnstile should be enabled
 * Returns false in development mode, true in production
 */
export function shouldEnableTurnstile(): boolean {
  const isDev = isDevelopmentMode();
  const hasTurnstileKey = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  
  // Only enable Turnstile in production AND if the key is configured
  const shouldEnable = !isDev && hasTurnstileKey;
  
  // Log the Turnstile status for debugging
  if (typeof window !== 'undefined') {
    console.log('🛡️ Turnstile Status:', {
      shouldEnable,
      isDev,
      hasTurnstileKey,
      turnstileKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? 'Configured' : 'Not configured'
    });
  }
  
  return shouldEnable;
}

/**
 * Get Turnstile site key with fallback
 */
export function getTurnstileSiteKey(): string {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAABm43D0IOh0X_ZLm";
}

/**
 * Log development mode status for debugging
 */
export function logDevelopmentStatus(): void {
  if (typeof window !== 'undefined') {
    const isDev = isDevelopmentMode();
    const turnstileEnabled = shouldEnableTurnstile();
    
    console.log('🔧 Development Mode Status:', {
      isDevelopment: isDev,
      turnstileEnabled,
      hostname: window.location.hostname,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV,
      hasTurnstileKey: !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    });
  }
}
