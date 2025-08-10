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
};

export const updateCookieConsent = (preferences: CookiePreferences): void => {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('cookieConsent', JSON.stringify(preferences));
  localStorage.setItem('cookieConsentDate', new Date().toISOString());
};
