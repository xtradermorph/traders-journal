"use client";

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../src/components/ui/tabs';
import { EnhancedSwitch } from '../src/components/ui/enhanced-switch';
import { Label } from '../src/components/ui/label';
import { Button } from '../src/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../src/components/ui/select';
import { Separator } from '../src/components/ui/separator';
import { PageHeader } from '../src/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../src/components/ui/card';
import { useToast } from '../src/hooks/use-toast';
import { Save, Monitor, AlertCircle, Check, Sparkles } from 'lucide-react';
import { LoadingPage } from '../components/ui/loading-spinner';
import { useAuth } from '../src/hooks/useAuth';
import TimezoneSelector from '../src/components/TimezoneSelector.jsx';

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
  email_friend_requests?: boolean;
  email_trade_shared?: boolean;
  email_medal_achievement?: boolean;
  push_friend_requests?: boolean;
  push_trade_shared?: boolean;
  push_medal_achievement?: boolean;
  monthly_trade_checkup?: boolean;
}

export default function SettingsPage() {
  const supabase = createClientComponentClient();
  const { setTheme } = useTheme();
  const { toast } = useToast();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<UserSettings | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    user_id: '',
    theme: 'system',
    notifications_enabled: true,
    email_notifications: true,
    default_currency: 'AUD',
    timezone: 'UTC',
    pips_or_percentage: 'pips',
    chart_timeframe: '1D',
    share_statistics: true,
    public_profile: false,
    weekly_reports: true,
    monthly_reports: true,
    quarterly_reports: true,
    yearly_reports: true,
    ai_api_key: '',
    email_project_updates: true,
    recent_trades_count: 5,
    performance_view: 'total',
    email_friend_requests: true,
    email_trade_shared: true,
    email_medal_achievement: true,
    push_friend_requests: true,
    push_trade_shared: true,
    push_medal_achievement: true,
    monthly_trade_checkup: true
  });

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
          timezone: userSettings.timezone || 'UTC',
          email_project_updates: userSettings.email_project_updates ?? false,
          recent_trades_count: userSettings.recent_trades_count ?? 5,
          performance_view: userSettings.performance_view || 'total',
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
        
        if (userSettings.theme) {
          setTheme(userSettings.theme);
        }
      } else {
        const defaultSettings = {
          ...settings,
          user_id: user.id,
        };
        setSettings(defaultSettings);
        setOriginalSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error in loadSettings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings"
      });
    } finally {
      setLoading(false);
    }
  };

  // Update a setting
  const updateSetting = (key: keyof UserSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    if (originalSettings) {
      const hasAnyChanges = Object.keys(newSettings).some(key => {
        return newSettings[key as keyof UserSettings] !== originalSettings[key as keyof UserSettings];
      });
      setHasChanges(hasAnyChanges);
      if (hasAnyChanges && saveSuccess) {
        setSaveSuccess(false);
      }
    }
  };

  // Load settings on mount
  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <LoadingPage 
        title="Loading Settings" 
        description="Preparing your settings..." 
      />
    );
  }

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

      const settingsToSave = {
        ...settings,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };

      setTheme(settings.theme);

      const { data: existing } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      let result;
      if (existing && existing[0]) {
        result = await supabase
          .from('user_settings')
          .update(settingsToSave)
          .eq('user_id', user.id);
      } else {
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

  if (loading) {
    return (
      <LoadingPage 
        title="Loading Settings" 
        description="Preparing your settings..." 
      />
    );
  }

  return (
    <>
      <PageHeader title="Settings" showBackButton backUrl="/dashboard" />
      <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-background to-muted/40">
        <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-0 pointer-events-none" />
        <div className="relative w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-6xl xl:max-w-7xl mx-auto bg-card/90 rounded-2xl shadow-2xl border border-border p-3 sm:p-4 md:p-6 lg:p-8 xl:p-12 my-4 sm:my-6 md:my-8 z-10">
          <div className="flex-1 overflow-y-auto">
            <div className="container mx-auto py-3 sm:py-4 md:py-6 px-2 sm:px-4 space-y-6 sm:space-y-8">
              <Tabs defaultValue="display" className="w-full">
                <TabsList className="grid grid-cols-2 w-full max-w-3xl mb-6 sm:mb-8">
                  <TabsTrigger value="display">Display</TabsTrigger>
                  <TabsTrigger value="preferences">Preferences</TabsTrigger>
                </TabsList>
                
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
                        <div className="space-y-2">
                          <TimezoneSelector
                            value={settings.timezone || 'UTC'}
                            onValueChange={(value) => updateSetting('timezone', value)}
                            placeholder="Select timezone"
                          />
                        </div>
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
                            onValueChange={(value) => updateSetting('performance_view', value as 'total' | 'currentWeek')}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select view" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="total">Total (All Data)</SelectItem>
                              <SelectItem value="currentWeek">Current Week</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="preferences">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Sparkles className="mr-2 h-5 w-5" />
                        Preferences
                      </CardTitle>
                      <CardDescription>
                        Configure how you want to receive notifications and alerts
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
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Monthly Reports</Label>
                            <p className="text-sm text-muted-foreground">Receive monthly performance summary</p>
                          </div>
                          <EnhancedSwitch
                            checked={settings.monthly_reports}
                            onCheckedChange={(checked) => updateSetting('monthly_reports', checked)}
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
        </div>
      </div>
    </>
  );
}
