"use client"

import React, { useRef, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../src/lib/supabase';
import { toast } from 'sonner';
import { CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "../src/components/ui/alert";
import { PageHeader } from '../src/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../src/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../src/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../src/components/ui/accordion';
import { Button } from '../src/components/ui/button';
import { Input } from '../src/components/ui/input';
import { Textarea } from '../src/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../src/components/ui/form';
import { Mail, MessageSquare, FileText, ExternalLink, Send } from 'lucide-react';
import DashboardFooter from '../src/components/DashboardFooter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../src/components/ui/dialog';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supportFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }).max(100, { message: 'Name cannot exceed 100 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }).max(255, { message: 'Email cannot exceed 255 characters.' }),
  subject: z.string().min(5, { message: 'Subject must be at least 5 characters.' }).max(200, { message: 'Subject cannot exceed 200 characters.' }),
  message: z.string().min(30, { message: 'Message must be at least 30 characters to provide sufficient details.' }).max(2000, { message: 'Message cannot exceed 2000 characters.' })
});

type SupportFormValues = z.infer<typeof supportFormSchema>;

function useBackNavigation() {
  const [backUrl, setBackUrl] = useState<string>("/");
  
  useEffect(() => {
    const determineBackUrl = async () => {
      // Check if there's a previous page in browser history
      if (typeof window !== 'undefined' && window.history.length > 1) {
        // Check if we came from a specific page via sessionStorage
        const fromPage = sessionStorage.getItem('fromPage');
        if (fromPage) {
          sessionStorage.removeItem('fromPage');
          setBackUrl(fromPage);
          return;
        }
        
        // Check referrer to see where we came from
        const referrer = document.referrer;
        if (referrer) {
          const referrerUrl = new URL(referrer);
          const currentUrl = new URL(window.location.href);
          
          // If referrer is from the same domain
          if (referrerUrl.origin === currentUrl.origin) {
            const referrerPath = referrerUrl.pathname;
            
            // Don't go back to the same page or to auth pages
            if (referrerPath !== currentUrl.pathname && 
                !referrerPath.includes('/auth') && 
                !referrerPath.includes('/login') && 
                !referrerPath.includes('/register')) {
              setBackUrl(referrerPath);
              return;
            }
          }
        }
      }
      
      // Fallback: check if user is authenticated and default appropriately
      const supabase = createClientComponentClient();
      const { data: { session } } = await supabase.auth.getSession();
      setBackUrl(session ? "/dashboard" : "/");
    };
    
    determineBackUrl();
  }, []);
  
  return backUrl;
}

export default function SupportPage() {
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const backUrl = useBackNavigation();
  
  const form = useForm<SupportFormValues>({
    resolver: zodResolver(supportFormSchema),
    defaultValues: {
      name: '',
      email: '',
      subject: '',
      message: ''
    }
  });

  const onSubmit = async (data: SupportFormValues) => {
    setIsSubmitting(true);
    setSubmitSuccess(false);
    try {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      
      // Submit support request to Supabase
      const { error } = await supabase
        .from('support_requests')
        .insert({
          user_id: session?.user?.id,
          name: data.name,
          email: data.email,
          subject: data.subject,
          message: data.message,
          status: 'new'
        });

      if (error) throw error;

      toast.success('Support request submitted', {
        description: 'We will get back to you as soon as possible.'
      });

      // Set success state and reset form
      setSubmitSuccess(true);
      form.reset();
      
      // Automatically clear success message after 10 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 10000);
    } catch (error) {
      console.error('Error submitting support request:', error);
      toast.error('Error', {
        description: 'Failed to submit support request. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title="Support" mainScrollRef={mainScrollRef} showBackButton backUrl={backUrl} />
      <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-background to-muted/40">
        <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-0 pointer-events-none" />
        <div className="relative w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-6xl xl:max-w-7xl mx-auto bg-card/90 rounded-2xl shadow-2xl border border-border p-3 sm:p-4 md:p-6 lg:p-8 xl:p-12 my-4 sm:my-6 md:my-8 z-10 flex flex-col min-h-[80vh]">
      <div ref={mainScrollRef} className="flex-1 overflow-y-auto">
        <div className="container mx-auto py-3 sm:py-4 md:py-6 px-2 sm:px-4 space-y-6 sm:space-y-8 max-w-5xl">
          <Tabs defaultValue="faq" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="faq">Frequently Asked Questions</TabsTrigger>
              <TabsTrigger value="contact">Contact Support</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
            </TabsList>
            
            <TabsContent value="faq" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                  <CardDescription>
                    Find answers to common questions about Trader&apos;s Journal.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>How do I add a new trade?</AccordionTrigger>
                      <AccordionContent>
                        You can add a new trade by clicking the &quot;Add Trade&quot; button (plus icon) in the top-right corner of the dashboard. 
                        Fill in all the required trade details including currency pair, entry/exit prices, lot size, and notes. 
                        The system will automatically calculate pips and duration. Click &quot;Save Trade&quot; to record your trade.
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="item-2">
                      <AccordionTrigger>How can I view my trading statistics?</AccordionTrigger>
                      <AccordionContent>
                        Your trading statistics are displayed directly on the Dashboard.                         You can toggle between &quot;Total&quot; and &quot;Current Week&quot; 
                        performance views using the switch in the Performance Summary section. The dashboard shows:
                        <ul className="list-disc pl-6 mt-2 space-y-1">
                          <li>Average trades per day</li>
                          <li>Average time in trade</li>
                          <li>Average positive pips</li>
                          <li>Percentage of positive trades</li>
                          <li>Performance charts and currency pair analysis</li>
                        </ul>
                        You can also access detailed trade records from the Trade Records page.
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="item-3">
                      <AccordionTrigger>Can I export my trading data?</AccordionTrigger>
                      <AccordionContent>
                        Yes, you can export your trading data from the Trade Records page. Click on the &quot;Export&quot; button 
                        and select your preferred format (Excel or Word). The export includes all your trade data with 
                        detailed information for further analysis or record keeping.
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="item-4">
                      <AccordionTrigger>What is the Current Week Performance feature?</AccordionTrigger>
                      <AccordionContent>
                        The Current Week Performance feature shows your trading statistics for the current week (Monday 00:00 to Sunday 23:59). 
                        You can toggle between &quot;Total&quot; (all-time data) and &quot;Current Week&quot; using the switch on your dashboard. 
                        This feature updates dynamically based on the current date and shows your weekly performance metrics 
                        including average trades per day, win rate, and profit/loss for the current week only.
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="item-5">
                      <AccordionTrigger>How do I use Top Down Analysis?</AccordionTrigger>
                      <AccordionContent>
                        Top Down Analysis (TDA) is a comprehensive market analysis tool available from your dashboard. 
                        Click the &quot;Top Down Analysis&quot; button to:
                        <ul className="list-disc pl-6 mt-2 space-y-1">
                          <li>Select currency pairs and timeframes</li>
                          <li>Answer structured questions about market conditions</li>
                          <li>Document your analysis process</li>
                          <li>Generate AI-powered insights and recommendations</li>
                          <li>Track your analysis history and performance</li>
                        </ul>
                        This tool helps you develop a systematic approach to market analysis and decision-making.
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="item-6">
                      <AccordionTrigger>How does the Social Forum work?</AccordionTrigger>
                      <AccordionContent>
                        The Social Forum allows you to connect with other traders and share insights:
                        <ul className="list-disc pl-6 mt-2 space-y-1">
                          <li>Share trade setups with charts and analysis</li>
                          <li>Comment on and like other traders&apos; posts</li>
                          <li>Browse community discussions by currency pairs</li>
                          <li>Follow other traders and build your network</li>
                          <li>Access trending discussions and popular setups</li>
                        </ul>
                        You can access the forum from the Social Forum button on your dashboard.
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="item-7">
                      <AccordionTrigger>How do I manage my friends and connections?</AccordionTrigger>
                      <AccordionContent>
                        You can manage your trading network through the Friends system:
                        <ul className="list-disc pl-6 mt-2 space-y-1">
                          <li>Send and receive friend requests</li>
                          <li>View shared trades from your friends</li>
                          <li>Browse the traders directory to find new connections</li>
                          <li>Manage your friend list and requests</li>
                          <li>Control who can see your shared trades</li>
                        </ul>
                        Access these features from the Traders button in your dashboard header.
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="item-8">
                      <AccordionTrigger>How do I change my account settings?</AccordionTrigger>
                      <AccordionContent>
                        You can change your account settings by clicking on your profile picture in the top-right corner 
                        and selecting &quot;Settings&quot; from the dropdown menu. From there, you can update:
                        <ul className="list-disc pl-6 mt-2 space-y-1">
                          <li>Profile information and avatar</li>
                          <li>Notification preferences (email and push)</li>
                          <li>Display settings and performance view defaults</li>
                          <li>Privacy controls and data preferences</li>
                          <li>Account security settings</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="item-9">
                      <AccordionTrigger>What do the different trader medals mean?</AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-2">Our medal system recognizes and rewards your trading performance based on your percentage of positive trades:</p>
                        <ul className="list-disc pl-6 mt-2 space-y-1.5">
                          <li><span className="font-medium">Bronze medal (🥉):</span> 60-69% positive trades</li>
                          <li><span className="font-medium">Silver medal (🥈):</span> 70-79% positive trades</li>
                          <li><span className="font-medium">Gold medal (🥇):</span> 80-85% positive trades</li>
                          <li><span className="font-medium">Platinum medal (🏅):</span> 86-90% positive trades</li>
                          <li><span className="font-medium">Diamond medal (💎):</span> 91-100% positive trades</li>
                          <li><span className="font-medium">No medal:</span> Less than 60% positive trades or fewer than 10 trades total</li>
                        </ul>
                        <p className="mt-3 text-sm text-muted-foreground">
                          Medals are awarded after you&apos;ve recorded at least 10 trades. You&apos;ll receive email notifications when you earn new medals, 
                          and they appear on your profile to showcase your trading achievements.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="item-10">
                      <AccordionTrigger>How do notifications work?</AccordionTrigger>
                      <AccordionContent>
                        The app provides various notification options that you can customize in Settings:
                        <ul className="list-disc pl-6 mt-2 space-y-1">
                          <li><strong>Friend Requests:</strong> Email notifications when someone sends you a friend request</li>
                          <li><strong>Trade Sharing:</strong> Notifications when friends share trades with you</li>
                          <li><strong>Medal Achievements:</strong> Email notifications when you earn new trading medals</li>
                          <li><strong>Monthly Checkups:</strong> Optional monthly performance reports sent via email</li>
                          <li><strong>Project Updates:</strong> Important announcements about new features and updates</li>
                        </ul>
                        You can enable or disable each notification type in your Settings page.
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="item-11">
                      <AccordionTrigger>How do I edit or delete my trades?</AccordionTrigger>
                      <AccordionContent>
                        You can manage your trades from the Trade Records page:
                        <ul className="list-disc pl-6 mt-2 space-y-1">
                          <li><strong>Edit:</strong> Click the edit icon (pencil) next to any trade to modify its details</li>
                          <li><strong>Delete:</strong> Click the delete icon (trash) to permanently remove a trade</li>
                          <li><strong>Share:</strong> Use the share icon to share trades with friends</li>
                          <li><strong>View Details:</strong> Click on any trade row to see full details</li>
                        </ul>
                        All changes are saved automatically and will update your performance statistics immediately.
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="item-12">
                      <AccordionTrigger>What trading data is tracked?</AccordionTrigger>
                      <AccordionContent>
                        The app tracks comprehensive trading data including:
                        <ul className="list-disc pl-6 mt-2 space-y-1">
                          <li><strong>Trade Details:</strong> Currency pair, entry/exit prices, lot size, trade type (long/short)</li>
                          <li><strong>Timing:</strong> Entry/exit times, trade duration, date</li>
                          <li><strong>Performance:</strong> Profit/loss, pips gained/lost, win/loss status</li>
                          <li><strong>Analysis:</strong> Notes, tags, screenshots, risk management details</li>
                          <li><strong>Statistics:</strong> Win rate, average profit, performance by currency pair</li>
                        </ul>
                        This data is used to generate insights, performance reports, and help you improve your trading strategy.
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="item-13">
                      <AccordionTrigger>How does AI help with trading analysis?</AccordionTrigger>
                      <AccordionContent>
                        The app includes several AI-powered features to enhance your trading analysis:
                        <ul className="list-disc pl-6 mt-2 space-y-1">
                          <li><strong>AI Trading Insights:</strong> On your dashboard, AI analyzes your trading patterns and provides personalized insights about your performance, risk management, and potential improvements</li>
                          <li><strong>Top Down Analysis AI:</strong> When completing TDA, AI generates comprehensive market analysis, trade recommendations, and confidence levels based on your answers</li>
                          <li><strong>Trade Summary AI:</strong> In Trade Records, AI can generate detailed summaries of individual trades, highlighting key factors and lessons learned</li>
                          <li><strong>Performance Analysis:</strong> AI identifies patterns in your trading behavior, suggests optimizations, and provides actionable recommendations</li>
                        </ul>
                        These AI features help you understand your trading patterns, improve decision-making, and develop better strategies over time.
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="item-14">
                      <AccordionTrigger>Where can I find AI insights in the app?</AccordionTrigger>
                      <AccordionContent>
                        AI insights are available throughout the app:
                        <ul className="list-disc pl-6 mt-2 space-y-1">
                          <li><strong>Dashboard:</strong> "AI Trading Insights" section provides personalized analysis of your trading performance</li>
                          <li><strong>Top Down Analysis:</strong> After completing your analysis, AI generates trade recommendations and market insights</li>
                          <li><strong>Trade Records:</strong> Individual trades can be analyzed by AI for detailed summaries and lessons learned</li>
                          <li><strong>Performance Analysis:</strong> AI-powered insights about your trading patterns and improvement opportunities</li>
                        </ul>
                        All AI features are designed to complement your manual analysis and provide additional perspectives on your trading decisions.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="contact" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Support</CardTitle>
                  <CardDescription>
                    Need help with something specific? Send us a message and we&apos;ll get back to you as soon as possible.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {submitSuccess && (
                    <Alert className="mb-6 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <AlertTitle className="text-green-800 dark:text-green-400">Message Sent Successfully</AlertTitle>
                      <AlertDescription className="text-green-700 dark:text-green-500">
                        Thank you for contacting us. We&apos;ve received your message and will respond as soon as possible.
                      </AlertDescription>
                    </Alert>
                  )}
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Your name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input placeholder="Your email address" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject</FormLabel>
                            <FormControl>
                              <Input placeholder="What is your inquiry about?" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Message</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Please describe your issue or question in detail" 
                                className="min-h-[150px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <span className="mr-2">Sending...</span>
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Send Message
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="resources" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Resources</CardTitle>
                  <CardDescription>
                    Helpful resources and documentation for Trader&apos;s Journal.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-card/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center">
                          <FileText className="mr-2 h-5 w-5 text-primary" />
                          User Guide
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          Learn how to use all features of Trader&apos;s Journal with our comprehensive user guide.
                        </p>
                            <Button variant="outline" className="w-full" onClick={() => setGuideOpen(true)}>
                              <FileText className="mr-2 h-4 w-4" />
                            View Guide
                        </Button>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-card/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center">
                          <MessageSquare className="mr-2 h-5 w-5 text-primary" />
                          Community Forum
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          Join our community forum to connect with other traders, share insights, and get help.
                        </p>
                        <Button variant="outline" className="w-full" asChild>
                              <Link href="/social-forum" className="flex items-center justify-center">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Visit Forum
                              </Link>
                        </Button>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-card/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center">
                          <Mail className="mr-2 h-5 w-5 text-primary" />
                          Email Support
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          For urgent matters, you can email our support team directly.
                        </p>
                        <Button variant="outline" className="w-full" asChild>
                            <a href="mailto:support@tradersjournal.pro" className="flex items-center justify-center">
                            <Mail className="mr-2 h-4 w-4" />
                              support@tradersjournal.pro
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
        <DashboardFooter />
    </div>
      </div>
      {/* User Guide Modal */}
      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] bg-card/95 backdrop-blur-md border border-primary shadow-2xl flex flex-col">
          <DialogHeader>
            <DialogTitle className="gradient-heading text-2xl">Trader&apos;s Journal User Guide</DialogTitle>
            <DialogDescription className="mb-4">
              Everything you need to know to get the most out of your trading journal.
            </DialogDescription>
          </DialogHeader>
          <div className="prose max-w-none text-foreground overflow-y-auto" style={{ maxHeight: 'calc(80vh - 120px)' }}>
            <h2 className="text-primary">Getting Started</h2>
            <ul>
              <li>Register or log in to your account using email and password.</li>
              <li>Set up your profile and preferences in the Settings page.</li>
              <li>Explore the Dashboard for an overview of your trading activity and performance metrics.</li>
              <li>Customize your dashboard view and notification preferences.</li>
            </ul>
            
            <h2 className="text-primary">Recording Trades</h2>
            <ul>
              <li>Click the <b>Add Trade</b> button (plus icon) in the top-right corner of your dashboard.</li>
              <li>Fill in all required trade details including currency pair, entry/exit prices, lot size, and trade type.</li>
              <li>Add notes and tags to organize your trades and capture important observations.</li>
              <li>The system automatically calculates pips and trade duration based on your inputs.</li>
              <li>Click "Save Trade" to record your trade in the system.</li>
            </ul>
            
            <h2 className="text-primary">Managing Your Trades</h2>
            <ul>
              <li>Access all your trades from the <b>Trade Records</b> page.</li>
              <li>Edit trade details by clicking the edit icon (pencil) next to any trade.</li>
              <li>Delete trades using the delete icon (trash) - this action is permanent.</li>
              <li>Share trades with friends using the share icon.</li>
              <li>Export your trade data to Excel or Word format for external analysis.</li>
            </ul>
            
            <h2 className="text-primary">Performance Analysis</h2>
            <ul>
              <li>View your trading statistics directly on the Dashboard with real-time updates.</li>
              <li>Toggle between "Total" and "Current Week" performance views using the switch.</li>
              <li>Monitor key metrics: average trades per day, time in trade, positive pips, and win rate.</li>
              <li>Review performance charts and currency pair analysis.</li>
              <li>Access detailed performance breakdowns and insights.</li>
            </ul>
            
            <h2 className="text-primary">Top Down Analysis (TDA)</h2>
            <ul>
              <li>Click the <b>Top Down Analysis</b> button on your dashboard to start a new analysis.</li>
              <li>Select currency pairs and timeframes for your market analysis.</li>
              <li>Answer structured questions about market conditions and your analysis process.</li>
              <li>Generate AI-powered insights and trade recommendations.</li>
              <li>Track your analysis history and review past TDA sessions.</li>
            </ul>
            
            <h2 className="text-primary">AI Trading Insights</h2>
            <ul>
              <li>Access AI-powered analysis in the "AI Trading Insights" section on your dashboard.</li>
              <li>Get personalized insights about your trading patterns and performance.</li>
              <li>Receive AI-generated trade summaries and lessons learned.</li>
              <li>Use AI recommendations to improve your trading strategy and decision-making.</li>
            </ul>
            
            <h2 className="text-primary">Social Features</h2>
            <ul>
              <li>Access the <b>Social Forum</b> to connect with other traders and share insights.</li>
              <li>Share trade setups with charts and analysis in the community.</li>
              <li>Comment on and like other traders&apos; posts.</li>
              <li>Browse discussions by currency pairs and trending topics.</li>
              <li>Manage your friends and connections through the Traders section.</li>
            </ul>
            
            <h2 className="text-primary">Friends & Networking</h2>
            <ul>
              <li>Send and receive friend requests from other traders.</li>
              <li>View shared trades from your friends in the Shared Trades section.</li>
              <li>Browse the traders directory to find new connections.</li>
              <li>Control who can see your shared trades and profile information.</li>
              <li>Manage your friend list and pending requests.</li>
            </ul>
            
            <h2 className="text-primary">Notifications & Communication</h2>
            <ul>
              <li>Customize notification preferences in Settings (email and push notifications).</li>
              <li>Receive notifications for friend requests, shared trades, and medal achievements.</li>
              <li>Get optional monthly performance checkup emails.</li>
              <li>Stay updated with project announcements and new features.</li>
            </ul>
            
            <h2 className="text-primary">Medal System & Achievements</h2>
            <ul>
              <li>Earn trading medals based on your percentage of positive trades.</li>
              <li>Medals are awarded after recording at least 10 trades.</li>
              <li>Receive email notifications when you earn new medals.</li>
              <li>Display your achievements on your profile to showcase your trading success.</li>
            </ul>
            
            <h2 className="text-primary">Data Export & Reports</h2>
            <ul>
              <li>Export your trade data to Excel or Word format from the Trade Records page.</li>
              <li>Generate detailed performance reports for analysis.</li>
              <li>Access periodic reports (weekly, monthly, quarterly, yearly) via email.</li>
              <li>Use exported data for external analysis or record keeping.</li>
            </ul>
            
            <h2 className="text-primary">Settings & Customization</h2>
            <ul>
              <li>Update your profile information and avatar in Settings.</li>
              <li>Customize notification preferences for different types of alerts.</li>
              <li>Set default performance view (Total or Current Week).</li>
              <li>Manage privacy controls and data preferences.</li>
              <li>Configure account security and display settings.</li>
            </ul>

            <h2 className="text-primary">Mobile & Security Features</h2>
            <ul>
              <li><strong>Biometric Authentication:</strong> Enable Face ID, Touch ID, or Windows Hello for secure login in Settings.</li>
              <li><strong>Offline Mode:</strong> Access your data without internet - changes sync automatically when online.</li>
              <li><strong>Push Notifications:</strong> Get instant alerts for trade updates, friend requests, and system notifications.</li>
              <li><strong>Mobile-Optimized Charts:</strong> Touch-friendly trading visualizations optimized for mobile devices.</li>
              <li><strong>Enhanced Security:</strong> Comprehensive audit logging and real-time security monitoring.</li>
            </ul>

            <h2 className="text-primary">Performance & User Experience</h2>
            <ul>
              <li><strong>Loading Skeletons:</strong> Visual placeholders show content structure while loading for better UX.</li>
              <li><strong>Progressive Loading:</strong> Content loads in stages, showing important information first.</li>
              <li><strong>Image Optimization:</strong> Automatic WebP conversion, responsive sizes, and lazy loading.</li>
              <li><strong>Smart Caching:</strong> Frequently accessed data loads instantly from local storage.</li>
              <li><strong>Performance Monitoring:</strong> Real-time system health and performance tracking.</li>
            </ul>
            
            <h2 className="text-primary">Support & Help</h2>
            <ul>
              <li>Contact support via the <b>Contact Support</b> tab for technical assistance.</li>
              <li>Check the <b>FAQ</b> tab for answers to common questions.</li>
              <li>Access this guide anytime from the Resources tab.</li>
              <li>Join the community forum for peer support and discussions.</li>
            </ul>
            
            <h2 className="text-primary">Tips for Success</h2>
            <ul>
              <li>Keep your journal updated regularly for the most accurate insights.</li>
              <li>Use tags and detailed notes to organize your trades effectively.</li>
              <li>Review your performance metrics regularly to identify patterns.</li>
              <li>Utilize the Current Week view to track short-term performance.</li>
              <li>Engage with the community to learn from other traders.</li>
              <li>Complete Top Down Analysis sessions to improve your market analysis skills.</li>
              <li>Set goals and track your progress using the performance metrics.</li>
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
