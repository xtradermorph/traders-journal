import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, TrendingUp, User, Download, X, ImageIcon, Bell, Brain, ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

import { TopDownAnalysis, TDAQuestion, TDAAnswer, TDATimeframeAnalysis, TDAAnnouncement, TDAScreenshot } from '@/types/tda';
import { 
  Dialog as ScreenshotDialog, 
  DialogContent as ScreenshotDialogContent,
  DialogHeader as ScreenshotDialogHeader,
  DialogTitle as ScreenshotDialogTitle
} from '@/components/ui/dialog';

interface TDADetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  analysisId: string;
}

interface AnalysisData {
  analysis: TopDownAnalysis;
  timeframe_analyses: TDATimeframeAnalysis[];
  answers: TDAAnswer[];
  questions: TDAQuestion[];
  screenshots: TDAScreenshot[];
  announcements: TDAAnnouncement[];
}

export default function TDADetailsDialog({ isOpen, onClose, analysisId }: TDADetailsDialogProps) {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<TDAScreenshot | null>(null);
  const [screenshotModalOpen, setScreenshotModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isScreenshotFullscreen, setIsScreenshotFullscreen] = useState(false);
  const [enhancedReasoning, setEnhancedReasoning] = useState<any[]>([]);
  const [updatedMetrics, setUpdatedMetrics] = useState<any>(null);
  const [isLoadingEnhanced, setIsLoadingEnhanced] = useState(false);
  const { toast } = useToast();

  const fetchAnalysisData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tda?id=${analysisId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analysis data');
      }
      const result = await response.json();
      setData(result);
      
      // Fetch enhanced analysis with Alpha Vantage data
      await fetchEnhancedAnalysis(result.analysis);
    } catch (error) {
      console.error('Error fetching analysis data:', error);
      toast({
        title: "Error",
        description: "Failed to load analysis details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [analysisId, toast]);

  const fetchEnhancedAnalysis = async (analysis: any) => {
    setIsLoadingEnhanced(true);
    try {
      const response = await fetch('/api/tda/enhanced-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisId: analysis.id,
          currencyPair: analysis.currency_pair
        })
      });

      if (response.ok) {
        const result = await response.json();
        setEnhancedReasoning(result.enhancedReasoning || []);
        setUpdatedMetrics(result.updatedMetrics || null);
      }
    } catch (error) {
      console.error('Error fetching enhanced analysis:', error);
    } finally {
      setIsLoadingEnhanced(false);
    }
  };

  const handleDownload = async () => {
    if (!data) return;
    
    setIsDownloading(true);
    try {
      // Get selected timeframes from the questions
      const selectedTimeframes = data.questions
        .map(q => q.timeframe)
        .filter((value, index, self) => self.indexOf(value) === index);

      // Call the API route to generate and download the Word document
      const response = await fetch('/api/tda/export-word', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysis_id: analysisId,
          selected_timeframes: selectedTimeframes
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to export Word document');
      }

      // Get the blob from the response
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TDA_${data.analysis.currency_pair}_${new Date(data.analysis.analysis_date).toISOString().split('T')[0]}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Analysis downloaded successfully",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download analysis",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFixSentiments = async () => {
    try {
      const response = await fetch('/api/tda/fix-sentiments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisId: analysisId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fix sentiments');
      }

      const result = await response.json();
      
      toast({
        title: "Success",
        description: "Sentiments recalculated successfully",
      });

      // Refresh the data to show updated sentiments
      await fetchAnalysisData();
    } catch (error) {
      console.error('Fix sentiments error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fix sentiments",
        variant: "destructive"
      });
    }
  };

  const formatDateTime = (dateString: string, timeString?: string) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    if (timeString) {
      return `${formattedDate} at ${timeString}`;
    }
    
    return formattedDate;
  };

  const getTimeframeDisplayName = (timeframe: string) => {
    switch (timeframe) {
      case 'MN1': return 'Monthly';
      case 'W1': return 'Weekly';
      case 'DAILY': return 'Daily';
      case 'H8': return '8 Hour';
      case 'H4': return '4 Hour';
      case 'H2': return '2 Hour';
      case 'H1': return '1 Hour';
      case 'M30': return '30 Minute';
      case 'M15': return '15 Minute';
      case 'M10': return '10 Minute';
      default: return timeframe;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toUpperCase()) {
      case 'BULLISH': return 'bg-green-100 text-green-800';
      case 'BEARISH': return 'bg-red-100 text-red-800';
      case 'NEUTRAL': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation?.toUpperCase()) {
      case 'LONG': return 'bg-green-100 text-green-800';
      case 'SHORT': return 'bg-red-100 text-red-800';
      case 'NEUTRAL': return 'bg-gray-100 text-gray-800';
      case 'AVOID': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get questions for a specific timeframe from the database
  const getTimeframeQuestions = (timeframe: string) => {
    if (!data?.questions) return [];
    return data.questions.filter(q => q.timeframe === timeframe);
  };

  // Get answers for a specific timeframe
  const getTimeframeAnswers = (timeframe: string) => {
    if (!data?.answers) return [];
    const timeframeQuestions = getTimeframeQuestions(timeframe);
    const questionIds = timeframeQuestions.map(q => q.id);
    return data.answers.filter(a => questionIds.includes(a.question_id));
  };

  // Get selected timeframes (shared function to ensure consistency)
  const getSelectedTimeframes = () => {
    if (!data?.questions || !data?.answers || data.questions.length === 0 || data.answers.length === 0) {
      return [];
    }

    // Get unique timeframes from answers and sort from higher to lower timeframes
    const timeframes = [...new Set(data.answers.map(a => {
      const question = data.questions.find(q => q.id === a.question_id);
      return question?.timeframe;
    }).filter(Boolean))].sort((a, b) => {
      const order = { 'MN1': 1, 'W1': 2, 'DAILY': 3, 'H8': 4, 'H4': 5, 'H2': 6, 'H1': 7, 'M30': 8, 'M15': 9, 'M10': 10 };
      return (order[a as keyof typeof order] || 999) - (order[b as keyof typeof order] || 999);
    });

    return timeframes;
  };

  useEffect(() => {
    if (isOpen && analysisId) {
      fetchAnalysisData();
    }
  }, [isOpen, analysisId]);

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loading Analysis Details...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!data) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Analysis Not Found</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-gray-600">
              {!analysisId || analysisId.trim() === '' 
                ? 'No analysis selected' 
                : 'Unable to load analysis details.'
              }
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Get analyzed timeframes from timeframe_analyses


  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`w-[95vw] max-w-4xl overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100 border-0 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] backdrop-blur-sm [&>button]:hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[90vh] sm:max-h-[85vh]' : 'max-h-[70vh] sm:max-h-[75vh]'
        }`}>
          <DialogHeader className="bg-black/80 backdrop-blur-md rounded-t-xl border-b border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-2 sm:p-4 md:p-6">
            <div className="flex items-start justify-between w-full">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-white font-bold text-base sm:text-xl md:text-2xl px-1 sm:px-2">
                  Top Down Analysis Details
                </DialogTitle>
                <DialogDescription className="text-gray-200 mt-1 sm:mt-2 font-medium px-1 sm:px-2 text-xs sm:text-base">
                  {data.analysis?.currency_pair} - {formatDateTime(data.analysis?.analysis_date)}
                </DialogDescription>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => setIsExpanded(!isExpanded)}
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/10 p-1 sm:p-2"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5" />
                        ) : (
                          <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="z-50 bg-background text-foreground border shadow">
                      {isExpanded ? 'Collapse Details' : 'Expand Details'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/10 p-1 sm:p-2"
                      >
                        {isDownloading ? (
                          <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                        ) : (
                          <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="z-50 bg-background text-foreground border shadow">
                      {isDownloading ? 'Downloading...' : 'Download Word Document'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {/* Fix Sentiments Button - Only show if AI is enabled */}
                {data?.analysis?.ai_enabled && (
                  <TooltipProvider>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleFixSentiments}
                          variant="ghost"
                          size="sm"
                          className="text-white hover:bg-white/10 p-1 sm:p-2"
                        >
                          <Brain className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="z-50 bg-background text-foreground border shadow">
                        Fix Sentiments
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <TooltipProvider>
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={onClose}
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/10 p-1 sm:p-2"
                      >
                        <X className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="z-50 bg-background text-foreground border shadow">
                      Close
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </DialogHeader>

          <div className={`p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto transition-all duration-300 ease-in-out ${
            isExpanded ? 'max-h-[80vh] sm:max-h-[75vh]' : 'max-h-[40vh] sm:max-h-[45vh]'
          }`}>
            {/* Analysis Setup Section */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-blue-800">
                  <User className="h-5 w-5" />
                  <span>Analysis Setup</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-slate-700">Analysis Date & Time:</span>
                    <span className="text-sm text-slate-600">
                      {data.analysis?.analysis_date && data.analysis?.analysis_time ? (
                        <>
                          {new Date(data.analysis.analysis_date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })} at {data.analysis.analysis_time.replace(/:\d{2}$/, '')}
                        </>
                      ) : data.analysis?.completed_at ? (
                        new Date(data.analysis.completed_at).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: true 
                        }).replace(/:\d{2}/, '') // Remove seconds completely
                      ) : (
                        'N/A'
                      )}
                    </span>
                  </div>
                </div>
                
                {/* Timeframes Analysed and Currency Pair Section */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-slate-700">Timeframes Analysed:</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-slate-700">Currency Pair:</span>
                      <span className="text-sm text-slate-600">{data.analysis?.currency_pair}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const timeframes = getSelectedTimeframes();
                      
                      if (timeframes.length === 0) {
                        return <span className="text-sm text-slate-500">No timeframes available</span>;
                      }

                      return timeframes.map((timeframe: string) => (
                        <Badge key={timeframe} variant="outline" className="text-blue-700 border-blue-300">
                          {getTimeframeDisplayName(timeframe)}
                        </Badge>
                      ));
                    })()}
                  </div>
                </div>

                {/* Timeframes Sentiment Section - Only show if AI is enabled */}
                {data.analysis?.ai_enabled && (
                  <div className="mt-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Brain className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-slate-700">Timeframes Sentiment:</span>
                    </div>
                    <div className="space-y-1">
                      {(() => {
                        const timeframes = getSelectedTimeframes();
                        
                        if (timeframes.length === 0) {
                          return <span className="text-sm text-slate-500">No sentiment data available</span>;
                        }

                        return timeframes.map((timeframe: string) => {
                          const timeframeAnalysis = data.timeframe_analyses?.find((ta: TDATimeframeAnalysis) => ta.timeframe === timeframe);
                          
                          // Use the actual AI-generated sentiment from the database (same as Timeframe Analysis Summary)
                          const sentiment = timeframeAnalysis?.timeframe_sentiment || 'NEUTRAL';
                          
                          return (
                            <div key={timeframe} className="flex items-center justify-between py-1 px-2 bg-white/50 rounded-lg">
                              <span className="text-sm font-medium text-slate-700">
                                {getTimeframeDisplayName(timeframe)}:
                              </span>
                              <Badge className={sentiment === 'BULLISH' ? 'bg-green-100 text-green-800' : sentiment === 'BEARISH' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}>
                                {sentiment === 'BULLISH' ? 'Bullish' : sentiment === 'BEARISH' ? 'Bearish' : 'Neutral'}
                              </Badge>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Timeframe Analysis Summary */}
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-green-800">
                  <TrendingUp className="h-5 w-5" />
                  <span>Timeframe Analysis Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const timeframes = getSelectedTimeframes();
                  
                  if (timeframes.length === 0) {
                    return <p className="text-slate-600 text-center py-4">No timeframe data available</p>;
                  }

                  return timeframes.map((timeframe: string) => {
                    const timeframeAnalysis = data.timeframe_analyses?.find((ta: TDATimeframeAnalysis) => ta.timeframe === timeframe);
                    const timeframeQuestions = getTimeframeQuestions(timeframe);
                    const timeframeAnswers = getTimeframeAnswers(timeframe);

                    if (timeframeQuestions.length === 0) return null;

                    return (
                      <div key={timeframe} className="bg-white/70 rounded-lg p-4 border border-green-200">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-slate-800">
                            {getTimeframeDisplayName(timeframe)} Analysis
                          </h3>
                          <div className="flex items-center space-x-2">
                            {timeframeAnalysis?.timeframe_probability && (
                              <Badge variant="outline" className="text-green-700 border-green-300">
                                {timeframeAnalysis.timeframe_probability}% Probability
                              </Badge>
                            )}
                            {timeframeAnalysis?.timeframe_sentiment && (
                              <Badge className={getSentimentColor(timeframeAnalysis.timeframe_sentiment)}>
                                {timeframeAnalysis.timeframe_sentiment}
                              </Badge>
                            )}
                            {timeframeAnalysis?.timeframe_strength && (
                              <Badge variant="outline" className="text-blue-700 border-blue-300">
                                Strength: {timeframeAnalysis.timeframe_strength}%
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Questions and Answers - Structured Table Format */}
                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold text-slate-800 border-b border-blue-200 pb-2">Analysis Summary</h4>
                          
                          {/* Structured Table Format */}
                          <div className="bg-white/80 backdrop-blur-sm border border-white/30 rounded-lg overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                            <table className="w-full">
                              <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 border-b border-blue-200">Analysis Point</th>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 border-b border-blue-200">Value</th>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 border-b border-blue-200">Sentiment</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-blue-100">
                                {timeframeQuestions.map((question: TDAQuestion) => {
                                  const answer = timeframeAnswers.find((a: TDAAnswer) => a.question_id === question.id);
                                  if (!answer) return null;
                                  
                                  const answerText = answer.answer_text || String(answer.answer_value || 'No answer provided');
                                  
                                  // Use the AI-generated sentiment from the database (consistent with Analysis Setup)
                                  const getSentiment = () => {
                                    if (timeframeAnalysis?.timeframe_sentiment) {
                                      const sentiment = timeframeAnalysis.timeframe_sentiment;
                                      if (sentiment === 'BULLISH') {
                                        return { text: 'Bullish', color: 'text-green-600 bg-green-50 border-green-200' };
                                      } else if (sentiment === 'BEARISH') {
                                        return { text: 'Bearish', color: 'text-red-600 bg-red-50 border-red-200' };
                                      } else {
                                        return { text: 'Neutral', color: 'text-gray-600 bg-gray-50 border-gray-200' };
                                      }
                                    }
                                    // Fallback to answer-based sentiment if no AI sentiment available
                                    const answerStr = answerText.toLowerCase();
                                    if (answerStr.includes('long') || answerStr.includes('bullish') || answerStr.includes('green') || answerStr.includes('up')) {
                                      return { text: 'Bullish', color: 'text-green-600 bg-green-50 border-green-200' };
                                    } else if (answerStr.includes('short') || answerStr.includes('bearish') || answerStr.includes('red') || answerStr.includes('down')) {
                                      return { text: 'Bearish', color: 'text-red-600 bg-red-50 border-red-200' };
                                    } else if (answerStr.includes('neutral') || answerStr.includes('sideways')) {
                                      return { text: 'Neutral', color: 'text-gray-600 bg-gray-50 border-gray-200' };
                                    }
                                    return { text: 'N/A', color: 'text-gray-500 bg-gray-50 border-gray-200' };
                                  };
                                  
                                  const sentiment = getSentiment();
                                  
                                  return (
                                    <tr key={question.id} className="hover:bg-blue-50/50 transition-colors">
                                      <td className="px-4 py-3 text-sm font-medium text-slate-800">
                                        {question.question_text}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-slate-700">
                                        <span className="whitespace-pre-wrap">{answerText}</span>
                                      </td>
                                      <td className="px-4 py-3">
                                        <Badge variant="outline" className={`text-xs ${sentiment.color}`}>
                                          {sentiment.text}
                                        </Badge>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </CardContent>
            </Card>

            {/* Chart Screenshots */}
            {data.screenshots && data.screenshots.length > 0 && (
              <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-purple-800">
                    <ImageIcon className="h-5 w-5" />
                    <span>Chart Screenshots</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.screenshots.map((screenshot: TDAScreenshot) => (
                      <div key={screenshot.id} className="bg-white/70 rounded-lg p-3 border border-purple-200">
                        <img
                          src={screenshot.file_url}
                          alt={`Chart screenshot for ${screenshot.timeframe}`}
                          className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            setSelectedScreenshot(screenshot);
                            setScreenshotModalOpen(true);
                          }}
                          onError={(e) => {
                            console.error('Failed to load screenshot:', screenshot);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <p className="text-sm text-slate-600 mt-2 text-center">
                          {getTimeframeDisplayName(screenshot.timeframe)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Economic Announcements */}
            {data.announcements && data.announcements.length > 0 && (
              <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-yellow-800">
                    <Bell className="h-5 w-5" />
                    <span>Economic Announcements</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.announcements.map((announcement: TDAAnnouncement) => (
                      <div key={announcement.id} className="bg-white/70 rounded-lg p-3 border border-yellow-200">
                        <h4 className="font-medium text-slate-800 mb-1">{announcement.announcement_type}</h4>
                        <p className="text-sm text-slate-600 mb-2">{announcement.time}</p>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{announcement.timeframe}</span>
                          <span>{announcement.impact}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Analysis Summary - Only show if AI is enabled */}
            {data.analysis?.ai_enabled && (data.analysis?.ai_summary || data.analysis?.ai_reasoning) && (
              <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-indigo-800">
                    <Brain className="h-5 w-5" />
                    <span>AI Analysis Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-white/70 rounded-lg p-3 border border-indigo-200">
                    <h4 className="font-medium text-slate-800 mb-2">Summary</h4>
                    <p className="text-sm text-slate-700">
                      {(() => {
                        const timeframes = getSelectedTimeframes();
                        if (timeframes.length === 0) {
                          return 'No analysis data available.';
                        }

                        // Get current sentiment data for each timeframe (consistent with Timeframes Sentiment section)
                        const timeframeSentiments = timeframes.map(timeframe => {
                          const timeframeAnalysis = data.timeframe_analyses?.find((ta: TDATimeframeAnalysis) => ta.timeframe === timeframe);
                          return {
                            timeframe: getTimeframeDisplayName(timeframe),
                            sentiment: timeframeAnalysis?.timeframe_sentiment || 'NEUTRAL'
                          };
                        });

                        // Calculate overall sentiment
                        const bullishCount = timeframeSentiments.filter(t => t.sentiment === 'BULLISH').length;
                        const bearishCount = timeframeSentiments.filter(t => t.sentiment === 'BEARISH').length;
                        const neutralCount = timeframeSentiments.filter(t => t.sentiment === 'NEUTRAL').length;

                        let overallSentiment = 'neutral';
                        if (bullishCount > bearishCount && bullishCount > neutralCount) {
                          overallSentiment = 'bullish';
                        } else if (bearishCount > bullishCount && bearishCount > neutralCount) {
                          overallSentiment = 'bearish';
                        }

                        // Generate summary text with only selected timeframes
                        const timeframeText = timeframeSentiments.map(t => `${t.timeframe}: ${t.sentiment.toLowerCase()}`).join(', ');
                        const probability = updatedMetrics?.overall_probability || data.analysis?.overall_probability || 50;
                        
                        return `Top Down Analysis for ${data.analysis?.currency_pair} shows a ${probability.toFixed(1)}% probability of a ${overallSentiment} move. Key timeframes: ${timeframeText}. Recommendation: ${data.analysis?.trade_recommendation === 'AVOID' ? 'Avoid trading at this time' : `Consider ${data.analysis?.trade_recommendation?.toLowerCase() || 'neutral'} position`}.`;
                      })()}
                    </p>
                  </div>
                  <div className="bg-white/70 rounded-lg p-3 border border-indigo-200">
                    <h4 className="font-medium text-slate-800 mb-2">Reasoning</h4>
                    <div className="space-y-3">
                      {isLoadingEnhanced ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                          <span className="ml-2 text-sm text-slate-600">Loading enhanced analysis...</span>
                        </div>
                      ) : (() => {
                        const timeframes = getSelectedTimeframes();
                        if (timeframes.length === 0) {
                          return <p className="text-sm text-slate-500">No reasoning data available.</p>;
                        }

                        return timeframes.map((timeframe: string) => {
                          const timeframeAnalysis = data.timeframe_analyses?.find((ta: TDATimeframeAnalysis) => ta.timeframe === timeframe);
                          const enhancedReasoningData = enhancedReasoning.find(er => er.timeframe === timeframe);
                          
                          // Use enhanced reasoning if available, otherwise fallback to existing data
                          let reasoning = enhancedReasoningData?.reasoning || 
                                        timeframeAnalysis?.analysis_data?.ai_reasoning || 
                                        timeframeAnalysis?.analysis_data?.reasoning || 
                                        'Analysis completed based on user input and market conditions.';
                          
                          // Clean up reasoning - remove technical indicators but keep detailed analysis
                          reasoning = reasoning
                            .replace(/RSI|MACD|Moving Average|Technical indicators?/gi, '')
                            .replace(/\s+/g, ' ')
                            .trim();
                          
                          // For enhanced reasoning, allow longer text (up to 300 characters)
                          const maxLength = enhancedReasoningData?.reasoning ? 300 : 100;
                          if (reasoning.length > maxLength) {
                            reasoning = reasoning.substring(0, maxLength) + '...';
                          }
                          
                          return (
                            <div key={timeframe} className="border-l-4 border-indigo-200 pl-3 py-2">
                              <div className="flex items-center justify-between mb-1">
                                <h5 className="text-sm font-semibold text-slate-800">
                                  {getTimeframeDisplayName(timeframe)} Analysis
                                </h5>
                                <Badge className={timeframeAnalysis?.timeframe_sentiment === 'BULLISH' ? 'bg-green-100 text-green-800' : timeframeAnalysis?.timeframe_sentiment === 'BEARISH' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}>
                                  {timeframeAnalysis?.timeframe_sentiment === 'BULLISH' ? 'Bullish' : timeframeAnalysis?.timeframe_sentiment === 'BEARISH' ? 'Bearish' : 'Neutral'}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-600 leading-relaxed">
                                {reasoning}
                              </p>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(updatedMetrics?.overall_probability || data.analysis?.overall_probability) && (
                      <div className="bg-white/70 rounded-lg p-3 border border-indigo-200 text-center">
                        <p className="text-xs text-slate-600">Overall Probability</p>
                        <p className="text-lg font-bold text-indigo-600">
                          {updatedMetrics?.overall_probability || data.analysis?.overall_probability}%
                          {updatedMetrics?.overall_probability && updatedMetrics.overall_probability !== data.analysis?.overall_probability && (
                            <span className="text-xs text-green-600 ml-1">↑</span>
                          )}
                        </p>
                      </div>
                    )}
                    {(updatedMetrics?.confidence_level || data.analysis?.confidence_level) && (
                      <div className="bg-white/70 rounded-lg p-3 border border-indigo-200 text-center">
                        <p className="text-xs text-slate-600">Confidence Level</p>
                        <p className="text-lg font-bold text-indigo-600">
                          {updatedMetrics?.confidence_level || data.analysis?.confidence_level}%
                          {updatedMetrics?.confidence_level && updatedMetrics.confidence_level !== data.analysis?.confidence_level && (
                            <span className="text-xs text-green-600 ml-1">↑</span>
                          )}
                        </p>
                      </div>
                    )}
                    {(updatedMetrics?.risk_level || data.analysis?.risk_level) && (
                      <div className="bg-white/70 rounded-lg p-3 border border-indigo-200 text-center">
                        <p className="text-xs text-slate-600">Risk Level</p>
                        <Badge className={
                          (updatedMetrics?.risk_level || data.analysis?.risk_level) === 'HIGH' ? 'bg-red-100 text-red-700 border-red-200' :
                          (updatedMetrics?.risk_level || data.analysis?.risk_level) === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                          'bg-green-100 text-green-700 border-green-200'
                        }>
                          {updatedMetrics?.risk_level || data.analysis?.risk_level}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Alpha Vantage Enhanced Data */}
                  {(data.analysis?.risk_reward_ratio || data.analysis?.market_volatility || data.analysis?.support_resistance) && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-slate-800 mb-2">Alpha Vantage Market Data</h4>
                      
                      {data.analysis?.risk_reward_ratio && (
                        <div className="bg-white/70 rounded-lg p-3 border border-indigo-200">
                          <p className="text-xs text-slate-600 mb-1">Risk-Reward Ratio</p>
                          <p className="text-sm font-semibold text-slate-800">{data.analysis.risk_reward_ratio}:1</p>
                        </div>
                      )}
                      
                      {data.analysis?.market_volatility && (
                        <div className="bg-white/70 rounded-lg p-3 border border-indigo-200">
                          <p className="text-xs text-slate-600 mb-1">Market Volatility</p>
                          <Badge className={
                            data.analysis.market_volatility === 'HIGH' ? 'bg-red-100 text-red-700 border-red-200' :
                            data.analysis.market_volatility === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                            'bg-green-100 text-green-700 border-green-200'
                          }>
                            {data.analysis.market_volatility}
                          </Badge>
                        </div>
                      )}
                      
                      {data.analysis?.support_resistance && (
                        <div className="bg-white/70 rounded-lg p-3 border border-indigo-200">
                          <p className="text-xs text-slate-600 mb-1">Support/Resistance</p>
                          <p className="text-sm text-slate-700">{data.analysis.support_resistance}</p>
                        </div>
                      )}
                      
                      {data.analysis?.entry_strategy && (
                        <div className="bg-white/70 rounded-lg p-3 border border-indigo-200">
                          <p className="text-xs text-slate-600 mb-1">Entry Strategy</p>
                          <p className="text-sm text-slate-700">{data.analysis.entry_strategy}</p>
                        </div>
                      )}
                      
                      {data.analysis?.exit_strategy && (
                        <div className="bg-white/70 rounded-lg p-3 border border-indigo-200">
                          <p className="text-xs text-slate-600 mb-1">Exit Strategy</p>
                          <p className="text-sm text-slate-700">{data.analysis.exit_strategy}</p>
                        </div>
                      )}
                      
                      {data.analysis?.position_sizing && (
                        <div className="bg-white/70 rounded-lg p-3 border border-indigo-200">
                          <p className="text-xs text-slate-600 mb-1">Position Sizing</p>
                          <p className="text-sm text-slate-700">{data.analysis.position_sizing}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Screenshot Modal */}
      <ScreenshotDialog open={screenshotModalOpen} onOpenChange={(open) => {
        setScreenshotModalOpen(open);
        if (!open) {
          setIsScreenshotFullscreen(false);
        }
      }}>
        <ScreenshotDialogContent 
          className={`${isScreenshotFullscreen ? 'fixed inset-0 z-[9999] max-w-none w-screen h-screen rounded-none' : 'max-w-4xl max-h-[90vh]'} overflow-y-auto`}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <ScreenshotDialogHeader className="flex items-center justify-between p-4 border-b">
            <ScreenshotDialogTitle className="text-lg font-semibold">
              Chart Screenshot - {selectedScreenshot && getTimeframeDisplayName(selectedScreenshot.timeframe)}
            </ScreenshotDialogTitle>
            <div className="flex items-center space-x-2">
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsScreenshotFullscreen(!isScreenshotFullscreen)}
                      className="h-8 w-8 p-0"
                    >
                      {isScreenshotFullscreen ? (
                        <Minimize2 className="h-4 w-4" />
                      ) : (
                        <Maximize2 className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="z-50 bg-background text-foreground border shadow">
                    {isScreenshotFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setScreenshotModalOpen(false);
                        setIsScreenshotFullscreen(false);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="z-50 bg-background text-foreground border shadow">
                    Close
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </ScreenshotDialogHeader>
          <div className={`${isScreenshotFullscreen ? 'flex-1 overflow-y-auto p-6' : 'p-4'}`}>
            {selectedScreenshot && (
              <div className="flex justify-center">
                <img
                  src={selectedScreenshot.file_url}
                  alt={`Chart screenshot for ${selectedScreenshot.timeframe}`}
                  className={`${isScreenshotFullscreen ? 'max-w-full max-h-full' : 'max-w-full max-h-[70vh]'} object-contain rounded-lg shadow-lg`}
                  onError={(e) => {
                    console.error('Failed to load screenshot in modal:', selectedScreenshot);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        </ScreenshotDialogContent>
      </ScreenshotDialog>
    </>
  );
} 