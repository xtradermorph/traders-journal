'use client'

import React, { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import * as profileAccess from '@/lib/profileAccess';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Save, Briefcase, MapPin, LineChart, Clock, Globe, Target, AlertCircle, Key, Upload, Camera, Trash2, Check } from 'lucide-react';
import { DeleteAccount } from '@/components/auth/DeleteAccount';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { UserProfile } from '@/types/user';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog';
import { useUserProfile } from './UserProfileContext';

interface ProfileContentProps {
  initialProfile: UserProfile;
  onProfileUpdate: (updatedProfile: UserProfile) => void;
}

export function ProfileContent({ initialProfile, onProfileUpdate }: ProfileContentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [traderStatus, setTraderStatus] = useState('Retail Trader');
  const [traderType, setTraderType] = useState('Day Trader');
  const [bio, setBio] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [tradingFrequency, setTradingFrequency] = useState('');
  const [markets, setMarkets] = useState('');
  const [tradingGoal, setTradingGoal] = useState('');
  const [tradingChallenges, setTradingChallenges] = useState('');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSaveSuccess, setPasswordSaveSuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const { isOnline } = useUserProfile();

  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
      setUsername(initialProfile.username || '');
      setEmail(initialProfile.email || '');
      setFirstName(initialProfile.first_name || '');
      setLastName(initialProfile.last_name || '');
      setTraderStatus(initialProfile.trader_status || 'Retail Trader');
      setTraderType(initialProfile.trader_type || 'Day Trader');
      setBio(initialProfile.bio || '');
      setYearsExperience(initialProfile.years_experience?.toString() || '');
      setTradingFrequency(initialProfile.trading_frequency || '');
      setMarkets(initialProfile.markets || '');
      setTradingGoal(initialProfile.trading_goal || '');
      setTradingChallenges(initialProfile.trading_challenges || '');
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [initialProfile]);

  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarLoading(true);
    setUploading(true);
    try {
      const file = e.target.files?.[0];
      if (!file) {
        toast({
          title: "Error",
          description: "No file selected",
          variant: "destructive",
        });
        setAvatarLoading(false);
        setUploading(false);
        return;
      }
      // Remove old avatar from Supabase storage if exists
      if (profile?.avatar_url) {
        try {
          // Extract the path after the bucket name
          const url = new URL(profile.avatar_url);
          const pathParts = url.pathname.split('/');
          // Find the index of the bucket name (e.g., 'avatars')
          const bucketIndex = pathParts.findIndex(p => p === 'avatars');
          if (bucketIndex !== -1) {
            const filePath = pathParts.slice(bucketIndex + 1).join('/');
            if (filePath) {
              await supabase.storage.from('avatars').remove([filePath]);
            }
          }
        } catch (err) {
          // Ignore errors in removing old avatar
          console.warn('Failed to remove old avatar:', err);
        }
      }
      // Show preview
      const reader = new FileReader();
      reader.onload = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Error",
          description: "File size must be less than 5MB",
          variant: "destructive",
        });
        setAvatarLoading(false);
        setUploading(false);
        return;
      }
      // Upload to /api/avatar
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/avatar', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload avatar');
      }
      const publicUrl = result.avatarUrl;
      if (!publicUrl) throw new Error('Failed to get public URL for avatar.');
      // Update profile with new avatar URL
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        setAvatarLoading(false);
        setUploading(false);
        return;
      }
      const { error: updateError } = await profileAccess.updateUserProfile(session.user.id, { 
        avatar_url: publicUrl, 
        updated_at: new Date().toISOString() 
      });
      if (updateError) {
        const errorMessage = (updateError as any).message || 'Unknown error updating profile avatar';
        throw new Error('Failed to update profile with new avatar: ' + errorMessage);
      }
      // Refresh profile data
      const { data: updatedProfile, error: refreshError } = await profileAccess.getProfileById(session.user.id);
      if (refreshError) throw refreshError;
      if (updatedProfile) {
        setProfile(updatedProfile);
        setAvatarPreview(null); // Clear preview after success
        setFirstName(updatedProfile.first_name || '');
        setLastName(updatedProfile.last_name || '');
        if (onProfileUpdate) onProfileUpdate(updatedProfile);
        window.dispatchEvent(new Event('profile-updated'));
      }
      toast({
        title: "Success",
        description: "Avatar updated successfully",
        variant: "default",
      });
    } catch (error) {
      setAvatarPreview(null);
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setAvatarLoading(false);
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (profile) {
      const hasAnyChanges = 
        username !== (profile.username || '') ||
        firstName !== (profile.first_name || '') ||
        lastName !== (profile.last_name || '') ||
        traderStatus !== (profile.trader_status || 'Retail Trader') ||
        traderType !== (profile.trader_type || 'Day Trader') ||
        bio !== (profile.bio || '') ||
        (yearsExperience ? yearsExperience.toString() : '') !== (profile.years_experience ? profile.years_experience.toString() : '') ||
        tradingFrequency !== (profile.trading_frequency || '') ||
        markets !== (profile.markets || '') ||
        tradingGoal !== (profile.trading_goal || '') ||
        tradingChallenges !== (profile.trading_challenges || '');
      setHasChanges(hasAnyChanges);
      if (hasAnyChanges && saveSuccess) {
        setSaveSuccess(false);
      }
    }
  }, [profile, username, firstName, lastName, traderStatus, traderType, bio, yearsExperience, tradingFrequency, markets, tradingGoal, tradingChallenges, saveSuccess]);

  const handlePasswordChange = async () => {
    if (newPassword.length < 8) {
      toast({
        id: 'password-validation-error',
        title: 'Validation Error',
        description: 'New password must be at least 8 characters long',
        variant: "destructive"
      });
      return;
    }
    setPasswordLoading(true);
    setPasswordSaveSuccess(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ id: 'session-error-password', title: 'Authentication Error', description: 'Your session has expired. Please log in again.', variant: "destructive" });
        router.push('/login');
        setPasswordLoading(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordSaveSuccess(true);
      toast({ id: 'password-success', title: 'Success', description: 'Password updated successfully', variant: "default" });
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      toast({ id: 'password-error-update', title: 'Error updating password', description: error instanceof Error ? error.message : 'An unexpected error occurred.', variant: "destructive" });
    } finally {
      setPasswordLoading(false);
      setTimeout(() => setPasswordSaveSuccess(false), 3000);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setSaveSuccess(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        setLoading(false);
        return;
      }
      // Only include fields that exist in the DB
      const updatedFields: Partial<UserProfile> = {
        username,
        first_name: firstName,
        last_name: lastName,
        trader_status: traderStatus,
        trader_type: traderType,
        bio,
        years_experience:
          yearsExperience && yearsExperience.trim() !== ''
            ? Number(yearsExperience)
            : undefined,
        trading_frequency: tradingFrequency,
        markets,
        trading_goal: tradingGoal,
        trading_challenges: tradingChallenges
      };
      // Check if there are any changes to save
      const hasChangesNow = Object.keys(updatedFields).some(key => {
        // @ts-expect-error - dynamic key access
        const profileValue = profile?.[key as keyof UserProfile];
        const updatedValue = updatedFields[key as keyof UserProfile];
        return profileValue !== updatedValue;
      });
      if (!hasChangesNow) {
        toast({
          title: "No changes to save",
          description: "You haven't made any changes to your profile.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      // Update profile using the profileAccess utility
      const { data: updatedProfile, error: updateError } = await profileAccess.updateUserProfile(session.user.id, updatedFields);
      if (updateError || !updatedProfile) {
        console.error('Error updating profile:', updateError);
        toast({
          title: "Error saving profile",
          description: "There was an error saving your profile. Please try again.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      // Always fetch the latest profile from Supabase after update
      const { data: freshProfile, error: fetchError } = await profileAccess.getProfileById(session.user.id);
      if (fetchError || !freshProfile) {
        toast({
          title: "Profile updated, but failed to refresh.",
          description: "Please reload the page to see the latest info.",
          variant: "destructive"
        });
        setProfile(updatedProfile); // fallback
        setFirstName(updatedProfile.first_name || '');
        setLastName(updatedProfile.last_name || '');
        if (onProfileUpdate) onProfileUpdate(updatedProfile);
        window.dispatchEvent(new Event('profile-updated'));
      } else {
        setProfile(freshProfile);
        setFirstName(freshProfile.first_name || '');
        setLastName(freshProfile.last_name || '');
        if (onProfileUpdate) onProfileUpdate(freshProfile);
        window.dispatchEvent(new Event('profile-updated'));
      }
      setHasChanges(false);
      setSaveSuccess(true);
      toast({
        title: "Profile saved",
        description: "Your profile has been updated successfully.",
        variant: "default"
      });
      // Reset save success after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error saving profile",
        description: error instanceof Error ? error.message : "There was an error saving your profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="space-y-8 p-4 md:p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-24 h-24 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-6 w-60" />
          </div>
        </div>
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3">
            <Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" />
          </TabsList>
          <TabsContent value="profile" className="mt-4">
            <Card>
              <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div className="flex items-center gap-4">
        <div className="relative group">
          {/* Avatar: click to zoom */}
          <Avatar
            className="w-28 h-28 cursor-pointer border-4 border-gradient-to-tr from-blue-400 via-purple-500 to-pink-400 shadow-lg ring-2 ring-primary/30 transition-transform duration-200 hover:scale-105"
            onClick={() => profile?.avatar_url && setIsAvatarModalOpen(true)}
          >
            <AvatarImage src={avatarPreview || profile?.avatar_url || undefined} alt={profile?.username || 'User avatar'} className="object-cover object-center" />
            <AvatarFallback><User className="w-10 h-10 text-muted-foreground" /></AvatarFallback>
          </Avatar>
          {/* Online indicator dot - bottom-2 right-2, slightly overlapping border, matches dashboard */}
          <span className={`absolute bottom-2 right-2 h-5 w-5 rounded-full border-2 border-background z-20 ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} title={isOnline ? 'Online' : 'Offline'}></span>
          {/* Camera icon: click to upload - small, no white border, bottom-left corner outside avatar */}
          <label htmlFor="avatarInput" className="absolute -bottom-4 left-0 flex items-center justify-center bg-black bg-opacity-70 rounded-full p-1 cursor-pointer hover:bg-opacity-90 transition-opacity duration-200 z-10 shadow-md" style={{ width: '32px', height: '32px' }} onClick={e => e.stopPropagation()}>
            {avatarLoading || uploading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
          </label>
          <input id="avatarInput" type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/png, image/jpeg, image/gif" className="sr-only" disabled={avatarLoading || uploading} />
        </div>
        {/* Avatar Zoom Modal */}
        <Dialog open={isAvatarModalOpen} onOpenChange={setIsAvatarModalOpen}>
          <DialogContent className="flex flex-col items-center justify-center max-w-lg bg-background rounded-2xl shadow-2xl p-8">
            <img
              src={profile?.avatar_url || ''}
              alt="Avatar Large Preview"
              className="rounded-full w-72 h-72 object-cover object-center border-4 border-gradient-to-tr from-blue-400 via-purple-500 to-pink-400 shadow-xl"
            />
            <DialogClose asChild>
              <Button variant="outline" className="mt-4">Close</Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold">{profile?.username || <Skeleton className="h-8 w-32 inline-block" />}</h1>
          {profile?.email ? (
            <p className="text-muted-foreground">{profile.email}</p>
          ) : (
            <div className="text-muted-foreground"><Skeleton className="h-6 w-48 inline-block" /></div>
          )}
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="trading">Trading Info</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg font-semibold">Basic Information</CardTitle><CardDescription>Manage your basic information.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label htmlFor="username">Username</Label><Input id="username" value={username} disabled={true} /><p className="text-xs text-muted-foreground mt-1">Usernames are permanent and cannot be changed.</p></div>
                <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} disabled={true} /><p className="text-xs text-muted-foreground mt-1">Email display only. Changes require verification.</p></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label htmlFor="firstName">First Name</Label><Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={loading || uploading} /></div>
                <div><Label htmlFor="lastName">Last Name</Label><Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={loading || uploading} /></div>
              </div>
              <div><Label htmlFor="bio">Bio</Label><Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us a little about yourself" disabled={loading || uploading} /></div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 pt-6">
              <Button onClick={handleSaveProfile} disabled={loading || uploading || !hasChanges || saveSuccess} className="gap-2 min-w-[120px]">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : saveSuccess ? <><Check className="w-4 h-4" />Saved!</> : <><Save className="w-4 h-4" />Save Changes</>}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="trading" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Trading Information</CardTitle><CardDescription>Details about your trading style and experience.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label htmlFor="traderStatus">Trader Status</Label><Select value={traderStatus} onValueChange={setTraderStatus} disabled={loading || uploading}><SelectTrigger id="traderStatus"><SelectValue placeholder="Select trader status" /></SelectTrigger><SelectContent><SelectItem value="Retail Trader">Retail Trader</SelectItem><SelectItem value="Professional Trader">Professional Trader</SelectItem><SelectItem value="Institutional Trader">Institutional Trader</SelectItem></SelectContent></Select></div>
                <div><Label htmlFor="traderType">Trading Type</Label><Select value={traderType} onValueChange={setTraderType} disabled={loading || uploading}><SelectTrigger id="traderType"><SelectValue placeholder="Select trading type" /></SelectTrigger><SelectContent><SelectItem value="Day Trader">Day Trader</SelectItem><SelectItem value="Swing Trader">Swing Trader</SelectItem><SelectItem value="Position Trader">Position Trader</SelectItem><SelectItem value="Scalper">Scalper</SelectItem><SelectItem value="Investor">Investor</SelectItem></SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div><Label htmlFor="yearsExperience">Years of Experience</Label><Input id="yearsExperience" type="number" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} placeholder="e.g., 5" disabled={loading || uploading} /></div>
                 <div><Label htmlFor="tradingFrequency">Trading Frequency</Label><Select value={tradingFrequency} onValueChange={setTradingFrequency} disabled={loading || uploading}><SelectTrigger id="tradingFrequency"><SelectValue placeholder="e.g., Daily, Weekly" /></SelectTrigger><SelectContent><SelectItem value="Multiple times a day">Multiple times a day</SelectItem><SelectItem value="Daily">Daily</SelectItem><SelectItem value="Weekly">Weekly</SelectItem><SelectItem value="Monthly">Monthly</SelectItem><SelectItem value="Occasionally">Occasionally</SelectItem></SelectContent></Select></div>
              </div>
              <div><Label htmlFor="markets">Markets Traded</Label><Input id="markets" value={markets} onChange={(e) => setMarkets(e.target.value)} placeholder="e.g., Forex, Stocks, Crypto" disabled={loading || uploading} /></div>
              <div><Label htmlFor="tradingGoal">Trading Goal</Label><Textarea id="tradingGoal" value={tradingGoal} onChange={(e) => setTradingGoal(e.target.value)} placeholder="What are your primary trading objectives?" disabled={loading || uploading} /></div>
              <div><Label htmlFor="tradingChallenges">Trading Challenges</Label><Textarea id="tradingChallenges" value={tradingChallenges} onChange={(e) => setTradingChallenges(e.target.value)} placeholder="What are your biggest trading challenges?" disabled={loading || uploading} /></div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 pt-6">
              <Button onClick={handleSaveProfile} disabled={loading || uploading || !hasChanges || saveSuccess} className="gap-2 min-w-[120px]">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : saveSuccess ? <><Check className="w-4 h-4" />Saved!</> : <><Save className="w-4 h-4" />Save Changes</>}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Change Password</CardTitle><CardDescription>Ensure your account is secure with a strong password.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div><Label htmlFor="currentPassword">Current Password</Label><Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={passwordLoading} /></div>
              <div><Label htmlFor="newPassword">New Password</Label><Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={passwordLoading} /><p className="text-xs text-muted-foreground mt-1">Must be at least 8 characters long.</p></div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 pt-6">
              <Button type="submit" onClick={handlePasswordChange} disabled={passwordLoading || !currentPassword || !newPassword}>
              {passwordLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : passwordSaveSuccess ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Updated
                </>
              ) : (
                "Update Password"
              )}
            </Button>
            </CardFooter>
          </Card>
          
          <Card className="mt-6 border-destructive">
            <CardHeader><CardTitle className="text-lg font-semibold text-destructive">Account Management</CardTitle></CardHeader>
            <CardContent>
                <Label className="text-base font-medium">Delete Account</Label>
                <p className="text-sm text-muted-foreground mb-4">Permanently delete your account and all associated data. This action is irreversible.</p>
                <DeleteAccount />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}