'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { TopDownAnalysis } from '@/types/tda';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp, TrendingDown, Minus, AlertTriangle, Eye, Trash2, Loader2, Download, Plus, Search, Filter, Target } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { downloadTDAAsWord, TDADocumentData } from '@/lib/tdaWordExport';
import { useUserProfile } from '@/components/UserProfileContext';
import TopDownAnalysisDialog from '@/components/TopDownAnalysisDialog';
import { Skeleton } from '@/components/ui/skeleton';
import DashboardFooter from '@/components/DashboardFooter';
import PerformanceAnalysis from '@/components/PerformanceAnalysis';
import TDADetailsDialog from '@/components/TDADetailsDialog';
import { LoadingPage } from '../components/ui/loading-spinner';

export default function TopDownAnalysisPage() {
  const { profile } = useUserProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<TopDownAnalysis | null>(null);
  const [detailedAnalysis, setDetailedAnalysis] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isTDAOpen, setIsTDAOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [isDownloading, setIsDownloading] = useState(false);
  const [timeframeData, setTimeframeData] = useState<Record<string, string[]>>({});
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Fetch analyses
  const { data: analyses, isLoading, error } = useQuery({
    queryKey: ['tda-analyses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('top_down_analyses')
        .select('*')
        .eq('status', 'COMPLETED')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as TopDownAnalysis[];
    }
  });

  // Fetch timeframe data for all analyses
  useEffect(() => {
    const fetchTimeframeData = async () => {
      if (!analyses || analyses.length === 0) return;
      
      const timeframeMap: Record<string, string[]> = {};
      
      for (const analysis of analyses) {
        try {
          const response = await fetch(`/api/tda/timeframe-analyses?analysis_id=${analysis.id}`);
          if (response.ok) {
            const data = await response.json();
            const timeframes = data.timeframe_analyses?.map((ta: any) => ta.timeframe) || [];
            timeframeMap[analysis.id] = timeframes;
          }
        } catch (error) {
          console.error('Error fetching timeframes for analysis:', analysis.id, error);
          timeframeMap[analysis.id] = [];
        }
      }
      
      setTimeframeData(timeframeMap);
    };

    fetchTimeframeData();
  }, [analyses]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (analysisId: string) => {
      const response = await fetch(`/api/tda?id=${analysisId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete analysis');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tda-analyses'] });
      toast({
        title: "Analysis deleted",
        description: "The analysis has been successfully removed.",
      });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete the analysis. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleViewDetails = async (analysis: TopDownAnalysis) => {
    setSelectedAnalysis(analysis);
    setIsTDAOpen(false); // Close TDA dialog if open
    setIsDetailsOpen(true);
  };

  const handleDelete = (analysisId: string) => {
    deleteMutation.mutate(analysisId);
  };

  const handleDownload = async (analysis: TopDownAnalysis) => {
    if (!profile) return;
    
    setIsDownloading(true);
    try {
      // Fetch the full analysis data for download
      const response = await fetch(`/api/tda?id=${analysis.id}`);
      if (!response.ok) throw new Error('Failed to fetch analysis data');
      const data = await response.json();
      
      const analystName = profile.first_name && profile.last_name ? 
        `${profile.first_name} ${profile.last_name}` : 
        profile.username || 'User';

      const documentData: TDADocumentData = {
        analysis: data.analysis,
        timeframe_analyses: data.timeframe_analyses || [],
        answers: data.answers || [],
        questions: data.questions || [],
        screenshots: data.screenshots || [],
        announcements: data.announcements || [],
        analystName,
      };

      const fileName = `TDA_${analysis.currency_pair}_${format(new Date(analysis.analysis_date || analysis.created_at), 'yyyy-MM-dd')}.docx`;
      
      await downloadTDAAsWord(documentData, fileName);
      
      toast({
        title: "Download Successful",
        description: "TDA report has been downloaded as a Word document.",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download TDA report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const getSelectedTimeframes = (analysis: TopDownAnalysis) => {
    const timeframes = timeframeData[analysis.id] || [];
    if (timeframes.length > 0) {
      const friendlyNames = timeframes.map(tf => {
        switch (tf) {
          case 'DAILY': return 'Daily';
          case 'H1': return '1 Hour';
          case 'H2': return '2 Hour';
          case 'H4': return '4 Hour';
          case 'M15': return '15 Min';
          case 'M30': return '30 Min';
          default: return tf;
        }
      });
      return friendlyNames.join(', ');
    }
    return 'No timeframes';
  };

  // Filter analyses
  const filteredAnalyses = analyses?.filter(analysis => {
    const matchesSearch = searchTerm === '' || 
      analysis.currency_pair.toLowerCase().includes(searchTerm.toLowerCase()) ||
      analysis.notes?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCurrency = currencyFilter === 'all' || analysis.currency_pair === currencyFilter;
    
    return matchesSearch && matchesCurrency;
  }) || [];

  if (error) {
    return (
      <>
        <PageHeader title="Top Down Analysis" mainScrollRef={mainScrollRef} />
        <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-background to-muted/40">
          <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-0 pointer-events-none" />
          <div className="relative w-full max-w-7xl mx-auto bg-card/90 rounded-2xl shadow-2xl border border-border p-6 md:p-12 my-8 z-10 flex flex-col min-h-[80vh]">
            <div ref={mainScrollRef} className="h-[calc(100vh-3.5rem)] overflow-y-auto">
              <div className="py-6 px-4 sm:px-6 lg:px-8">
                <p className="text-destructive">Failed to load Top Down Analysis data. Please try again later.</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (isLoading) {
    return (
      <LoadingPage 
        title="Loading Top Down Analysis" 
        description="Fetching your analysis data..." 
      />
    );
  }

  return (
    <>
      <PageHeader title="Top Down Analysis" mainScrollRef={mainScrollRef} />
      <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-background to-muted/40">
        <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-0 pointer-events-none" />
        <div className="relative w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-6xl xl:max-w-7xl mx-auto bg-card/90 rounded-2xl shadow-2xl border border-border p-3 sm:p-4 md:p-6 lg:p-8 xl:p-12 my-4 sm:my-6 md:my-8 z-10 flex flex-col min-h-[80vh] max-h-[90vh]">
          <div ref={mainScrollRef} className="flex-1 overflow-y-auto">
            <div className="py-3 sm:py-4 md:py-6 px-2 sm:px-4 md:px-6 lg:px-8">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <Button 
                  onClick={() => setIsTDAOpen(true)}
                  className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
                  title="Add New Top Down Analysis"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" /> TDA
                </Button>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Search by currency pair or notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-sm sm:text-base"
                  />
                </div>
                <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                  <SelectTrigger className="w-full sm:w-48 text-sm sm:text-base">
                    <SelectValue placeholder="Filter by currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Currencies</SelectItem>
                    {Array.from(new Set(analyses?.map(a => a.currency_pair) || [])).map(pair => (
                      <SelectItem key={pair} value={pair}>{pair}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Analysis List */}
              {filteredAnalyses.length === 0 ? (
                <div className="bg-muted/60 border border-muted rounded-lg p-4 sm:p-6 md:p-8 flex flex-col items-center justify-center text-center max-w-xl mx-auto shadow-sm mb-6 sm:mb-8">
                  <Target className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-muted-foreground mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">No Top Down Analyses yet</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                    {searchTerm || currencyFilter !== 'all' 
                          ? 'Try adjusting your filters or search terms.'
                      : 'Start your first Top Down Analysis to gain valuable market insights and improve your trading strategy!'
                        }
                      </p>
                  {!searchTerm && currencyFilter === 'all' && (
                    <Button onClick={() => setIsTDAOpen(true)} className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base">
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4" /> Create First Analysis
                        </Button>
                      )}
                    </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {filteredAnalyses.map((analysis) => (
                    <Card key={analysis.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-4 sm:pt-6">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 space-y-2 sm:space-y-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-base sm:text-lg">{analysis.currency_pair}</h4>
                          </div>
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                            {analysis.analysis_date ? (
                              <>
                                {new Date(analysis.analysis_date).toLocaleDateString('en-US', { 
                                  year: 'numeric', month: 'short', day: 'numeric' 
                                })}
                                {analysis.analysis_time && (
                                  <span className="ml-1 sm:ml-2">
                                    {analysis.analysis_time}
                                  </span>
                                )}
                              </>
                            ) : (
                              format(new Date(analysis.created_at), 'MMM dd, yyyy HH:mm')
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <Badge variant="outline" className="text-xs">
                            {analysis.status}
                          </Badge>
                          <Badge variant={analysis.ai_summary ? "default" : "secondary"} className="text-xs">
                            AI Analysis: {analysis.ai_summary ? "Enabled" : "Disabled"}
                            </Badge>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-4 mb-3">
                          <div>
                            <span className="text-xs sm:text-sm font-semibold text-slate-700">Timeframes:</span>
                            <span className="text-xs sm:text-sm text-slate-800 ml-1 sm:ml-2">{getSelectedTimeframes(analysis)}</span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                          <div className="text-xs text-muted-foreground">
                            {analysis.completed_at ? (
                              <>Completed {format(new Date(analysis.completed_at), 'MMM dd, HH:mm')}</>
                            ) : (
                              <>Created {format(new Date(analysis.created_at), 'MMM dd, HH:mm')}</>
                            )}
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewDetails(analysis)}
                              className="text-xs sm:text-sm h-8 sm:h-9"
                            >
                              <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              <span className="hidden sm:inline">View Details</span>
                              <span className="sm:hidden">View</span>
                            </Button>
                            
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownload(analysis)}
                              disabled={isDownloading}
                              title="Download as Word Document"
                              className="h-8 sm:h-9"
                            >
                              {isDownloading ? (
                                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                              ) : (
                                <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                              )}
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 sm:h-9">
                                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Analysis</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this Top Down Analysis? This action cannot be undone and will permanently remove all associated data including screenshots and announcements.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(analysis.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                    disabled={deleteMutation.isPending}
                                  >
                                    {deleteMutation.isPending ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Deleting...
                                      </>
                                    ) : (
                                      'Delete'
                                    )}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DashboardFooter />
        </div>
      </div>

      {/* TDA Dialog */}
      <TopDownAnalysisDialog 
        isOpen={isTDAOpen} 
        onClose={() => {
          setIsTDAOpen(false);
          queryClient.invalidateQueries({ queryKey: ['tda-analyses'] });
        }} 
      />

      {/* TDADetailsDialog */}
      <TDADetailsDialog
        analysisId={selectedAnalysis?.id || ''}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />
    </>
  );
} 