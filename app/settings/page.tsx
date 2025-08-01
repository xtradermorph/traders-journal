"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from '@/components/ui/switch';
import { EnhancedSwitch } from '@/components/ui/enhanced-switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Save, Bell, Monitor, Lock, Sparkles, AlertCircle, Loader2, Check } from 'lucide-react';
import timezoneData from './timezones-full';
import DashboardFooter from '@/components/DashboardFooter';
import { LoadingPage } from '../components/ui/loading-spinner';

// Types
interface UserSettings {
  id?: string;
  user_id: string;
  theme: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  default_currency: string;
  timezone: string | null;
  pips_or_percentage: string;
  chart_timeframe: string;
  share_statistics: boolean;
  public_profile: boolean;
  weekly_reports: boolean;
  monthly_reports: boolean;
  quarterly_reports: boolean;
  yearly_reports: boolean;
  ai_api_key: string;
  email_project_updates?: boolean;
  created_at?: string;
  updated_at?: string;
  recent_trades_count?: number;
  performance_view?: 'total' | 'currentWeek';
  // Individual notification preferences
  email_friend_requests?: boolean;
  email_trade_shared?: boolean;
  email_medal_achievement?: boolean;
  push_friend_requests?: boolean;
  push_trade_shared?: boolean;
  push_medal_achievement?: boolean;
  monthly_trade_checkup?: boolean;
}

interface TimezoneOption {
  value: string;
  label: string;
  offset: number;
  abbr: string;
}

export default function SettingsPage() {
  const supabase = createClientComponentClient();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(true);
  const [selectOpen, setSelectOpen] = useState(false);
  const [searchBuffer, setSearchBuffer] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<UserSettings | null>(null);
  
  // Settings state
  const [settings, setSettings] = useState<UserSettings>({
    user_id: '',
    theme: 'system',
    notifications_enabled: false,
    email_notifications: false,
    default_currency: 'USD',
    timezone: null,
    pips_or_percentage: 'currency',
    chart_timeframe: 'daily',
    share_statistics: false,
    public_profile: false,
    weekly_reports: false,
    monthly_reports: false,
    quarterly_reports: false,
    yearly_reports: false,
    ai_api_key: '',
    email_project_updates: false,
    recent_trades_count: 5,
    performance_view: 'total',
    // Individual notification preferences
    email_friend_requests: false,
    email_trade_shared: false,
    email_medal_achievement: false,
    push_friend_requests: false,
    push_trade_shared: false,
    push_medal_achievement: false,
    monthly_trade_checkup: false,
  });

  // Individual notification preferences are now stored in the main settings state

  // Professional, Windows-style timezone list: major capitals only (expanded)
  const timezoneOptions = [
    { value: 'Etc/GMT+12', label: '(UTC-12:00) International Date Line West', offset: -12, abbr: 'GMT-12' },
    { value: 'Pacific/Pago_Pago', label: '(UTC-11:00) Pago Pago', offset: -11, abbr: 'SST' },
    { value: 'Pacific/Honolulu', label: '(UTC-10:00) Honolulu', offset: -10, abbr: 'HST' },
    { value: 'America/Anchorage', label: '(UTC-09:00) Anchorage', offset: -9, abbr: 'AKST' },
    { value: 'America/Los_Angeles', label: '(UTC-08:00) Los Angeles', offset: -8, abbr: 'PST' },
    { value: 'America/Tijuana', label: '(UTC-08:00) Tijuana', offset: -8, abbr: 'PST' },
    { value: 'America/Denver', label: '(UTC-07:00) Denver', offset: -7, abbr: 'MST' },
    { value: 'America/Phoenix', label: '(UTC-07:00) Phoenix', offset: -7, abbr: 'MST' },
    { value: 'America/Chicago', label: '(UTC-06:00) Chicago', offset: -6, abbr: 'CST' },
    { value: 'America/Mexico_City', label: '(UTC-06:00) Mexico City', offset: -6, abbr: 'CST' },
    { value: 'America/Bogota', label: '(UTC-05:00) Bogota', offset: -5, abbr: 'COT' },
    { value: 'America/New_York', label: '(UTC-05:00) New York', offset: -5, abbr: 'EST' },
    { value: 'America/Toronto', label: '(UTC-05:00) Toronto', offset: -5, abbr: 'EST' },
    { value: 'America/Caracas', label: '(UTC-04:00) Caracas', offset: -4, abbr: 'VET' },
    { value: 'America/Santiago', label: '(UTC-04:00) Santiago', offset: -4, abbr: 'CLT' },
    { value: 'America/Halifax', label: '(UTC-04:00) Halifax', offset: -4, abbr: 'AST' },
    { value: 'America/Sao_Paulo', label: '(UTC-03:00) Sao Paulo', offset: -3, abbr: 'BRT' },
    { value: 'America/Buenos_Aires', label: '(UTC-03:00) Buenos Aires', offset: -3, abbr: 'ART' },
    { value: 'America/Godthab', label: '(UTC-03:00) Nuuk', offset: -3, abbr: 'WGT' },
    { value: 'Atlantic/South_Georgia', label: '(UTC-02:00) South Georgia', offset: -2, abbr: 'GST' },
    { value: 'Atlantic/Azores', label: '(UTC-01:00) Azores', offset: -1, abbr: 'AZOT' },
    { value: 'Atlantic/Cape_Verde', label: '(UTC-01:00) Cape Verde', offset: -1, abbr: 'CVT' },
    { value: 'UTC', label: '(UTC+00:00) Coordinated Universal Time', offset: 0, abbr: 'UTC' },
    { value: 'Europe/London', label: '(UTC+00:00) London', offset: 0, abbr: 'GMT' },
    { value: 'Europe/Lisbon', label: '(UTC+00:00) Lisbon', offset: 0, abbr: 'WET' },
    { value: 'Europe/Dublin', label: '(UTC+00:00) Dublin', offset: 0, abbr: 'GMT' },
    { value: 'Europe/Paris', label: '(UTC+01:00) Paris', offset: 1, abbr: 'CET' },
    { value: 'Europe/Berlin', label: '(UTC+01:00) Berlin', offset: 1, abbr: 'CET' },
    { value: 'Europe/Budapest', label: '(UTC+01:00) Budapest', offset: 1, abbr: 'CET' },
    { value: 'Europe/Rome', label: '(UTC+01:00) Rome', offset: 1, abbr: 'CET' },
    { value: 'Europe/Prague', label: '(UTC+01:00) Prague', offset: 1, abbr: 'CET' },
    { value: 'Europe/Warsaw', label: '(UTC+01:00) Warsaw', offset: 1, abbr: 'CET' },
    { value: 'Europe/Athens', label: '(UTC+02:00) Athens', offset: 2, abbr: 'EET' },
    { value: 'Europe/Bucharest', label: '(UTC+02:00) Bucharest', offset: 2, abbr: 'EET' },
    { value: 'Europe/Helsinki', label: '(UTC+02:00) Helsinki', offset: 2, abbr: 'EET' },
    { value: 'Africa/Cairo', label: '(UTC+02:00) Cairo', offset: 2, abbr: 'EET' },
    { value: 'Europe/Moscow', label: '(UTC+03:00) Moscow', offset: 3, abbr: 'MSK' },
    { value: 'Asia/Jerusalem', label: '(UTC+02:00) Jerusalem', offset: 2, abbr: 'IST' },
    { value: 'Asia/Istanbul', label: '(UTC+03:00) Istanbul', offset: 3, abbr: 'TRT' },
    { value: 'Asia/Dubai', label: '(UTC+04:00) Dubai', offset: 4, abbr: 'GST' },
    { value: 'Asia/Karachi', label: '(UTC+05:00) Karachi', offset: 5, abbr: 'PKT' },
    { value: 'Asia/Kolkata', label: '(UTC+05:30) New Delhi', offset: 5.5, abbr: 'IST' },
    { value: 'Asia/Dhaka', label: '(UTC+06:00) Dhaka', offset: 6, abbr: 'BDT' },
    { value: 'Asia/Bangkok', label: '(UTC+07:00) Bangkok', offset: 7, abbr: 'ICT' },
    { value: 'Asia/Singapore', label: '(UTC+08:00) Singapore', offset: 8, abbr: 'SGT' },
    { value: 'Asia/Hong_Kong', label: '(UTC+08:00) Hong Kong', offset: 8, abbr: 'HKT' },
    { value: 'Asia/Shanghai', label: '(UTC+08:00) Beijing', offset: 8, abbr: 'CST' },
    { value: 'Asia/Tokyo', label: '(UTC+09:00) Tokyo', offset: 9, abbr: 'JST' },
    { value: 'Asia/Seoul', label: '(UTC+09:00) Seoul', offset: 9, abbr: 'KST' },
    { value: 'Australia/Perth', label: '(UTC+08:00) Perth', offset: 8, abbr: 'AWST' },
    { value: 'Australia/Adelaide', label: '(UTC+09:30) Adelaide', offset: 9.5, abbr: 'ACST' },
    { value: 'Australia/Sydney', label: '(UTC+10:00) Sydney', offset: 10, abbr: 'AEST' },
    { value: 'Pacific/Auckland', label: '(UTC+12:00) Auckland', offset: 12, abbr: 'NZST' },
    { value: 'Pacific/Fiji', label: '(UTC+12:00) Suva', offset: 12, abbr: 'FJT' },
    { value: 'Pacific/Tongatapu', label: '(UTC+13:00) Nuku\'alofa', offset: 13, abbr: 'TOT' },
  ];

  // Auto-detect timezone
  const systemTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'UTC';
    }
  }, []);

  // Find current timezone display name
  const currentTimezoneDisplay = useMemo(() => {
    const currentTz = settings.timezone || systemTimezone;
    const found = timezoneOptions.find(tz => tz.value === currentTz);
    return found ? found.label : currentTz;
  }, [settings.timezone, systemTimezone]);

  // Load settings from database
  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading settings:', error);
        toast({
          title: "Error",
          description: "Failed to load settings"
        });
        return;
      }

      if (data && data[0]) {
        const userSettings = data[0];
        const loadedSettings = {
          ...userSettings,
          timezone: userSettings.timezone || null,
          email_project_updates: userSettings.email_project_updates ?? false,
          recent_trades_count: userSettings.recent_trades_count ?? 5,
          performance_view: userSettings.performance_view || 'total',
          // Individual notification preferences
          email_friend_requests: userSettings.email_friend_requests ?? false,
          email_trade_shared: userSettings.email_trade_shared ?? false,
          email_medal_achievement: userSettings.email_medal_achievement ?? false,
          push_friend_requests: userSettings.push_friend_requests ?? false,
          push_trade_shared: userSettings.push_trade_shared ?? false,
          push_medal_achievement: userSettings.push_medal_achievement ?? false,
          monthly_trade_checkup: userSettings.monthly_trade_checkup ?? false,
        };
        setSettings(loadedSettings);
        setOriginalSettings(loadedSettings);
        
        // Set auto-detect state based on whether user has a custom timezone
        setAutoDetectEnabled(!userSettings.timezone);
        
        // Apply theme immediately
        if (userSettings.theme) {
          setTheme(userSettings.theme);
        }
      } else {
        // Set default user_id for new settings
        const defaultSettings = { ...settings, user_id: user.id };
        setSettings(defaultSettings);
        setOriginalSettings(defaultSettings);
        setAutoDetectEnabled(true);
      }
    } catch (error) {
      console.error('Error in loadSettings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings"
      });
    } finally {
      setInitialLoad(false);
      setLoading(false);
    }
  };

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login?redirect=/settings');
        return;
      }
      
      setAuthLoading(false);
    };

    checkAuth();
  }, [router, supabase.auth]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectOpen) {
        return;
      }
      
      const key = event.key.toLowerCase();
      
      // Only handle single letters
      if (key.length === 1 && /[a-z]/.test(key)) {
        
        // Clear previous timeout
        if (searchTimeout) {
          clearTimeout(searchTimeout);
        }
        
        // Build search string
        const newSearch = searchBuffer + key;
        setSearchBuffer(newSearch);
        
        // Find first timezone starting with the search string
        const matchingIndex = timezoneOptions.findIndex(tz => {
          const searchLower = newSearch.toLowerCase();
          const labelLower = tz.label.toLowerCase();
          const valueLower = tz.value.toLowerCase();
          const abbrLower = tz.abbr.toLowerCase();
          
          // Priority 1: Exact starts with match in label
          if (labelLower.startsWith(searchLower)) return true;
          
          // Priority 2: Exact starts with match in value
          if (valueLower.startsWith(searchLower)) return true;
          
          // Priority 3: Contains match in label (for partial matches)
          if (labelLower.includes(searchLower)) return true;
          
          // Priority 4: Contains match in value
          if (valueLower.includes(searchLower)) return true;
          
          // Priority 5: Abbreviation match
          if (abbrLower.startsWith(searchLower)) return true;
          
          return false;
        });
        
        if (matchingIndex !== -1) {
          const matchedTimezone = timezoneOptions[matchingIndex];

          // Auto-select the matched timezone
          updateSetting('timezone', matchedTimezone.value);
          
          // Scroll to the matching timezone
          setTimeout(() => {
            // Try multiple approaches to find the dropdown
            let timezoneSelect = document.querySelector('.timezone-selector [data-radix-select-content]') ||
                                document.querySelector('.timezone-selector [role="listbox"]') ||
                                document.querySelector('[data-radix-select-content]') ||
                                document.querySelector('[role="listbox"]');
            
            if (timezoneSelect) {
              // Only get items within this specific timezone dropdown
              const timezoneItems = timezoneSelect.querySelectorAll('[data-radix-select-item], [role="option"]');
              
              if (timezoneItems && timezoneItems[matchingIndex]) {
                // Custom slow smooth scroll
                const item = timezoneItems[matchingIndex] as HTMLElement;
                const container = timezoneSelect as HTMLElement;
                if (container && item) {
                  const targetScroll = item.offsetTop - container.clientHeight / 2 + item.clientHeight / 2;
                  const startScroll = container.scrollTop;
                  const distance = targetScroll - startScroll;
                  const duration = 900; // ms, even slower
                  let startTime: number | null = null;
                  const animateScroll = (timestamp: number) => {
                    if (!startTime) startTime = timestamp;
                    const elapsed = timestamp - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    container.scrollTop = startScroll + distance * progress;
                    if (progress < 1) {
                      requestAnimationFrame(animateScroll);
                    }
                  };
                  requestAnimationFrame(animateScroll);
                }
              }
            } else {
              // Try to find any elements that might be the dropdown
              
              // Look for any div with timezone items
              const allDivs = document.querySelectorAll('div');
              for (let i = 0; i < allDivs.length; i++) {
                const div = allDivs[i];
                const items = div.querySelectorAll('[data-radix-select-item], [role="option"]');
                if (items.length > 0 && items.length < 500) {
                  // Check if this div contains timezone-like content
                  const firstItem = items[0];
                  if (firstItem && firstItem.textContent && firstItem.textContent.includes('UTC')) {
                    if (items[matchingIndex]) {
                      items[matchingIndex].scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center' 
                      });
                      break;
                    }
                  }
                }
              }
            }
          }, 100);
          
          // Clear search buffer after 2 seconds
          const timeout = setTimeout(() => {
            setSearchBuffer('');
          }, 2000);
          
          setSearchTimeout(timeout);
        } else {
          // No match found, start fresh with just this letter
          setSearchBuffer(key);
          
          // Try to find a match with just this letter
          const singleLetterMatch = timezoneOptions.findIndex(tz => {
            const labelLower = tz.label.toLowerCase();
            const valueLower = tz.value.toLowerCase();
            const abbrLower = tz.abbr.toLowerCase();
            
            return labelLower.startsWith(key) || 
                   valueLower.startsWith(key) || 
                   abbrLower.startsWith(key);
          });
          
          if (singleLetterMatch !== -1) {
            const matchedTimezone = timezoneOptions[singleLetterMatch];
            
            // Scroll to this match
            setTimeout(() => {
              let timezoneSelect = document.querySelector('.timezone-selector [data-radix-select-content]') ||
                                  document.querySelector('.timezone-selector [role="listbox"]') ||
                                  document.querySelector('[data-radix-select-content]') ||
                                  document.querySelector('[role="listbox"]');
              
              if (timezoneSelect) {
                const timezoneItems = timezoneSelect.querySelectorAll('[data-radix-select-item], [role="option"]');
                if (timezoneItems && timezoneItems[singleLetterMatch]) {
                  timezoneItems[singleLetterMatch].scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                  });
                }
              }
            }, 100);
          }
          
          // Clear search buffer after 1 second for single letter searches
          const timeout = setTimeout(() => {
            setSearchBuffer('');
          }, 1000);
          
          setSearchTimeout(timeout);
        }
      }
    };

    // Use capture phase to intercept events before Radix UI
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [selectOpen, searchBuffer, searchTimeout, timezoneOptions]);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <LoadingPage 
        title="Loading Settings" 
        description="Preparing your settings..." 
      />
    );
  }

  // Determine if auto-detect should be shown as enabled
  const autoDetectTimezone = autoDetectEnabled || !settings.timezone;

  // Save settings to database
  const saveSettings = async () => {
    try {
      setLoading(true);
      setSaveSuccess(false);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to save settings"
        });
        return;
      }

      // Prepare settings for save
      const settingsToSave = {
        ...settings,
        user_id: user.id,
        timezone: autoDetectEnabled ? null : (settings.timezone || systemTimezone),
        updated_at: new Date().toISOString(),
        email_project_updates: settings.email_project_updates ?? false,
        recent_trades_count: settings.recent_trades_count ?? 5,
        performance_view: settings.performance_view || 'total',
        // Individual notification preferences
        email_friend_requests: settings.email_friend_requests ?? false,
        email_trade_shared: settings.email_trade_shared ?? false,
        email_medal_achievement: settings.email_medal_achievement ?? false,
        push_friend_requests: settings.push_friend_requests ?? false,
        push_trade_shared: settings.push_trade_shared ?? false,
        push_medal_achievement: settings.push_medal_achievement ?? false,
        monthly_trade_checkup: settings.monthly_trade_checkup ?? false,
      };

      // Apply theme immediately
      setTheme(settings.theme);

      // Check if settings exist
      const { data: existing } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      let result;
      if (existing && existing[0]) {
        // Update existing settings
        result = await supabase
          .from('user_settings')
          .update(settingsToSave)
          .eq('user_id', user.id);
      } else {
        // Insert new settings
        result = await supabase
          .from('user_settings')
          .insert(settingsToSave);
      }

      if (result.error) {
        throw result.error;
      }

      setOriginalSettings(settingsToSave);
      setHasChanges(false);
      setSaveSuccess(true);
      toast({
        title: "Success",
        description: "Settings saved successfully"
      });
      // Notify other tabs/pages to refetch recent_trades_count
      if (typeof window !== 'undefined') {
        localStorage.setItem('recent_trades_count_updated', Date.now().toString());
        // Also notify about performance view changes
        if (originalSettings?.performance_view !== settings.performance_view) {
          localStorage.setItem('performance_view_updated', Date.now().toString());
          // Also trigger a custom event for immediate notification
          window.dispatchEvent(new CustomEvent('performanceViewChanged', { 
            detail: { newView: settings.performance_view } 
          }));
        }
      }
      // Reset save success after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings"
      });
    } finally {
      setLoading(false);
    }
  };

  // Update a setting
  const updateSetting = (key: keyof UserSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    // Check if there are changes compared to original settings
    if (originalSettings) {
      const hasAnyChanges = Object.keys(newSettings).some(key => {
        return newSettings[key as keyof UserSettings] !== originalSettings[key as keyof UserSettings];
      });
      setHasChanges(hasAnyChanges);
      // Reset save success when changes are detected
      if (hasAnyChanges && saveSuccess) {
        setSaveSuccess(false);
      }
    }
  };

  // Handle timezone toggle
  const handleTimezoneToggle = (autoDetect: boolean) => {
    setAutoDetectEnabled(autoDetect);
    if (autoDetect) {
      updateSetting('timezone', null);
    } else {
      updateSetting('timezone', systemTimezone);
    }
  };

  if (initialLoad) {
    return (
      <LoadingPage 
        title="Loading Settings" 
        description="Preparing your settings..." 
      />
    );
  }

  return (
    <>
      <PageHeader title="Settings" />
      <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-background to-muted/40">
        {/* Glassmorphism background overlay */}
        <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-0 pointer-events-none" />
        <div className="relative w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-6xl xl:max-w-7xl mx-auto bg-card/90 rounded-2xl shadow-2xl border border-border p-3 sm:p-4 md:p-6 lg:p-8 xl:p-12 my-4 sm:my-6 md:my-8 z-10">
          <div className="flex-1 overflow-y-auto">
            <div className="container mx-auto py-3 sm:py-4 md:py-6 px-2 sm:px-4 space-y-6 sm:space-y-8">
              <Tabs defaultValue="display" className="w-full">
                <TabsList className="grid grid-cols-2 w-full max-w-3xl mb-6 sm:mb-8">
                  <TabsTrigger value="display">Display</TabsTrigger>
                  <TabsTrigger value="preferences">Preferences</TabsTrigger>
                </TabsList>
                {/* Display Tab */}
                <TabsContent value="display">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Monitor className="mr-2 h-5 w-5" />
                        Display Settings
                      </CardTitle>
                      <CardDescription>
                        Customize how information is displayed in your trading journal
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label>Theme</Label>
                          <Select 
                            value={settings.theme} 
                            onValueChange={(value) => updateSetting('theme', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select theme" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="light">Light</SelectItem>
                              <SelectItem value="dark">Dark</SelectItem>
                              <SelectItem value="original-dark">Original</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Auto-detect Timezone</Label>
                            <p className="text-sm text-muted-foreground">
                              Automatically use your system timezone ({systemTimezone})
                            </p>
                          </div>
                          <EnhancedSwitch
                            checked={autoDetectEnabled}
                            onCheckedChange={(checked) => handleTimezoneToggle(checked)}
                          />
                        </div>

                        {!autoDetectTimezone && (
                          <div className="space-y-4 timezone-selector">
                            <div className="space-y-2">
                              <Label>Current Timezone</Label>
                              <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                                {currentTimezoneDisplay}
                              </div>
                            </div>
                            
                            <div className="space-y-2 w-64">
                              <Label>Select Timezone</Label>
                              {searchBuffer && selectOpen && (
                                <div className="text-xs text-muted-foreground mb-2">
                                  Searching: "{searchBuffer}" - Type letters to jump to timezones
                                </div>
                              )}
                              <Select 
                                value={settings.timezone || systemTimezone} 
                                onValueChange={(value) => updateSetting('timezone', value)}
                                open={selectOpen}
                                onOpenChange={setSelectOpen}
                              >
                                <SelectTrigger className="w-64">
                                  <SelectValue placeholder="Select timezone" />
                                </SelectTrigger>
                                <SelectContent className="max-h-60 timezone-dropdown-list w-64">
                                  {timezoneOptions.map((tz) => (
                                    <SelectItem key={tz.value} value={tz.value} className="timezone-dropdown-item">
                                      <div className="flex flex-col">
                                        <span className="font-medium">{tz.label}</span>
                                        <span className="text-xs text-muted-foreground">{tz.value}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>

                      <Separator />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label>Recent Trades to Show</Label>
                          <Select
                            value={settings.recent_trades_count ? String(settings.recent_trades_count) : '5'}
                            onValueChange={(value) => updateSetting('recent_trades_count', Number(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select number" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="3">3</SelectItem>
                              <SelectItem value="5">5</SelectItem>
                              <SelectItem value="10">10</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Default Performance View</Label>
                          <Select
                            value={settings.performance_view || 'total'}
                            onValueChange={(value) => updateSetting('performance_view', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select view" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="total">Total (All Data)</SelectItem>
                              <SelectItem value="currentWeek">Current Week</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Choose which performance data to display by default on your dashboard
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Preferences Tab */}
                <TabsContent value="preferences">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Sparkles className="mr-2 h-5 w-5" />
                        Preferences
                      </CardTitle>
                      <CardDescription>
                        Configure how you want to receive notifications and alerts, and what information you share with other users
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <h4 className="font-medium">Email Notifications</h4>
                          <p className="text-sm text-muted-foreground">Configure which email notifications you want to receive</p>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <Label>Friend Request Emails</Label>
                              <p className="text-sm text-muted-foreground">Get an email when you receive a new friend request</p>
                            </div>
                            <EnhancedSwitch 
                              checked={settings.email_friend_requests || false} 
                              onCheckedChange={(checked) => updateSetting('email_friend_requests', checked)} 
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <Label>Trade Shared With You</Label>
                              <p className="text-sm text-muted-foreground">Get an email when a user or friend shares a trade with you</p>
                            </div>
                            <EnhancedSwitch 
                              checked={settings.email_trade_shared || false} 
                              onCheckedChange={(checked) => updateSetting('email_trade_shared', checked)} 
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <Label>Medal Achievement</Label>
                              <p className="text-sm text-muted-foreground">Get a congratulatory email when you earn a new medal</p>
                            </div>
                            <EnhancedSwitch 
                              checked={settings.email_medal_achievement || false} 
                              onCheckedChange={(checked) => updateSetting('email_medal_achievement', checked)} 
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <Label>Project Updates & Features</Label>
                              <p className="text-sm text-muted-foreground">Get notified about new features and project updates</p>
                            </div>
                            <EnhancedSwitch checked={settings.email_project_updates || false} onCheckedChange={checked => updateSetting('email_project_updates', checked)} />
                          </div>
                          {/* Monthly Trade Checkup switch */}
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <Label>Monthly Trade Checkup</Label>
                              <p className="text-sm text-muted-foreground">Receive monthly email reports with detailed Excel analysis and performance summary</p>
                            </div>
                            <EnhancedSwitch 
                              checked={settings.monthly_trade_checkup || false} 
                              onCheckedChange={(checked) => {
                                updateSetting('monthly_trade_checkup', checked);
                                if (checked && settings.monthly_reports) {
                                  updateSetting('monthly_reports', false);
                                }
                              }}
                              disabled={settings.monthly_reports}
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <div className="space-y-1">
                          <h4 className="font-medium">Trade Reports</h4>
                          <p className="text-sm text-muted-foreground">Receive periodic trade reports</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Weekly Reports</Label>
                            <p className="text-sm text-muted-foreground">Receive weekly performance summary</p>
                          </div>
                          <EnhancedSwitch
                            checked={settings.weekly_reports}
                            onCheckedChange={(checked) => updateSetting('weekly_reports', checked)}
                          />
                        </div>
                        {/* Monthly Reports switch (in Trade Reports section) */}
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Monthly Reports</Label>
                            <p className="text-sm text-muted-foreground">Receive monthly performance summary</p>
                          </div>
                          <EnhancedSwitch
                            checked={settings.monthly_reports}
                            onCheckedChange={(checked) => {
                              updateSetting('monthly_reports', checked);
                              if (checked && settings.monthly_trade_checkup) {
                                updateSetting('monthly_trade_checkup', false);
                              }
                            }}
                            disabled={settings.monthly_trade_checkup}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Quarterly Reports</Label>
                            <p className="text-sm text-muted-foreground">Receive quarterly trading summaries</p>
                          </div>
                          <EnhancedSwitch
                            checked={settings.quarterly_reports}
                            onCheckedChange={(checked) => updateSetting('quarterly_reports', checked)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Yearly Reports</Label>
                            <p className="text-sm text-muted-foreground">Receive yearly trading summaries</p>
                          </div>
                          <EnhancedSwitch
                            checked={settings.yearly_reports}
                            onCheckedChange={(checked) => updateSetting('yearly_reports', checked)}
                          />
                        </div>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>Share Performance Statistics</Label>
                          <p className="text-sm text-muted-foreground">
                            Allow other users to see your trading performance metrics
                          </p>
                        </div>
                        <EnhancedSwitch
                          checked={settings.share_statistics}
                          onCheckedChange={(checked) => updateSetting('share_statistics', checked)}
                        />
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>Public Profile</Label>
                          <p className="text-sm text-muted-foreground">
                            Make your profile visible to other users
                          </p>
                        </div>
                        <EnhancedSwitch
                          checked={settings.public_profile}
                          onCheckedChange={(checked) => updateSetting('public_profile', checked)}
                        />
                      </div>

                      <div className="mt-8 p-4 bg-muted rounded-lg">
                        <div className="flex items-start">
                          <AlertCircle className="h-5 w-5 mr-2 text-amber-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-medium">Privacy Notice</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              Your trading data is private by default. Enabling these options will only share the data you explicitly allow.
                              You can change these settings at any time.
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
              
              {/* Save Button */}
              <div className="flex justify-center mt-8">
                <Button
                  onClick={saveSettings}
                  disabled={!hasChanges || saveSuccess}
                  className="px-8 py-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Settings Saved!
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
          <DashboardFooter />
        </div>
      </div>
    </>
  );
};

{/* Add styles for compact dropdown */}
<style jsx global>{`
  .timezone-dropdown-list {
    padding-top: 0.05rem;
    padding-bottom: 0.05rem;
    font-size: 0.8rem;
    scroll-behavior: auto;
  }
  .timezone-dropdown-item {
    padding-top: 0.02rem !important;
    padding-bottom: 0.02rem !important;
    min-height: 0.9rem !important;
    font-size: 0.8rem;
    line-height: 1.05;
  }
`}</style>

{/* Add styles for .text-white in light mode */}
<style jsx global>{`
  html[data-theme='light'] .text-white {
    color: #222 !important;
  }
`}</style>
