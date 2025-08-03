import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, TrendingUp, User, Download, X, ImageIcon, Bell, Brain } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { downloadTDAAsWord } from '@/lib/tdaWordExport';
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
  const { toast } = useToast();

  const fetchAnalysisData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tda?id=${analysisId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analysis data');
      }
      const result = await response.json();
      setData(result);
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
  };

  const handleDownload = async () => {
    if (!data) return;
    
    setIsDownloading(true);
    try {
      await downloadTDAAsWord({ ...data, analystName: 'Unknown' }, "TopDownAnalysis.docx");
      toast({
        title: "Success",
        description: "Analysis downloaded successfully",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download analysis",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
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
      case 'DAILY': return 'Daily';
      case 'H1': return '1 Hour';
      case 'H2': return '2 Hour';
      case 'M15': return '15 Minutes';
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

  // Check if timeframe should show summary only
  const isSummaryOnlyTimeframe = (timeframe: string) => {
    return ['DAILY', 'H1', 'M15'].includes(timeframe);
  };

  // Get summary questions for specific timeframes
  const getSummaryQuestions = (timeframe: string) => {
    if (timeframe === 'DAILY') {
      return [
        { id: 'daily_announcements', question_text: 'Announcements' },
        { id: 'daily_trend', question_text: 'Current Daily Trend' },
        { id: 'daily_analysis', question_text: 'Analysis' }
      ];
    } else if (timeframe === 'H1') {
      return [
        { id: 'hour_trend', question_text: 'Current Hourly Trend' },
        { id: 'hour_analysis', question_text: 'Analysis' }
      ];
    } else if (timeframe === 'M15') {
      return [
        { id: 'min15_trend', question_text: 'Current 15-Minute Trend' },
        { id: 'min15_analysis', question_text: 'Analysis' }
      ];
    }
    return [];
  };

  const getHardcodedQuestions = (timeframe: string) => {
    if (timeframe === 'DAILY') {
      return [
        { id: 'daily_announcements', question_text: 'Announcements' },
        { id: 'daily_trend', question_text: 'Current Daily Trend' },
        { id: 'daily_support_resistance', question_text: "Today's Key Support / Resistance Levels" },
        { id: 'daily_cycle_pressure', question_text: 'Cycle Pressure' },
        { id: 'daily_cycle_notes', question_text: 'Notes' },
        { id: 'daily_previous_candle', question_text: 'Previous Candle Colour' },
        { id: 'daily_pivot_range', question_text: "Today's Pivot Point Range" },
        { id: 'daily_pivot_notes', question_text: 'Notes' },
        { id: 'daily_patterns', question_text: 'Candle / Chart Patterns' },
        { id: 'daily_fibonacci_low', question_text: 'Fibonacci: Swing Low' },
        { id: 'daily_fibonacci_high', question_text: 'Fibonacci: Swing High' },
        { id: 'daily_macd_lines_waterline', question_text: 'MACD Lines: Waterline' },
        { id: 'daily_macd_lines_position', question_text: 'MACD Lines: Position' },
        { id: 'daily_macd_lines_movement', question_text: 'MACD Lines: Movement' },
        { id: 'daily_macd_lines_sentiment', question_text: 'MACD Lines: Sentiment' },
        { id: 'daily_macd_lines_notes', question_text: 'Notes' },
        { id: 'daily_macd_histogram_waterline', question_text: 'MACD Histogram: Position' },
        { id: 'daily_macd_histogram_movement', question_text: 'MACD Histogram: Movement' },
        { id: 'daily_macd_histogram_sentiment', question_text: 'MACD Histogram: Sentiment' },
        { id: 'daily_macd_histogram_notes', question_text: 'Notes' },
        { id: 'daily_rsi_condition', question_text: 'RSI: Condition' },
        { id: 'daily_rsi_direction', question_text: 'RSI: Direction' },
        { id: 'daily_rsi_position', question_text: 'RSI: Black vs Yellow' },
        { id: 'daily_rsi_sentiment', question_text: 'RSI: Sentiment' },
        { id: 'daily_rsi_notes', question_text: 'Notes' },
        { id: 'daily_rei_condition', question_text: 'REI: Condition' },
        { id: 'daily_rei_direction', question_text: 'REI: Direction' },
        { id: 'daily_rei_sentiment', question_text: 'REI: Sentiment' },
        { id: 'daily_rei_notes', question_text: 'Notes' },
        { id: 'daily_analysis', question_text: 'Analysis' }
      ];
    } else if (timeframe === 'H1') {
      return [
        { id: 'hour_trend', question_text: 'Current Hourly Trend' },
        { id: 'hour_support_resistance', question_text: "Hour's Key Support / Resistance Levels" },
        { id: 'hour_cycle_pressure', question_text: 'Cycle Pressure' },
        { id: 'hour_cycle_notes', question_text: 'Notes' },
        { id: 'hour_macd_lines_waterline', question_text: 'MACD Lines: Waterline' },
        { id: 'hour_macd_lines_position', question_text: 'MACD Lines: Position' },
        { id: 'hour_macd_lines_movement', question_text: 'MACD Lines: Movement' },
        { id: 'hour_macd_lines_sentiment', question_text: 'MACD Lines: Sentiment' },
        { id: 'hour_macd_lines_notes', question_text: 'Notes' },
        { id: 'hour_macd_histogram_waterline', question_text: 'MACD Histogram: Position' },
        { id: 'hour_macd_histogram_movement', question_text: 'MACD Histogram: Movement' },
        { id: 'hour_macd_histogram_sentiment', question_text: 'MACD Histogram: Sentiment' },
        { id: 'hour_macd_histogram_notes', question_text: 'Notes' },
        { id: 'hour_rsi_condition', question_text: 'RSI: Condition' },
        { id: 'hour_rsi_direction', question_text: 'RSI: Direction' },
        { id: 'hour_rsi_position', question_text: 'RSI: Black vs Yellow' },
        { id: 'hour_rsi_sentiment', question_text: 'RSI: Sentiment' },
        { id: 'hour_rsi_notes', question_text: 'Notes' },
        { id: 'hour_rei_condition', question_text: 'REI: Condition' },
        { id: 'hour_rei_direction', question_text: 'REI: Direction' },
        { id: 'hour_rei_sentiment', question_text: 'REI: Sentiment' },
        { id: 'hour_rei_notes', question_text: 'Notes' },
        { id: 'hour_analysis', question_text: 'Analysis' }
      ];
    } else if (timeframe === 'M15') {
      return [
        { id: 'min15_trend', question_text: 'Current 15-Minute Trend' },
        { id: 'min15_support_resistance', question_text: "15-Minute's Key Support / Resistance Levels" },
        { id: 'min15_cycle_pressure', question_text: 'Cycle Pressure' },
        { id: 'min15_cycle_notes', question_text: 'Notes' },
        { id: 'min15_trend_line', question_text: 'Most Relevant Trend Line' },
        { id: 'min15_price_location', question_text: 'Price Location' },
        { id: 'min15_drive_exhaustion', question_text: 'Drive / Exhaustion' },
        { id: 'min15_patterns', question_text: 'Candle / Chart Patterns' },
        { id: 'min15_fibonacci_low', question_text: 'Fibonacci: Swing Low' },
        { id: 'min15_fibonacci_high', question_text: 'Fibonacci: Swing High' },
        { id: 'min15_rsi_position', question_text: 'RSI: Black vs Yellow' },
        { id: 'min15_rsi_sentiment', question_text: 'RSI: Sentiment' },
        { id: 'min15_rsi_notes', question_text: 'Notes' },
        { id: 'min15_rei_condition', question_text: 'REI: Condition' },
        { id: 'min15_rei_direction', question_text: 'REI: Direction' },
        { id: 'min15_rei_sentiment', question_text: 'REI: Sentiment' },
        { id: 'min15_rei_notes', question_text: 'Notes' },
        { id: 'min15_analysis', question_text: 'Analysis' }
      ];
    }
    return [];
  };

  useEffect(() => {
    if (isOpen && analysisId) {
      fetchAnalysisData();
    }
  }, [isOpen, analysisId, fetchAnalysisData]);

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
  const analyzedTimeframes = (data.timeframe_analyses || []).map((ta: TDATimeframeAnalysis) => ta.timeframe as string);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100 border-0 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] backdrop-blur-sm [&>button]:hidden">
          <DialogHeader className="bg-black/80 backdrop-blur-md rounded-t-xl border-b border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-3 sm:p-4 md:p-6">
            <div className="flex items-start justify-between w-full">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-white font-bold text-lg sm:text-xl md:text-2xl px-1 sm:px-2">
                  Top Down Analysis Details
                </DialogTitle>
                <DialogDescription className="text-gray-200 mt-1 sm:mt-2 font-medium px-1 sm:px-2 text-sm sm:text-base">
                  {data.analysis?.currency_pair} - {formatDateTime(data.analysis?.analysis_date)}
                </DialogDescription>
              </div>
              <div className="flex items-center space-x-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/10"
                      >
                        {isDownloading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <Download className="h-5 w-5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="z-50 bg-background text-foreground border shadow">
                      {isDownloading ? 'Downloading...' : 'Download Word Document'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={onClose}
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/10"
                      >
                        <X className="h-5 w-5" />
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

          <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
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
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-slate-700">Date:</span>
                    <span className="text-sm text-slate-600">{formatDateTime(data.analysis?.analysis_date)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-slate-700">Time:</span>
                    <span className="text-sm text-slate-600">
                      {data.analysis?.completed_at 
                        ? new Date(data.analysis.completed_at).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: true 
                          })
                        : 'N/A'
                      }
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-slate-700">Currency Pair:</span>
                    <span className="text-sm text-slate-600">{data.analysis?.currency_pair}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getRecommendationColor(data.analysis?.trade_recommendation)}>
                      {data.analysis?.trade_recommendation || 'N/A'}
                    </Badge>
                  </div>
                </div>
                {data.analysis?.notes && (
                  <div className="mt-3 p-3 bg-white/50 rounded-lg">
                    <p className="text-sm text-slate-700">{data.analysis.notes}</p>
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
                {analyzedTimeframes.length === 0 ? (
                  <p className="text-slate-600 text-center py-4">No timeframe data available</p>
                ) : (
                  analyzedTimeframes.map((timeframe: string) => {
                    const timeframeAnalysis = data.timeframe_analyses?.find((ta: TDATimeframeAnalysis) => ta.timeframe === timeframe);
                    const timeframeAnswers = data.answers || [];
                    const isSummaryOnly = isSummaryOnlyTimeframe(timeframe);
                    const questionsToShow = isSummaryOnly ? getSummaryQuestions(timeframe) : getHardcodedQuestions(timeframe);

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

                        {/* Questions and Answers */}
                        <div className="space-y-3">
                          {questionsToShow.map((question: TDAQuestion) => {
                            // Find the answer by matching question text instead of ID
                            const answer = data.answers.find((a: TDAAnswer) => {
                              // First try to find the question in the database questions
                              const dbQuestion = data.questions.find((q: TDAQuestion) => q.question_text === question.question_text);
                              if (dbQuestion) {
                                return a.question_id === dbQuestion.id;
                              }
                              // If not found, try direct text matching
                              return a.answer_text && a.answer_text.includes(question.question_text);
                            });
                            
                            return (
                              <div key={question.id} className="bg-white/50 rounded-lg p-3 border border-green-100">
                                <h4 className="font-medium text-slate-800 mb-2">{question.question_text}</h4>
                                <div className="text-sm text-slate-600">
                                  {(() => {
                                    const answerText = answer ? (answer.answer_text || answer.answer_value || 'No answer provided') : 'No answer provided';
                                    if (answerText === 'RED' || answerText === 'Red') {
                                      return <span className="text-red-600 font-medium">{answerText}</span>;
                                    } else if (answerText === 'GREEN' || answerText === 'Green') {
                                      return <span className="text-green-600 font-medium">{answerText}</span>;
                                    } else {
                                      return answerText;
                                    }
                                  })()}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
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

            {/* AI Analysis Summary */}
            {(data.analysis?.ai_summary || data.analysis?.ai_reasoning) && (
              <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-indigo-800">
                    <Brain className="h-5 w-5" />
                    <span>AI Analysis Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.analysis?.ai_summary && (
                    <div className="bg-white/70 rounded-lg p-3 border border-indigo-200">
                      <h4 className="font-medium text-slate-800 mb-2">Summary</h4>
                      <p className="text-sm text-slate-700">{data.analysis.ai_summary}</p>
                    </div>
                  )}
                  {data.analysis?.ai_reasoning && (
                    <div className="bg-white/70 rounded-lg p-3 border border-indigo-200">
                      <h4 className="font-medium text-slate-800 mb-2">Reasoning</h4>
                      <p className="text-sm text-slate-700">{data.analysis.ai_reasoning}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {data.analysis?.overall_probability && (
                      <div className="bg-white/70 rounded-lg p-3 border border-indigo-200 text-center">
                        <p className="text-xs text-slate-600">Overall Probability</p>
                        <p className="text-lg font-bold text-indigo-600">{data.analysis.overall_probability}%</p>
                      </div>
                    )}
                    {data.analysis?.confidence_level && (
                      <div className="bg-white/70 rounded-lg p-3 border border-indigo-200 text-center">
                        <p className="text-xs text-slate-600">Confidence Level</p>
                        <p className="text-lg font-bold text-indigo-600">{data.analysis.confidence_level}%</p>
                      </div>
                    )}
                    {data.analysis?.risk_level && (
                      <div className="bg-white/70 rounded-lg p-3 border border-indigo-200 text-center">
                        <p className="text-xs text-slate-600">Risk Level</p>
                        <p className="text-lg font-bold text-indigo-600">{data.analysis.risk_level}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Screenshot Modal */}
      <ScreenshotDialog open={screenshotModalOpen} onOpenChange={setScreenshotModalOpen}>
        <ScreenshotDialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <ScreenshotDialogHeader>
            <div className="flex items-center justify-between">
              <ScreenshotDialogTitle className="text-lg font-semibold">
                Chart Screenshot - {selectedScreenshot && getTimeframeDisplayName(selectedScreenshot.timeframe)}
              </ScreenshotDialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setScreenshotModalOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </ScreenshotDialogHeader>
          <div className="p-4">
            {selectedScreenshot && (
              <div className="flex justify-center">
                <img
                  src={selectedScreenshot.file_url}
                  alt={`Chart screenshot for ${selectedScreenshot.timeframe}`}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
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