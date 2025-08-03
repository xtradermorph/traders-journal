'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { TopDownAnalysis } from '@/types/tda';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Eye, Trash2, Loader2, Download, Plus, Target, ChevronDown, ChevronRight, Star } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { downloadTDAAsWord, TDADocumentData } from '@/lib/tdaWordExport';
import { useUserProfile } from '@/components/UserProfileContext';
import TopDownAnalysisDialog from '@/components/TopDownAnalysisDialog';
import DashboardFooter from '@/components/DashboardFooter';
import TDADetailsDialog from '@/components/TDADetailsDialog';
import { LoadingPage } from '../components/ui/loading-spinner';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MonthGroup {
  month_year: string;
  month_display: string;
  analyses: TopDownAnalysis[];
  isCurrentMonth: boolean;
}

interface YearGroup {
  year: string;
  year_display: string;
  monthGroups: MonthGroup[];
  isCurrentYear: boolean;
}

export default function TopDownAnalysisPage() {
  const { profile } = useUserProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<TopDownAnalysis | null>(null);
  const [isTDAOpen, setIsTDAOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [isDownloading, setIsDownloading] = useState(false);
  const [timeframeData, setTimeframeData] = useState<Record<string, string[]>>({});
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

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
              const timeframes = data.timeframe_analyses?.map((ta: { timeframe: string }) => ta.timeframe) || [];
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

  // Get year groups with month-based organization (exact same logic as trade records)
  const getYearGroups = (analyses: TopDownAnalysis[]): YearGroup[] => {
    if (!analyses || analyses.length === 0) return [];
    
    // Group by year first, then by month within each year
    const groupedByYear: Record<string, Record<string, TopDownAnalysis[]>> = {};
    
    analyses.forEach(analysis => {
      const analysisDate = new Date(analysis.created_at);
      const year = analysisDate.getFullYear().toString();
      const monthYear = `${analysisDate.getFullYear()}-${String(analysisDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!groupedByYear[year]) groupedByYear[year] = {};
      if (!groupedByYear[year][monthYear]) groupedByYear[year][monthYear] = [];
      groupedByYear[year][monthYear].push(analysis);
    });
    
    // Create year groups
    const yearGroups: YearGroup[] = Object.entries(groupedByYear).map(([year, yearAnalyses]) => {
      const currentYear = new Date().getFullYear().toString();
      const isCurrentYear = year === currentYear;
      
      // Create month groups for this year
      const monthGroups: MonthGroup[] = Object.entries(yearAnalyses).map(([monthYear, monthAnalyses]) => ({
        month_year: monthYear,
        month_display: new Date(monthAnalyses[0].created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        analyses: monthAnalyses,
        isCurrentMonth: monthYear === new Date().toISOString().slice(0, 7),
      }));
      
      // Sort months: current month first (if current year), then newest to oldest
      monthGroups.sort((a, b) => {
        if (isCurrentYear && a.isCurrentMonth && !b.isCurrentMonth) return -1;
        if (isCurrentYear && !a.isCurrentMonth && b.isCurrentMonth) return 1;
        return b.month_year.localeCompare(a.month_year);
      });
      
      return {
        year,
        year_display: year,
        monthGroups,
        isCurrentYear,
      };
    });
    
    // Sort years: current year first, then newest to oldest
    return yearGroups.sort((a, b) => {
      if (a.isCurrentYear && !b.isCurrentYear) return -1;
      if (!a.isCurrentYear && b.isCurrentYear) return 1;
      return b.year.localeCompare(a.year);
    });
  };

  // Get today's analyses
  const getTodayAnalyses = (analyses: TopDownAnalysis[]): TopDownAnalysis[] => {
    if (!analyses || analyses.length === 0) return [];

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const todayAnalyses = analyses.filter(analysis => {
      const analysisDate = new Date(analysis.created_at).toISOString().split('T')[0];
      return analysisDate === today;
    });

    // Sort by creation time (newest first)
    return todayAnalyses.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  // Filter analyses
  const filteredAnalyses = analyses?.filter(analysis => {
    const matchesSearch = searchTerm === '' || 
      analysis.currency_pair.toLowerCase().includes(searchTerm.toLowerCase()) ||
      analysis.notes?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCurrency = currencyFilter === 'all' || analysis.currency_pair === currencyFilter;
    
    return matchesSearch && matchesCurrency;
  }) || [];

  const yearGroups = filteredAnalyses ? getYearGroups(filteredAnalyses) : [];
  const todayAnalyses = filteredAnalyses ? getTodayAnalyses(filteredAnalyses) : [];

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

               {/* Year Tabs */}
               {filteredAnalyses && filteredAnalyses.length > 0 && (
                 <div className="mb-6">
                   {yearGroups.length > 0 ? (
                     <div className="flex flex-wrap gap-2 border-b border-border pb-2">
                       {yearGroups.map((yearGroup) => (
                         <button
                           key={yearGroup.year}
                           onClick={() => setSelectedYear(selectedYear === yearGroup.year ? null : yearGroup.year)}
                           className={cn(
                             "px-4 py-2 text-sm font-medium rounded-md transition-colors border-2",
                             selectedYear === yearGroup.year
                               ? "bg-primary text-primary-foreground border-primary"
                               : yearGroup.isCurrentYear
                               ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/40 dark:hover:to-indigo-900/40 shadow-sm"
                               : "bg-muted/50 text-muted-foreground hover:bg-muted border-transparent"
                           )}
                         >
                           <div className="flex items-center gap-2">
                             {yearGroup.isCurrentYear && <Star className="h-3 w-3 fill-current" />}
                             <span>{yearGroup.isCurrentYear ? `${yearGroup.year_display} (Current)` : yearGroup.year_display}</span>
                           </div>
                         </button>
                       ))}
                     </div>
                   ) : (
                     <div className="text-center py-4 text-muted-foreground">
                       {searchTerm || currencyFilter !== 'all' ? (
                         <p>No analyses match your current filters.</p>
                       ) : (
                         <p>No analyses found.</p>
                       )}
                     </div>
                   )}
                 </div>
               )}

               {/* Today's Analyses Section */}
               {filteredAnalyses && filteredAnalyses.length > 0 && (
                 <div className="mb-8">
                   <h2 className="text-xl font-semibold text-foreground mb-4 pt-2 border-t border-border">
                     Today&apos;s Analyses
                   </h2>
                   {todayAnalyses.length > 0 ? (
                     <div className="space-y-4">
                       {todayAnalyses.map((analysis) => (
                         <div key={analysis.id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 border rounded-lg hover:scale-105 transition-transform duration-200 bg-gray-50/50 dark:bg-gray-800/50">
                           {/* Analysis Info */}
                           <div className="flex-1 space-y-3">
                             <div className="flex items-center gap-4">
                               <div className="flex items-center gap-2">
                                 <Calendar className="h-4 w-4 text-muted-foreground" />
                                 <span className="text-sm font-medium">
                                   {analysis.analysis_date ? (
                                     <>
                                       {new Date(analysis.analysis_date).toLocaleDateString('en-US', { 
                                         year: 'numeric', month: 'short', day: 'numeric' 
                                       })}
                                       {analysis.analysis_time && (
                                         <span className="ml-2">
                                           {new Date(`2000-01-01T${analysis.analysis_time}`).toLocaleTimeString('en-US', {
                                             hour: '2-digit',
                                             minute: '2-digit',
                                             hour12: true
                                           })}
                                         </span>
                                       )}
                                     </>
                                   ) : (
                                     format(new Date(analysis.created_at), 'MMM dd, yyyy HH:mm')
                                   )}
                                 </span>
                               </div>
                               <Badge variant={analysis.status === 'COMPLETED' ? "default" : "outline"} className={analysis.status === 'COMPLETED' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}>
                                 {analysis.status}
                               </Badge>
                             </div>

                             <div className="flex items-center gap-4">
                               <div>
                                 <span className="text-sm font-semibold">Currency Pair:</span>
                                 <span className="text-sm font-bold ml-2">{analysis.currency_pair}</span>
                               </div>
                               <div>
                                 <span className="text-sm font-semibold text-white">Timeframes:</span>
                                 <span className="text-sm text-orange-400 font-medium ml-2">{getSelectedTimeframes(analysis)}</span>
                               </div>
                               <div>
                                 <span className="text-sm font-semibold">AI Analysis:</span>
                                 <Badge variant={analysis.ai_summary ? "default" : "secondary"} className="ml-2 text-xs">
                                   {analysis.ai_summary ? "Enabled" : "Disabled"}
                                 </Badge>
                               </div>
                             </div>
                           </div>

                           {/* Action Buttons */}
                           <div className="flex items-center gap-2">
                             <TooltipProvider>
                               <Tooltip>
                                 <TooltipTrigger asChild>
                                   <Button 
                                     variant="outline" 
                                     size="sm"
                                     onClick={() => handleViewDetails(analysis)}
                                     className="p-2"
                                     title="View Details"
                                   >
                                     <Eye className="h-4 w-4" />
                                   </Button>
                                 </TooltipTrigger>
                                 <TooltipContent>
                                   <p>View Analysis Details</p>
                                 </TooltipContent>
                               </Tooltip>
                             </TooltipProvider>
                             
                             <TooltipProvider>
                               <Tooltip>
                                 <TooltipTrigger asChild>
                                   <Button 
                                     variant="outline" 
                                     size="sm"
                                     onClick={() => handleDownload(analysis)}
                                     disabled={isDownloading}
                                     className="p-2"
                                     title="Download Analysis"
                                   >
                                     {isDownloading ? (
                                       <Loader2 className="h-4 w-4 animate-spin" />
                                     ) : (
                                       <Download className="h-4 w-4" />
                                     )}
                                   </Button>
                                 </TooltipTrigger>
                                 <TooltipContent>
                                   <p>Download Analysis Report</p>
                                 </TooltipContent>
                               </Tooltip>
                             </TooltipProvider>
                             
                             <AlertDialog>
                               <AlertDialogTrigger asChild>
                                 <Button 
                                   variant="outline" 
                                   size="sm"
                                   className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                   title="Delete Analysis"
                                 >
                                   <Trash2 className="h-4 w-4" />
                                 </Button>
                               </AlertDialogTrigger>
                               <AlertDialogContent>
                                 <AlertDialogHeader>
                                   <AlertDialogTitle>Delete Analysis</AlertDialogTitle>
                                   <AlertDialogDescription>
                                     Are you sure you want to delete this analysis? This action cannot be undone.
                                   </AlertDialogDescription>
                                 </AlertDialogHeader>
                                 <AlertDialogFooter>
                                   <AlertDialogCancel>Cancel</AlertDialogCancel>
                                   <AlertDialogAction
                                     onClick={() => handleDelete(analysis.id)}
                                     className="bg-red-600 hover:bg-red-700"
                                   >
                                     Delete
                                   </AlertDialogAction>
                                 </AlertDialogFooter>
                               </AlertDialogContent>
                             </AlertDialog>
                           </div>
                         </div>
                       ))}
                     </div>
                   ) : (
                     <div className="text-center py-8 text-muted-foreground">
                       {searchTerm || currencyFilter !== 'all' ? (
                         <p>No analyses match your current filters for today.</p>
                       ) : (
                         <p>No analyses recorded today.</p>
                       )}
                     </div>
                   )}
                 </div>
               )}

               {/* Year-based Monthly Sections */}
               {(() => {
                 // Determine which year to show
                 let yearToShow = yearGroups.find(group => group.isCurrentYear);
                 
                 // If a specific year is selected, show that year
                 if (selectedYear) {
                   yearToShow = yearGroups.find(group => group.year === selectedYear);
                 }
                 
                 // If no year to show, return empty
                 if (!yearToShow) return null;
                 
                 return yearToShow.monthGroups.map((group) => {
                   // For current year: current month is always open, others are clickable
                   // For past years: all months are clickable (collapsed by default)
                   const isCurrentYear = yearToShow!.isCurrentYear;
                   const isOpen = (isCurrentYear && group.isCurrentMonth) || openMonth === group.month_year;
                   
                   return (
                     <div key={group.month_year} className="mb-10">
                       {isCurrentYear && group.isCurrentMonth ? (
                         // Current month in current year - always open, no chevron
                         <div className="flex items-center w-full text-left text-xl font-semibold text-foreground mb-4 pt-2 border-t border-border select-none cursor-default">
                           <span>{group.month_display}</span>
                         </div>
                       ) : (
                         // Other months - clickable with chevron
                         <button
                           onClick={() => setOpenMonth(openMonth === group.month_year ? null : group.month_year)}
                           className="flex items-center w-full text-left text-xl font-semibold text-foreground mb-4 pt-2 border-t border-border hover:text-primary transition-colors"
                         >
                           {isOpen ? (
                             <ChevronDown className="h-5 w-5 mr-2 flex-shrink-0" />
                           ) : (
                             <ChevronRight className="h-5 w-5 mr-2 flex-shrink-0" />
                           )}
                           <span>{group.month_display}</span>
                         </button>
                       )}
                       
                       {isOpen && (
                          <div className="space-y-4">
                            {group.analyses.map((analysis) => (
                              <div key={analysis.id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 border rounded-lg hover:scale-105 transition-transform duration-200 bg-gray-50/50 dark:bg-gray-800/50">
                                {/* Analysis Info */}
                                <div className="flex-1 space-y-3">
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-sm font-medium">
                                        {analysis.analysis_date ? (
                                          <>
                                            {new Date(analysis.analysis_date).toLocaleDateString('en-US', { 
                                              year: 'numeric', month: 'short', day: 'numeric' 
                                            })}
                                            {analysis.analysis_time && (
                                              <span className="ml-2">
                                                {new Date(`2000-01-01T${analysis.analysis_time}`).toLocaleTimeString('en-US', {
                                                  hour: '2-digit',
                                                  minute: '2-digit',
                                                  hour12: true
                                                })}
                                              </span>
                                            )}
                                          </>
                                        ) : (
                                          format(new Date(analysis.created_at), 'MMM dd, yyyy HH:mm')
                                        )}
                                      </span>
                                    </div>
                                    <Badge variant={analysis.status === 'COMPLETED' ? "default" : "outline"} className={analysis.status === 'COMPLETED' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}>
                                      {analysis.status}
                                    </Badge>
                                  </div>

                                  <div className="flex items-center gap-4">
                                    <div>
                                      <span className="text-sm font-semibold">Currency Pair:</span>
                                      <span className="text-sm font-bold ml-2">{analysis.currency_pair}</span>
                                    </div>
                                    <div>
                                      <span className="text-sm font-semibold text-white">Timeframes:</span>
                                      <span className="text-sm text-orange-400 font-medium ml-2">{getSelectedTimeframes(analysis)}</span>
                                    </div>
                                    <div>
                                      <span className="text-sm font-semibold">AI Analysis:</span>
                                      <Badge variant={analysis.ai_summary ? "default" : "secondary"} className="ml-2 text-xs">
                                        {analysis.ai_summary ? "Enabled" : "Disabled"}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => handleViewDetails(analysis)}
                                          className="p-2"
                                          title="View Details"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>View Analysis Details</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => handleDownload(analysis)}
                                          disabled={isDownloading}
                                          className="p-2"
                                          title="Download Analysis"
                                        >
                                          {isDownloading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <Download className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Download Analysis Report</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        title="Delete Analysis"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Analysis</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete this analysis? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDelete(analysis.id)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                     </div>
                   );
                 });
               })()}

               {/* No Analyses Message */}
               {filteredAnalyses.length === 0 && (
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