export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  functional: boolean;
}

export const getCookieConsent = (): CookiePreferences | null => {
  if (typeof window === 'undefined') return null;
  
  const consent = localStorage.getItem('cookieConsent');
  if (!consent) return null;
  
  try {
    return JSON.parse(consent) as CookiePreferences;
  } catch {
    return null;
  }
};

export const hasCookieConsent = (type: keyof CookiePreferences): boolean => {
  const consent = getCookieConsent();
  return consent ? consent[type] : false;
};

export const isAnalyticsEnabled = (): boolean => {
  return hasCookieConsent('analytics');
};

export const isFunctionalEnabled = (): boolean => {
  return hasCookieConsent('functional');
};

export const clearCookieConsent = (): void => {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('cookieConsent');
  localStorage.removeItem('cookieConsentDate');
  
  // Clear all non-essential cookies
  clearAnalyticsCookies();
  clearFunctionalCookies();
};

export const updateCookieConsent = (preferences: CookiePreferences): void => {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('cookieConsent', JSON.stringify(preferences));
  localStorage.setItem('cookieConsentDate', new Date().toISOString());
  
  // Apply the preferences
  applyCookiePreferences(preferences);
};

// Apply cookie preferences based on user consent
export const applyCookiePreferences = (preferences: CookiePreferences): void => {
  if (typeof window === 'undefined') return;
  
  // Analytics cookies
  if (preferences.analytics) {
    enableAnalytics();
  } else {
    disableAnalytics();
  }
  
  // Functional cookies
  if (preferences.functional) {
    enableFunctionalCookies();
  } else {
    disableFunctionalCookies();
  }
};

// Analytics cookie management
const enableAnalytics = (): void => {
  if (typeof window === 'undefined') return;
  
  // Initialize Google Analytics if available
  if (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
    // Load Google Analytics script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);
    
    // Initialize gtag
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).gtag = function() {
      (window as any).dataLayer.push(arguments);
    };
    (window as any).gtag('js', new Date());
    (window as any).gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
      anonymize_ip: true,
      cookie_flags: 'SameSite=None;Secure'
    });
  }
  
  // Enable Cloudflare Analytics if available
  if (process.env.NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN) {
    // Cloudflare Analytics is already loaded in layout.tsx
    // We just need to ensure it's not blocked
    console.log('Analytics enabled');
  }
};

const disableAnalytics = (): void => {
  if (typeof window === 'undefined') return;
  
  // Remove Google Analytics
  if ((window as any).gtag) {
    // Clear dataLayer
    (window as any).dataLayer = [];
    delete (window as any).gtag;
  }
  
  // Remove GA script
  const gaScript = document.querySelector('script[src*="googletagmanager.com"]');
  if (gaScript) {
    gaScript.remove();
  }
  
  // Clear analytics cookies
  clearAnalyticsCookies();
  
  console.log('Analytics disabled');
};

const clearAnalyticsCookies = (): void => {
  if (typeof window === 'undefined') return;
  
  // Clear Google Analytics cookies
  const cookiesToClear = [
    '_ga',
    '_ga_*',
    '_gid',
    '_gat',
    '__utma',
    '__utmb',
    '__utmc',
    '__utmt',
    '__utmz'
  ];
  
  cookiesToClear.forEach(cookieName => {
    if (cookieName.includes('*')) {
      // Handle wildcard cookies
      const baseName = cookieName.replace('*', '');
      Object.keys(document.cookie.split(';').reduce((acc, cookie) => {
        const [name] = cookie.split('=');
        if (name.trim().startsWith(baseName)) {
          acc[name.trim()] = true;
        }
        return acc;
      }, {} as Record<string, boolean>)).forEach(name => {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      });
    } else {
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }
  });
};

// Functional cookie management
const enableFunctionalCookies = (): void => {
  if (typeof window === 'undefined') return;
  
  // Enable any functional features that require cookies
  // For example: user preferences, theme settings, etc.
  console.log('Functional cookies enabled');
};

const disableFunctionalCookies = (): void => {
  if (typeof window === 'undefined') return;
  
  // Disable functional features
  console.log('Functional cookies disabled');
};

const clearFunctionalCookies = (): void => {
  if (typeof window === 'undefined') return;
  
  // Clear functional cookies (customize based on your needs)
  const functionalCookies = [
    'theme-preference',
    'user-preferences',
    'language-preference'
  ];
  
  functionalCookies.forEach(cookieName => {
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  });
};

// Initialize cookie preferences on app load
export const initializeCookiePreferences = (): void => {
  if (typeof window === 'undefined') return;
  
  const consent = getCookieConsent();
  if (consent) {
    applyCookiePreferences(consent);
  }
};
