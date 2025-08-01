'use client'

import { supabase } from '@/lib/supabase/index';

// This function will prompt the user to add API keys
export const askSecretsFunction = async (): Promise<void> => {
  // In a real implementation, this would redirect to settings page
  // or open a modal to enter API keys
  console.log("AI API key required for advanced features");
  
  // For better UX, we'll use a more user-friendly approach
  if (typeof window !== 'undefined') {
    const confirmed = window.confirm(
      "AI features require an API key. Would you like to go to settings to add your API key?"
    );
    
    if (confirmed) {
      window.location.href = '/settings?tab=api';
    }
  }
};

// Check if we have the necessary API keys
export const checkApiKeys = async (): Promise<boolean> => {
  try {
    // First check if we're in a browser environment
    if (typeof window === 'undefined') return false;
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    // Check if user has API keys stored in their profile
    const { data, error } = await supabase
      .from('user_settings')
      .select('ai_api_key')
      .eq('user_id', user.id)
      .single();
    
    if (error || !data || !data.ai_api_key) {
      console.warn("Missing AI API key - some features may be limited");
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error checking API keys:", error);
    return false;
  }
};