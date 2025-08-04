// Logo configuration for Trader's Journal
// This file centralizes all logo URLs to ensure consistency across the application

export const LOGO_CONFIG = {
  // Main application logo URL from Supabase storage
  MAIN_LOGO_URL: "https://oweimywvzmqoizsyotrt.supabase.co/storage/v1/object/public/tj.images/traders-journal.png",
  
  // Email template logo URL from Supabase storage (same as main logo for consistency)
  EMAIL_LOGO_URL: "https://oweimywvzmqoizsyotrt.supabase.co/storage/v1/object/public/tj.images/traders-journal.png",
  
  // Logo alt text
  ALT_TEXT: "Trader's Journal Logo",
  
  // Common logo sizes used throughout the app
  SIZES: {
    SMALL: "h-8 w-8",
    MEDIUM: "h-10 w-10", 
    LARGE: "h-16 w-16",
    XLARGE: "h-20 w-20"
  }
} as const;

// Helper function to get logo with specific size
export const getLogoWithSize = (size: keyof typeof LOGO_CONFIG.SIZES) => {
  return {
    src: LOGO_CONFIG.MAIN_LOGO_URL,
    alt: LOGO_CONFIG.ALT_TEXT,
    className: LOGO_CONFIG.SIZES[size]
  };
}; 