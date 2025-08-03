'use client'

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { TopDownAnalysis } from '@/types/tda';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp, TrendingDown, Minus, AlertTriangle, Eye, Trash2, Loader2, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from './UserProfileContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import TDADetailsDialog from './TDADetailsDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const TDAHistory = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useUserProfile();
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [timeframeData, setTimeframeData] = useState<Record<string, string[]>>({});

  // Only show the 5 most recent completed analyses
  const { data: analyses, isLoading, error } = useQuery({
    queryKey: ['tda-history', 5],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('top_down_analyses')
        .select('*')
        .eq('status', 'COMPLETED')
        .order('created_at', { ascending: false })
        .limit(5);
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
          console.log(`Fetching timeframes for analysis: ${analysis.id}`);
          
          // Retry mechanism for network issues
          let response;
          let retries = 0;
          const maxRetries = 2;
          
          while (retries <= maxRetries) {
            try {
              response = await fetch(`/api/tda/timeframe-analyses?analysis_id=${analysis.id}`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                },
                signal: AbortSignal.timeout(10000), // 10 second timeout
              });
              break; // Success, exit retry loop
            } catch (fetchError) {
              retries++;
              if (retries > maxRetries) {
                throw fetchError;
              }
              console.log(`Retry ${retries} for analysis ${analysis.id} due to network error`);
              await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // Exponential backoff
            }
          }
          
          if (!response || !response.ok) {
            console.error(`HTTP error for analysis ${analysis.id}:`, response?.status, response?.statusText);
            timeframeMap[analysis.id] = [];
            continue;
          }
          
          const data = await response.json();
          const timeframes = data.timeframe_analyses?.map((ta: any) => ta.timeframe) || [];
          timeframeMap[analysis.id] = timeframes;
          console.log(`Successfully fetched ${timeframes.length} timeframes for analysis ${analysis.id}`);
        } catch (error) {
          console.error('Error fetching timeframes for analysis:', analysis.id, error);
          // Don't let one failed request break the entire component
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
      queryClient.invalidateQueries({ queryKey: ['tda-history'] });
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
    setSelectedAnalysisId(analysis.id);
    setIsDetailsOpen(true);
  };

  const handleDelete = (analysisId: string) => {
    deleteMutation.mutate(analysisId);
  };

  // Get selected timeframes for an analysis
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
    // If no timeframes found, check if we're still loading or if there was an error
    if (analysis.id in timeframeData) {
      return 'No timeframes';
    } else {
      return 'Loading...';
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
        <p className="text-slate-500 mt-2">Loading recent analyses...</p>
          </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Failed to load recent analyses</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analyses || analyses.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground text-sm">No completed analyses yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" />
          </CardTitle>
          <CardDescription>
            Your 5 most recent completed analyses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {analyses.map((analysis) => (
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
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View Details</p>
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
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <TDADetailsDialog
        analysisId={selectedAnalysisId || ''}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />
    </>
  );
}

export default TDAHistory; 