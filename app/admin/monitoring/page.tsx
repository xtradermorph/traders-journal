'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Send, Users, Mail, AlertCircle, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SupportManagementPage from './support-management/page';
import htmlDocx from 'html-docx-js/dist/html-docx';
import { marked } from 'marked';
import DashboardFooter from '@/components/DashboardFooter';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HealthStatus {
  status: string;
  timestamp: string;
  database?: {
    connected: boolean;
    recordCount: number;
    error?: string;
  };
  edgeFunction?: {
    status: string;
  };
  cronJobs?: {
    status: string;
  };
  emailService?: {
    status: string;
  };
  error?: string;
}

interface ProjectUpdateStats {
  totalUsers: number;
  subscribedUsers: number;
  lastSent?: string;
}

interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  hasProjectUpdates: boolean;
  created_at: string;
}

export default function MonitoringPage() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [projectStats, setProjectStats] = useState<ProjectUpdateStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    subject: '',
    message: ''
  });
  const [sendMode, setSendMode] = useState<'all' | 'selected'>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const { toast } = useToast();
  const [readmeContent, setReadmeContent] = useState<string>('');
  const [downloadingReadme, setDownloadingReadme] = useState(false);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/health', {
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setHealthStatus(data);
      setLastChecked(new Date());
    } catch (error) {
      // Only log if it's not a network error or timeout
      if (error instanceof Error && 
          !error.message.includes('NetworkError') && 
          !error.message.includes('timeout') &&
          !error.message.includes('fetch') &&
          !error.message.includes('The operation timed out') &&
          !(error instanceof DOMException && error.name === 'TimeoutError')) {
        console.error('Error checking health:', error);
      }
      setHealthStatus({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Failed to fetch health status'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectUpdateStats = async () => {
    try {
      const response = await fetch('/api/admin/project-update-stats', {
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
      if (response.ok) {
        const data = await response.json();
        setProjectStats(data);
      } else {
        console.warn('Project update stats endpoint returned:', response.status);
      }
    } catch (error) {
      // Only log if it's not a network error or timeout
      if (error instanceof Error && 
          !error.message.includes('NetworkError') && 
          !error.message.includes('timeout') &&
          !error.message.includes('fetch') &&
          !error.message.includes('The operation timed out') &&
          !(error instanceof DOMException && error.name === 'TimeoutError')) {
        console.error('Error fetching project update stats:', error);
      }
    }
  };

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/users-list', {
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        // Update project stats with the new data
        setProjectStats({
          totalUsers: data.totalUsers,
          subscribedUsers: data.subscribedUsers,
          lastSent: projectStats?.lastSent
        });
      } else {
        console.warn('Users list endpoint returned:', response.status);
      }
    } catch (error) {
      // Only log if it's not a network error or timeout
      if (error instanceof Error && 
          !error.message.includes('NetworkError') && 
          !error.message.includes('timeout') &&
          !error.message.includes('fetch') &&
          !error.message.includes('The operation timed out') &&
          !(error instanceof DOMException && error.name === 'TimeoutError')) {
        console.error('Error fetching users:', error);
        toast({
          title: "Error",
          description: "Failed to fetch users list",
          variant: "destructive"
        });
      }
    }
  }, [projectStats?.lastSent, toast]);

  const validateForm = () => {
    if (!announcementForm.subject.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a subject for the announcement.",
        variant: "destructive"
      });
      return false;
    }
    
    if (!announcementForm.message.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a message for the announcement.",
        variant: "destructive"
      });
      return false;
    }

    if (sendMode === 'selected' && selectedUsers.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one user to send the announcement to.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSendAnnouncement = async () => {
    if (!validateForm()) {
      return;
    }

    setSendingAnnouncement(true);
    try {
      const response = await fetch('/api/admin/send-announcement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...announcementForm,
          sendToAll: sendMode === 'all',
          selectedUserIds: sendMode === 'selected' ? selectedUsers : []
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: data.message,
        });
        setAnnouncementForm({ subject: '', message: '' });
        setSelectedUsers([]);
        setSendMode('all');
        setShowConfirmation(false);
        fetchUsers(); // Refresh users and stats
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to send announcement",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error sending announcement:', error);
      toast({
        title: "Error",
        description: "Failed to send announcement. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSendingAnnouncement(false);
    }
  };

  const handleUserSelection = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  // Fetch README content on demand
  const fetchReadme = async () => {
    try {
      const response = await fetch('/README.md');
      if (response.ok) {
        const text = await response.text();
        setReadmeContent(text);
        return text;
      } else {
        setReadmeContent('Failed to load README.');
        return null;
      }
    } catch (error) {
      console.error('Error fetching README:', error);
      setReadmeContent('Failed to load README.');
      return null;
    }
  };

  // Download README as Word docx
  const handleDownloadDocx = async () => {
    setDownloadingReadme(true);
    try {
      // Fetch README content if not already loaded
      let content = readmeContent;
      if (!content || content === 'Failed to load README.') {
        const fetchedContent = await fetchReadme();
        if (!fetchedContent) {
          throw new Error('Failed to fetch README content');
        }
        content = fetchedContent;
      }

      // Convert markdown to HTML using marked for rich formatting
      const html = marked.parse(content);
      
      // Create a styled HTML document
      const styledHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            h1 { color: #1e40af; font-size: 2.5em; text-align: center; margin-bottom: 30px; border-bottom: 3px solid #1e40af; padding-bottom: 15px; }
            h2 { color: #1e40af; font-size: 1.8em; margin-top: 40px; margin-bottom: 20px; border-left: 4px solid #1e40af; padding-left: 15px; }
            h3 { color: #2563eb; font-size: 1.4em; margin-top: 30px; margin-bottom: 15px; }
            h4 { color: #3b82f6; font-size: 1.2em; margin-top: 25px; margin-bottom: 10px; }
            p { margin-bottom: 15px; text-align: justify; }
            .setup-step { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; border-radius: 0 5px 5px 0; }
            .warning { background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 15px 0; border-radius: 0 5px 5px 0; }
            .info { background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 15px 0; border-radius: 0 5px 5px 0; }
            .feature { background-color: #f0f9ff; border: 1px solid #0ea5e9; padding: 15px; margin: 15px 0; border-radius: 5px; }
            code { background-color: #f1f5f9; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; color: #dc2626; }
            pre { background-color: #1e293b; color: #e2e8f0; padding: 15px; border-radius: 5px; overflow-x: auto; margin: 15px 0; }
            ul, ol { margin-bottom: 15px; padding-left: 25px; }
            li { margin-bottom: 8px; }
            .highlight { background-color: #fef3c7; padding: 2px 4px; border-radius: 3px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; }
            th { background-color: #1e40af; color: white; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .footer { margin-top: 50px; text-align: center; color: #6b7280; font-size: 0.9em; border-top: 1px solid #d1d5db; padding-top: 20px; }
          </style>
        </head>
        <body>
          ${html}
        </body>
        </html>
      `;

      const docxBlob = htmlDocx.asBlob(styledHtml);
      const url = URL.createObjectURL(docxBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "Trader's Journal App - README.docx";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      toast({
        title: "Download Successful",
        description: "README has been downloaded as a Word document.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error downloading README:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download README. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadingReadme(false);
    }
  };

  // Check health status
  useEffect(() => {
    checkHealth();
    // Check health every 5 minutes instead of every 30 seconds
    const interval = setInterval(checkHealth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch project stats and users
  useEffect(() => {
    fetchProjectUpdateStats();
    fetchUsers();
    // Fetch data every 2 minutes instead of every 30 seconds
    const interval = setInterval(() => {
      fetchProjectUpdateStats();
      fetchUsers();
      }, 2 * 60 * 1000);
  return () => clearInterval(interval);
}, [fetchUsers]);

  const getEmailServiceInfo = (status: string) => {
    switch (status) {
      case 'operational':
        return 'Email service is working correctly';
      case 'not_configured':
        return 'RESEND_API_KEY environment variable is not set';
      case 'unauthorized':
        return 'Invalid API key - check your RESEND_API_KEY';
      case 'forbidden':
        return 'API key lacks required permissions';
      case 'error':
        return 'Connection error - check network and API configuration';
      default:
        return 'Unknown status';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'operational':
      case 'connected':
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600">Operational</Badge>;
      case 'unhealthy':
      case 'error':
        return <Badge className="bg-red-500 hover:bg-red-600">Error</Badge>;
      case 'inactive':
      case 'not_configured':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Not Configured</Badge>;
      case 'unauthorized':
        return <Badge className="bg-red-500 hover:bg-red-600">Unauthorized</Badge>;
      case 'forbidden':
        return <Badge className="bg-red-500 hover:bg-red-600">Forbidden</Badge>;
      default:
        return <Badge className="bg-gray-500 hover:bg-gray-600">Unknown</Badge>;
    }
  };

  const refreshAllStatuses = async () => {
    setLoading(true);
    try {
      // Refresh all statuses in parallel
      await Promise.all([
        checkHealth(),
        fetchProjectUpdateStats(),
        fetchUsers()
      ]);
    } catch (error) {
      console.error('Error refreshing statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader title="System Monitoring" />
      <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-background to-muted/40">
        <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-0 pointer-events-none" />
        <div className="relative w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-6xl xl:max-w-7xl mx-auto bg-card/90 rounded-2xl shadow-2xl border border-border p-3 sm:p-4 md:p-6 lg:p-8 xl:p-12 my-4 sm:my-6 md:my-8 z-10 flex flex-col min-h-[80vh]">
        <div className="container mx-auto py-3 sm:py-4 md:py-6 px-2 sm:px-4">
      <div className="flex justify-end mb-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={handleDownloadDocx}
                disabled={downloadingReadme}
                className="flex items-center gap-2"
              >
                {downloadingReadme ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {downloadingReadme ? 'Downloading...' : 'Download README'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Download README as Word document</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <div>
          {lastChecked && (
            <p className="text-sm text-muted-foreground">
              Last checked: {lastChecked.toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button 
          onClick={refreshAllStatuses} 
          disabled={loading}
          variant="outline"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            'Refresh All Statuses'
          )}
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between">
              Overall Status
              {healthStatus && getStatusBadge(healthStatus.status)}
            </CardTitle>
            <CardDescription>
              System health overview
            </CardDescription>
          </CardHeader>
          <CardContent>
            {healthStatus ? (
              <div>
                <p>Status: {healthStatus.status}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Last updated: {new Date(healthStatus.timestamp).toLocaleString()}
                </p>
                {healthStatus.error && (
                  <p className="text-red-500 mt-2">Error: {healthStatus.error}</p>
                )}
              </div>
            ) : (
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between">
              Database
              {healthStatus?.database && getStatusBadge(healthStatus.database.connected ? 'connected' : 'error')}
            </CardTitle>
            <CardDescription>
              Supabase database status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {healthStatus?.database ? (
              <div>
                <p>Connection: {healthStatus.database.connected ? 'Active' : 'Failed'}</p>
                <p className="mt-2">User Settings Count: {healthStatus.database.recordCount}</p>
                {healthStatus.database.error && (
                  <p className="text-red-500 mt-2 text-sm">
                    Error: {healthStatus.database.error}
                  </p>
                )}
                <p className="mt-4">
                  <a 
                    href="https://supabase.com/dashboard/project/ynyzwdddwkzakptenhuy/editor" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    Open Database Editor
                  </a>
                </p>
              </div>
            ) : (
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between">
              Edge Function
              {healthStatus?.edgeFunction && getStatusBadge(healthStatus.edgeFunction.status)}
            </CardTitle>
            <CardDescription>
              Report generation function status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {healthStatus?.edgeFunction ? (
              <div>
                <p>Status: {healthStatus.edgeFunction.status}</p>
                <p className="mt-4">
                  <a 
                    href="https://supabase.com/dashboard/project/ynyzwdddwkzakptenhuy/functions" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    View Edge Functions
                  </a>
                </p>
              </div>
            ) : (
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between">
              Scheduled Jobs
              {healthStatus?.cronJobs && getStatusBadge(healthStatus.cronJobs.status)}
            </CardTitle>
            <CardDescription>
              Cron job status for report generation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {healthStatus?.cronJobs ? (
              <div>
                <p>Status: {healthStatus.cronJobs.status}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {healthStatus.cronJobs.status === 'active' 
                    ? 'Cron job is running on schedule (daily at 6 AM UTC)'
                    : healthStatus.cronJobs.status === 'inactive'
                    ? 'Cron job has not executed recently (expected daily at 6 AM UTC)'
                    : 'Cron job monitoring is not configured'
                  }
                </p>
                <p className="mt-4">
                  <a 
                    href="https://supabase.com/dashboard/project/ynyzwdddwkzakptenhuy/sql" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    Check SQL Editor
                  </a>
                </p>
                <p className="mt-2">
                  <a 
                    href="https://supabase.com/dashboard/project/ynyzwdddwkzakptenhuy/functions" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    View Edge Functions
                  </a>
                </p>
              </div>
            ) : (
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between">
              Email Service
              {healthStatus?.emailService && getStatusBadge(healthStatus.emailService.status)}
            </CardTitle>
            <CardDescription>
              Resend email delivery status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {healthStatus?.emailService ? (
              <div>
                <p>Status: {healthStatus.emailService.status}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {getEmailServiceInfo(healthStatus.emailService.status)}
                </p>
                <p className="mt-4">
                  <a 
                    href="https://resend.com/dashboard" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    Open Resend Dashboard
                  </a>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Check delivery rates, bounces, and opens in the Resend dashboard
                </p>
              </div>
            ) : (
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Project Updates Section */}
      <div className="mt-10">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Project Updates & Announcements
            </CardTitle>
            <CardDescription>
              Send announcements to users who have enabled project update notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projectStats ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Total Users</p>
                      <p className="text-2xl font-bold">{projectStats.totalUsers}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Subscribed</p>
                      <p className="text-2xl font-bold">{projectStats.subscribedUsers}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Subscription Rate</p>
                      <p className="text-2xl font-bold">
                        {projectStats.totalUsers > 0 
                          ? Math.round((projectStats.subscribedUsers / projectStats.totalUsers) * 100)
                          : 0}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="announcement-subject">Subject</Label>
                    <Input
                      id="announcement-subject"
                      placeholder="Enter announcement subject..."
                      value={announcementForm.subject}
                      onChange={(e) => setAnnouncementForm(prev => ({ ...prev, subject: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="announcement-message">Message</Label>
                    <Textarea
                      id="announcement-message"
                      placeholder="Enter announcement message..."
                      rows={4}
                      value={announcementForm.message}
                      onChange={(e) => setAnnouncementForm(prev => ({ ...prev, message: e.target.value }))}
                    />
                  </div>

                  {/* Send Mode Selection */}
                  <div className="space-y-3">
                    <Label>Send to:</Label>
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="send-all"
                          checked={sendMode === 'all'}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSendMode('all');
                              setSelectedUsers([]);
                            }
                          }}
                        />
                        <Label htmlFor="send-all" className="text-sm font-normal">
                          All users with project updates enabled ({projectStats.subscribedUsers} users)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="send-selected"
                          checked={sendMode === 'selected'}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSendMode('selected');
                            }
                          }}
                        />
                        <Label htmlFor="send-selected" className="text-sm font-normal">
                          Selected users only ({selectedUsers.length} selected)
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* User Selection (only show when 'selected' mode is chosen) */}
                  {sendMode === 'selected' && (
                    <div className="space-y-3">
                      <Label>Select Users:</Label>
                      <div className="max-h-60 overflow-y-auto border rounded-md p-3 space-y-2">
                        {users.length > 0 ? (
                          users.map((user) => (
                            <div key={user.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`user-${user.id}`}
                                checked={selectedUsers.includes(user.id)}
                                onCheckedChange={(checked) => handleUserSelection(user.id, checked as boolean)}
                              />
                              <Label htmlFor={`user-${user.id}`} className="text-sm font-normal flex-1">
                                <div className="flex justify-between">
                                  <span>{user.name}</span>
                                  <span className="text-muted-foreground text-xs">
                                    {user.hasProjectUpdates ? '✓ Updates enabled' : '✗ Updates disabled'}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground">{user.email}</div>
                              </Label>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-muted-foreground py-4">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                            Loading users...
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={() => setShowConfirmation(true)}
                    disabled={sendingAnnouncement || !announcementForm.subject.trim() || !announcementForm.message.trim() || (sendMode === 'selected' && selectedUsers.length === 0)}
                    className="w-full"
                  >
                    {sendingAnnouncement ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send to {sendMode === 'all' ? projectStats.subscribedUsers : selectedUsers.length} Users
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-4">Support Management</h2>
        <SupportManagementPage />
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Confirm Announcement
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to send this announcement to{' '}
              <strong>
                {sendMode === 'all' 
                  ? `${projectStats?.subscribedUsers || 0} users with project updates enabled`
                  : `${selectedUsers.length} selected users`
                }
              </strong>?
              <br /><br />
              <strong>Subject:</strong> {announcementForm.subject}
              <br />
              <strong>Message:</strong> {announcementForm.message.substring(0, 100)}
              {announcementForm.message.length > 100 && '...'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSendAnnouncement}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {sendingAnnouncement ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Announcement
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

            <DashboardFooter />
          </div>
    </div>
      </div>
    </>
  );
}
