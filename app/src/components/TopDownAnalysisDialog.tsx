'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, ChevronLeft, ChevronRight, TrendingUp, Clock, Calendar, AlertTriangle, Info, Plus, X, User, CheckCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUserProfile } from "./UserProfileContext";
import { 
  TDAQuestion, 
  TimeframeType,
  TDAProgress,
  TDAValidationError,
  TopDownAnalysis,
  TDAAnswer,
  TDATimeframeAnalysis,
  TDAAnnouncement,
  TDAScreenshot
} from '@/types/tda';
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createPortal } from 'react-dom';

const currencyPairs = [
  "GBPUSD", "EURUSD", "AUDUSD", "USDJPY", "USDCHF", "USDCAD", "NZDUSD",
  "EURGBP", "EURJPY", "GBPJPY", "AUDJPY", "CADJPY", "CHFJPY", "NZDJPY",
  "AUDCAD", "AUDCHF", "AUDNZD", "CADCHF", "EURAUD", "EURCAD", "EURCHF",
  "EURNZD", "GBPAUD", "GBPCAD", "GBPCHF", "GBPNZD", "NZDCAD", "NZDCHF",
  "Other"
];

const allTimeframes: { value: TimeframeType; label: string; icon: React.ReactNode; order: number }[] = [
  {
    value: 'MN1',
    label: 'Monthly Analysis',
    icon: <Calendar className="h-4 w-4" />,
    order: 1
  },
  {
    value: 'W1',
    label: 'Weekly Analysis',
    icon: <Calendar className="h-4 w-4" />,
    order: 2
  },
  {
    value: 'DAILY',
    label: 'Daily Analysis',
    icon: <Calendar className="h-4 w-4" />,
    order: 3
  },
  {
    value: 'H8',
    label: '8 Hour Analysis',
    icon: <Clock className="h-4 w-4" />,
    order: 4
  },
  {
    value: 'H4',
    label: '4 Hour Analysis',
    icon: <Clock className="h-4 w-4" />,
    order: 5
  },
  {
    value: 'H2',
    label: '2 Hour Analysis',
    icon: <Clock className="h-4 w-4" />,
    order: 6
  },
  {
    value: 'H1',
    label: '1 Hour Analysis',
    icon: <Clock className="h-4 w-4" />,
    order: 7
  },
  {
    value: 'M30',
    label: '30 Minute Analysis',
    icon: <TrendingUp className="h-4 w-4" />,
    order: 8
  },
  {
    value: 'M15',
    label: '15 Minute Analysis',
    icon: <TrendingUp className="h-4 w-4" />,
    order: 9
  },
  {
    value: 'M10',
    label: '10 Minute Analysis',
    icon: <TrendingUp className="h-4 w-4" />,
    order: 10
  }
];

// Form schema for initial setup
const setupSchema = z.object({
  currency_pair: z.string()
    .min(1, "Currency pair is required")
    .max(6, "Currency pair must be 6 characters or less")
    .regex(/^[A-Z]{6}$/, "Currency pair must be uppercase letters only"),
  selected_timeframes: z.array(z.string()).min(1, "At least one timeframe must be selected").max(10, "Maximum 10 timeframes allowed"),
  analysis_date: z.string().optional(),
  analysis_time: z.string().optional(),
});

type SetupFormValues = z.infer<typeof setupSchema>;

interface TopDownAnalysisDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface QuestionFormData {
  [questionId: string]: any;
}

interface TDAAnswerInput {
  analysis_id: string;
  question_id: string;
  answer_text?: string;
  answer_value?: any;
}



const TopDownAnalysisDialog = ({ isOpen, onClose }: TopDownAnalysisDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useUserProfile();
  const [currentStep, setCurrentStep] = useState(0);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [currentTimeframe, setCurrentTimeframe] = useState<TimeframeType>('DAILY');
  const [questionAnswers, setQuestionAnswers] = useState<QuestionFormData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [enableAIAnalysis, setEnableAIAnalysis] = useState(false);
  const [validationState, setValidationState] = useState({ hasTriedNext: false, validationErrors: [] as TDAValidationError[] });
  const [selectedTimeframes, setSelectedTimeframes] = useState<TimeframeType[]>(['DAILY', 'H1', 'M15']);
  const [announcements, setAnnouncements] = useState<TDAAnnouncement[]>([]);
  const [screenshots, setScreenshots] = useState<{ [key in TimeframeType]: TDAScreenshot[] }>({
    DAILY: [], H1: [], M15: [], M30: [], M10: [], H8: [], H4: [], H2: [], MN1: [], W1: []
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    time: '',
    announcement_type: '',
    impact: 'MEDIUM' as 'MEDIUM' | 'HIGH'
  });
  const [analysisTimestamp, setAnalysisTimestamp] = useState<{ date: string; time: string } | null>(null);
  const [expanded, setExpanded] = useState(false); // Expand/collapse state
  const [showValidationDialog, setShowValidationDialog] = useState(false); // Validation dialog state
  const [openTooltipId, setOpenTooltipId] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  // Add click outside handler for tooltips
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-tooltip]') && !target.closest('button')) {
        setOpenTooltipId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Function to generate rounded timestamp
  const generateRoundedTimestamp = () => {
    const now = new Date();
    const currentMinutes = now.getMinutes();
    
    // Round to nearest 15-minute interval
    const roundedMinutes = Math.round(currentMinutes / 15) * 15;
    
    // Handle edge case where rounding goes to 60
    if (roundedMinutes === 60) {
      now.setHours(now.getHours() + 1);
      now.setMinutes(0);
    } else {
      now.setMinutes(roundedMinutes);
    }
    
    // Format date and time
    const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const time = now.toTimeString().slice(0, 5); // HH:MM
    
    return { date, time };
  };

  // Form for initial setup
  const setupForm = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      currency_pair: "GBPUSD",
      selected_timeframes: ["DAILY", "H1", "M15"],
      analysis_date: "",
      analysis_time: "",
    }
  });

  // Generate timestamp when dialog opens
  useEffect(() => {
    if (isOpen && currentStep === 0) {
      const timestamp = generateRoundedTimestamp();
      setAnalysisTimestamp(timestamp);
      setupForm.setValue('analysis_date', timestamp.date);
      setupForm.setValue('analysis_time', timestamp.time);
    }
  }, [isOpen, currentStep, setupForm]);

  // Fetch questions from database
  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ['tda-questions'],
    queryFn: async () => {
      const response = await fetch('/api/tda/questions');
      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }
      const data = await response.json();
      return data.questions || [];
    }
  });



  // Create analysis mutation
  const createAnalysisMutation = useMutation({
    mutationFn: async (data: SetupFormValues) => {
      const response = await fetch('/api/tda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create analysis');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setAnalysisId(data.analysis.id);
      setCurrentStep(1);
      setSaveSuccess(true);
      toast({
        title: "Analysis Created",
        description: "Your Top Down Analysis has been created. Let's start with the first timeframe.",
      });
      // Reset success message after 2 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Save answers mutation
  const saveAnswersMutation = useMutation({
    mutationFn: async ({ analysisId, answers }: { analysisId: string; answers: TDAAnswerInput[] }) => {
      const response = await fetch('/api/tda/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis_id: analysisId, answers })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save answers');
      }
      
      return response.json();
    }
  });

  // Complete analysis mutation (for non-AI analysis)
  const completeAnalysisMutation = useMutation({
    mutationFn: async (analysisId: string) => {
      if (!questions) {
        throw new Error('Questions not loaded');
      }

      // Collect answers for all timeframes using database questions
      const allAnswers: TDAAnswerInput[] = [];
      
      selectedTimeframes.forEach(timeframe => {
        const timeframeQuestions = questions.filter((q: any) => q.timeframe === timeframe);
        
        timeframeQuestions.forEach((question: any) => {
          const answer = questionAnswers[question.id];
          if (answer !== undefined && answer !== null && answer !== '') {
            allAnswers.push({
              analysis_id: analysisId,
              question_id: question.id,
              answer_text: answer.toString(),
              answer_value: answer
            });
          }
        });
      });

      // Save all answers
      if (allAnswers.length > 0) {
        const answersResponse = await fetch('/api/tda/answers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ analysis_id: analysisId, answers: allAnswers })
        });
        
        if (!answersResponse.ok) {
          const error = await answersResponse.json();
          throw new Error(error.error || 'Failed to save answers');
        }
      }

      // Save timeframe analyses with actual data
      const timeframeAnalyses = selectedTimeframes.map(tf => {
        const timeframeQuestions = questions.filter((q: any) => q.timeframe === tf);
        const timeframeAnswers: any[] = [];
        
        // Map answers for this timeframe
        timeframeQuestions.forEach((question: any) => {
          const answer = questionAnswers[question.id];
          if (answer !== undefined && answer !== null && answer !== '') {
            timeframeAnswers.push({
              question_id: question.id,
              answer_text: answer.toString(),
              answer_value: answer
            });
          }
        });

        return {
          analysis_id: analysisId,
          timeframe: tf,
          analysis_data: {
            questions: timeframeQuestions,
            answers: timeframeAnswers
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });

      // Save timeframe analyses
      const timeframeResponse = await fetch('/api/tda/timeframe-analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis_id: analysisId, timeframe_analyses: timeframeAnalyses })
      });

      if (!timeframeResponse.ok) {
        const error = await timeframeResponse.json();
        throw new Error(error.error || 'Failed to save timeframe analyses');
      }

      // Then complete the analysis
      const response = await fetch('/api/tda', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          analysis_id: analysisId, 
          updates: { 
            status: 'COMPLETED',
            completed_at: new Date().toISOString()
          } 
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to complete analysis');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setCurrentStep(4); // Show results
      setSaveSuccess(true);
      toast({
        title: "Analysis Complete",
        description: "Your Top Down Analysis has been completed successfully.",
      });
      // Reset success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete incomplete analysis mutation
  const deleteIncompleteMutation = useMutation({
    mutationFn: async (analysisId: string) => {
      const response = await fetch(`/api/tda?id=${analysisId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete incomplete analysis');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Analysis Cancelled",
        description: "Incomplete analysis has been removed.",
      });
    },
    onError: (error) => {
      console.error('Error deleting incomplete analysis:', error);
      toast({
        title: "Error",
        description: "Failed to cancel the analysis. Please try again.",
        variant: "destructive",
      });
    },
  });

  // AI Analysis mutation
  const aiAnalysisMutation = useMutation({
    mutationFn: async ({ analysisId, answers, timeframeAnalyses }: {
      analysisId: string;
      answers: TDAAnswerInput[];
      timeframeAnalyses: TDATimeframeAnalysis[];
    }) => {
      const response = await fetch('/api/tda/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis_id: analysisId, answers, timeframe_analyses: timeframeAnalyses })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate AI analysis');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setAnalysisResult(data.analysis);
      setCurrentStep(4); // Show results
      toast({
        title: "Analysis Complete",
        description: enableAIAnalysis 
          ? "Your Top Down Analysis has been completed with AI insights." 
          : "Your Top Down Analysis has been completed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle dialog close - delete incomplete analysis if user cancels
  const handleClose = () => {
    // If analysis is in progress (step 1-3) and not completed, delete it
    if (analysisId && currentStep >= 1 && currentStep <= 3) {
      deleteIncompleteMutation.mutate(analysisId);
    }
    
    // Reset state
    setCurrentStep(0);
    setAnalysisId(null);
    setCurrentTimeframe('DAILY');
    setQuestionAnswers({});
    setAnalysisResult(null);
    setEnableAIAnalysis(false);
    setSelectedTimeframes(['DAILY', 'H1', 'M15']);
    setScreenshots({ DAILY: [], H1: [], M15: [], M30: [], M10: [], H8: [], H4: [], H2: [], MN1: [], W1: [] });
    setUploadProgress(0);
    setUploadSuccess(false);
    setAnnouncements([]);
    setNewAnnouncement({ time: '', announcement_type: '', impact: 'MEDIUM' });
    setupForm.reset();
    
    // Call the original onClose
    onClose();
  };

  // Reset dialog state when opened
  useEffect(() => {
    if (isOpen) {
      setValidationState({ hasTriedNext: false, validationErrors: [] });
      setExpanded(false); // Always reset to normal mode
      setCurrentStep(0);
      setAnalysisId(null);
      setCurrentTimeframe('DAILY');
      setQuestionAnswers({});
      setAnalysisResult(null);
      setEnableAIAnalysis(false);
      setSelectedTimeframes(['DAILY', 'H1', 'M15']);
      setScreenshots({ DAILY: [], H1: [], M15: [], M30: [], M10: [], H8: [], H4: [], H2: [], MN1: [], W1: [] });
      setUploadProgress(0);
      setUploadSuccess(false);
      setAnnouncements([]);
      setNewAnnouncement({ time: '', announcement_type: '', impact: 'MEDIUM' });
      setupForm.reset();
    }
  }, [isOpen, setupForm]);

  const handleSetupSubmit = (data: SetupFormValues) => {
    // Sort timeframes by order (bigger timeframes first)
    const sortedTimeframes = data.selected_timeframes
      .map(tf => allTimeframes.find(ftf => ftf.value === tf))
      .filter(Boolean)
      .sort((a, b) => a!.order - b!.order)
      .map(tf => tf!.value);
    
    setSelectedTimeframes(sortedTimeframes);
    setCurrentTimeframe(sortedTimeframes[0]);
    
    // Include timestamp data in the analysis creation
    const analysisData = {
      ...data,
      analysis_date: analysisTimestamp?.date || new Date().toISOString().split('T')[0],
      analysis_time: analysisTimestamp?.time || new Date().toTimeString().slice(0, 5)
    };
    
    createAnalysisMutation.mutate(analysisData);
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setQuestionAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
    
    // Clear validation error for this question if it exists
    setValidationState(prev => ({ ...prev, validationErrors: prev.validationErrors.filter(error => error.question_id !== questionId) }));
  };

  // Real-time validation effect
  useEffect(() => {
    if (currentStep >= 1 && currentStep <= 3 && questions) {
      const errors = validateCurrentTimeframe();
      setValidationState(prev => ({ ...prev, validationErrors: errors }));
    }
  }, [questionAnswers, currentTimeframe, currentStep, questions]);

  const [, forceRerender] = useState(0);
  const handleTimeframeComplete = async () => {
    if (!analysisId || !questions) return;

    // Validate current timeframe
    const validationErrors = validateCurrentTimeframe();
    
    setValidationState({ hasTriedNext: true, validationErrors });
    if (validationErrors.length > 0) {
      setShowValidationDialog(true);
      return;
    }

    // Clear validation errors
    setValidationState({ hasTriedNext: false, validationErrors: [] });

    // Save answers for current timeframe
    const timeframeQuestions = questions.filter((q: any) => q.timeframe === currentTimeframe);
    const answers: TDAAnswerInput[] = timeframeQuestions.map((q: any) => ({
      analysis_id: analysisId,
      question_id: q.id,
      answer_text: questionAnswers[q.id]?.toString(),
      answer_value: questionAnswers[q.id]
    }));

    try {
      await saveAnswersMutation.mutateAsync({ analysisId, answers });
      
      // Move to next timeframe or complete
      const currentIndex = selectedTimeframes.findIndex(t => t === currentTimeframe);
      if (currentIndex < selectedTimeframes.length - 1) {
        setCurrentTimeframe(selectedTimeframes[currentIndex + 1]);
        setCurrentStep(1);
        const currentTimeframeData = allTimeframes.find(t => t.value === selectedTimeframes[currentIndex]);
        toast({
          title: "Timeframe Complete",
          description: `${currentTimeframeData?.label} completed successfully.`,
        });
      } else {
        // All timeframes completed, check if AI analysis is enabled
        if (enableAIAnalysis) {
          await generateAIAnalysis();
        } else {
          // Complete without AI analysis
          completeAnalysisMutation.mutate(analysisId);
        }
      }
    } catch (error) {
      console.error('Error saving answers:', error);
      toast({
        title: "Error",
        description: "Failed to save your answers. Please try again.",
        variant: "destructive",
      });
    }
  };

  const generateAIAnalysis = async () => {
    if (!analysisId || !questions) return;

    // Validate all timeframes before AI analysis
    const validationErrors = validateAllTimeframes();
    if (validationErrors.length > 0) {
      setValidationState(prev => ({ ...prev, validationErrors }));
      const errorCount = validationErrors.length;
      const errorText = errorCount === 1 ? 'field' : 'fields';
      toast({
        title: "Validation Error",
        description: `Please complete ${errorCount} required ${errorText} before generating AI analysis.`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare all answers
      const allAnswers: TDAAnswerInput[] = questions.map((q: any) => ({
        analysis_id: analysisId,
        question_id: q.id,
        answer_text: questionAnswers[q.id]?.toString(),
        answer_value: questionAnswers[q.id]
      }));

      // Prepare timeframe analyses (placeholder for now)
      const timeframeAnalyses: TDATimeframeAnalysis[] = selectedTimeframes.map(tf => ({
        id: `temp-${tf}`,
        analysis_id: analysisId,
        timeframe: tf,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        analysis_data: {}
      }));

      await aiAnalysisMutation.mutateAsync({
        analysisId,
        answers: allAnswers,
        timeframeAnalyses
      });
    } catch (error) {
      console.error('Error generating AI analysis:', error);
      toast({
        title: "AI Analysis Error",
        description: "Failed to generate AI analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };







  const getTraderContextMessage = (timeframe: TimeframeType) => {
    switch (timeframe) {
      case 'MN1':
        return "🎯 **Position Traders / Long-Term Investors**: Position traders and long-term investors are all about the big picture. Their analysis focuses on fundamental strength, macro trends, and significant technical levels that hold over weeks, months, or even years.";
      case 'W1':
        return "📈 **Position Traders / Long-Term Investors**: Position traders and long-term investors are all about the big picture. Their analysis focuses on fundamental strength, macro trends, and significant technical levels that hold over weeks, months, or even years.";
      case 'DAILY':
        return "📊 **Position Traders / Long-Term Investors**: Position traders and long-term investors are all about the big picture. Their analysis focuses on fundamental strength, macro trends, and significant technical levels that hold over weeks, months, or even years.";
      case 'H8':
        return "🌍 **Swing Traders / Day Traders**: Swing traders and day traders using multiple timeframes look for trends and opportunities that unfold over a few days to a few weeks, often using daily, 4-hour, and 1-hour charts.";
      case 'H4':
        return "📊 **Swing Traders / Day Traders**: Swing traders and day traders using multiple timeframes look for trends and opportunities that unfold over a few days to a few weeks, often using daily, 4-hour, and 1-hour charts.";
      case 'H2':
        return "🎯 **Swing Traders / Day Traders**: Swing traders and day traders using multiple timeframes look for trends and opportunities that unfold over a few days to a few weeks, often using daily, 4-hour, and 1-hour charts.";
      case 'H1':
        return "⚡ **Swing Traders / Day Traders**: Swing traders and day traders using multiple timeframes look for trends and opportunities that unfold over a few days to a few weeks, often using daily, 4-hour, and 1-hour charts.";
      case 'M30':
        return "⚡ **Intraday Traders / Scalpers**: These traders thrive on rapid, short-term price movements, often holding trades for minutes or even seconds. Their focus is on extreme precision and capitalizing on micro-trends and volatility within a single trading day.";
      case 'M15':
        return "🔍 **Intraday Traders / Scalpers**: These traders thrive on rapid, short-term price movements, often holding trades for minutes or even seconds. Their focus is on extreme precision and capitalizing on micro-trends and volatility within a single trading day.";
      case 'M10':
        return "🎯 **Intraday Traders / Scalpers**: These traders thrive on rapid, short-term price movements, often holding trades for minutes or even seconds. Their focus is on extreme precision and capitalizing on micro-trends and volatility within a single trading day.";
      default:
        return "";
    }
  };

  const getGenericTimeframeQuestions = (timeframe: TimeframeType) => {
    // This function is not used
    return [];
  };

  const getCurrentTimeframeQuestions = () => {
    if (!questions) return [];
    return questions.filter((q: any) => q.timeframe === currentTimeframe)
      .sort((a: any, b: any) => a.order_index - b.order_index);
  };

  // Organize questions into rows for better layout
  const getOrganizedQuestions = () => {
    const currentQuestions = getCurrentTimeframeQuestions();
    
    if (currentTimeframe === 'DAILY') {
      // DAILY layout: exact grouping as specified
      const announcements = currentQuestions.filter((q: any) => q.question_text === 'Announcements');
      const analysis = currentQuestions.filter((q: any) => q.question_text === 'Analysis');
      
      // Row 1: Announcements
      const row1 = announcements;
      
      // Row 2: Current Daily Trend, Today's Key Support / Resistance Levels, Cycle Pressure, Notes
      const row2 = currentQuestions.filter((q: any) => 
        q.question_text === 'Current Daily Trend' ||
        q.question_text === "Today's Key Support / Resistance Levels" ||
        q.question_text === 'Cycle Pressure' ||
        (q.question_text === 'Notes' && q.order_index === 5)
      );
      
      // Row 3: Previous Candle, Pivot Range, Notes
      const row3 = currentQuestions.filter((q: any) => 
        q.question_text === 'Previous Candle' ||
        q.question_text === 'Pivot Range' ||
        (q.question_text === 'Notes' && q.order_index === 8)
      );
      
      // Row 4: Candle / Chart Patterns, Fibonacci: Swing Low, Fibonacci: Swing High
      const row4 = currentQuestions.filter((q: any) => 
        q.question_text === 'Candle / Chart Patterns' ||
        q.question_text === 'Fibonacci: Swing Low' ||
        q.question_text === 'Fibonacci: Swing High'
      );
      
      // Row 5: Macd Lines: Position, Macd Lines: Blue vs Red, Macd Lines: Movement, Macd Lines: Sentiment, Notes
      const row5 = currentQuestions.filter((q: any) => 
        q.question_text.includes('MACD Lines') ||
        (q.question_text === 'Notes' && q.order_index === 16)
      );
      
      // Row 6: Macd Histogram: Position, Macd Histogram: Movement, Macd Histogram: Sentiment, Notes
      const row6 = currentQuestions.filter((q: any) => 
        q.question_text.includes('MACD Histogram') ||
        (q.question_text === 'Notes' && q.order_index === 20)
      );
      
      // Row 7: Rsi: Condition, Rsi: Direction, Rsi: Black vs Yellow, Rsi: Sentiment, Notes
      const row7 = currentQuestions.filter((q: any) => 
        q.question_text.includes('RSI') ||
        (q.question_text === 'Notes' && q.order_index === 25)
      );
      
      // Row 8: Rei: Condition, Rei:Direction, Rei: Sentiment, Notes
      const row8 = currentQuestions.filter((q: any) => 
        q.question_text.includes('REI') ||
        (q.question_text === 'Notes' && q.order_index === 29)
      );
      
      // Row 9: Analysis
      const row9 = analysis;
      
      return [row1, row2, row3, row4, row5, row6, row7, row8, row9].filter((row: any) => row.length > 0);
      
    } else if (currentTimeframe === 'H1') {
      // H1 layout: exact grouping as specified
      const analysis = currentQuestions.filter((q: any) => q.question_text === 'Analysis');
      
      // Row 1: Current 1 hour Trend, Session's Key Support / Resistance Levels, Cycle Pressure, Notes
      const row1 = currentQuestions.filter((q: any) => 
        q.question_text === 'Current 1 Hour Trend' ||
        q.question_text === "Session's Key Support / Resistance Levels" ||
        q.question_text === 'Cycle Pressure' ||
        (q.question_text === 'Notes' && q.order_index === 4)
      );
      
      // Row 2: Macd Lines: Position, Macd Lines: Blue vs Red, Macd Lines: Movement, Macd Lines: Sentiment, Notes
      const row2 = currentQuestions.filter((q: any) => 
        q.question_text.includes('MACD Lines') ||
        (q.question_text === 'Notes' && q.order_index === 9)
      );
      
      // Row 3: Macd Histogram: Position, Macd Histogram: Movement, Macd Histogram: Sentiment, Notes
      const row3 = currentQuestions.filter((q: any) => 
        q.question_text.includes('MACD Histogram') ||
        (q.question_text === 'Notes' && q.order_index === 13)
      );
      
      // Row 4: Rsi: Condition, Rsi: Direction, Rsi: Black vs Yellow, Rsi: Sentiment, Notes
      const row4 = currentQuestions.filter((q: any) => 
        q.question_text.includes('RSI') ||
        (q.question_text === 'Notes' && q.order_index === 18)
      );
      
      // Row 5: Rei: Condition, Rei:Direction, Rei: Sentiment, Notes
      const row5 = currentQuestions.filter((q: any) => 
        q.question_text.includes('REI') ||
        (q.question_text === 'Notes' && q.order_index === 22)
      );
      
      // Row 6: Analysis
      const row6 = analysis;
      
      return [row1, row2, row3, row4, row5, row6].filter((row: any) => row.length > 0);
      
    } else if (currentTimeframe === 'M15') {
      // M15 layout: exact grouping as specified
      const analysis = currentQuestions.filter((q: any) => q.question_text === 'Analysis');
      
      // Row 1: Current 15 Minutes Trend, Today's Key Support / Resistance Levels, Cycle Pressure, Notes
      const row1 = currentQuestions.filter((q: any) => 
        q.question_text === 'Current 15 Minutes Trend' ||
        q.question_text === "Today's Key Support / Resistance Levels" ||
        q.question_text === 'Cycle Pressure' ||
        (q.question_text === 'Notes' && q.order_index === 4)
      );
      
      // Row 2: Most Relevant Trend Line, Price Location in Pivot Range, Drive or Exhaustion
      const row2 = currentQuestions.filter((q: any) => 
        q.question_text === 'Most Relevant Trend Line' ||
        q.question_text === 'Price Location in Pivot Range' ||
        q.question_text === 'Drive or Exhaustion'
      );
      
      // Row 3: Candle / Chart Patterns, Fibonacci: Swing Low, Fibonacci: Swing High
      const row3 = currentQuestions.filter((q: any) => 
        q.question_text === 'Candle / Chart Patterns' ||
        q.question_text === 'Fibonacci: Swing Low' ||
        q.question_text === 'Fibonacci: Swing High'
      );
      
      // Row 4: Macd Lines: Position, Macd Lines: Blue vs Red, Macd Lines: Movement, Macd Lines: Sentiment, Notes
      const row4 = currentQuestions.filter((q: any) => 
        q.question_text.includes('MACD Lines') ||
        (q.question_text === 'Notes' && q.order_index === 15)
      );
      
      // Row 5: Macd Histogram: Position, Macd Histogram: Movement, Macd Histogram: Sentiment, Notes
      const row5 = currentQuestions.filter((q: any) => 
        q.question_text.includes('MACD Histogram') ||
        (q.question_text === 'Notes' && q.order_index === 19)
      );
      
      // Row 6: Rsi: Condition, Rsi: Direction, Rsi: Black vs Yellow, Rsi: Sentiment, Notes
      const row6 = currentQuestions.filter((q: any) => 
        q.question_text.includes('RSI') ||
        (q.question_text === 'Notes' && q.order_index === 24)
      );
      
      // Row 7: Rei: Condition, Rei:Direction, Rei: Sentiment, Notes
      const row7 = currentQuestions.filter((q: any) => 
        q.question_text.includes('REI') ||
        (q.question_text === 'Notes' && q.order_index === 28)
      );
      
      // Row 8: Analysis
      const row8 = analysis;
      
      return [row1, row2, row3, row4, row5, row6, row7, row8].filter((row: any) => row.length > 0);
      
    } else {
      // For other timeframes, simple 3 questions per row with analysis at the end
      const analysisQuestion = currentQuestions.find((q: any) => q.question_text === 'Analysis');
      const otherQuestions = currentQuestions.filter((q: any) => q.question_text !== 'Analysis');
      
      const rows = [];
      const questionsPerRow = 3;
      
      for (let i = 0; i < otherQuestions.length; i += questionsPerRow) {
        const row = otherQuestions.slice(i, i + questionsPerRow);
        if (row.length > 0) {
          rows.push(row);
        }
      }
      
      // Add analysis at the very end on its own row
      if (analysisQuestion) {
        rows.push([analysisQuestion]);
      }
      
      return rows;
    }
  };

  const getProgress = (): TDAProgress => {
    const completedTimeframes: TimeframeType[] = [];
    const currentIndex = selectedTimeframes.findIndex(t => t === currentTimeframe);
    
    for (let i = 0; i < currentIndex; i++) {
      completedTimeframes.push(selectedTimeframes[i]);
    }

    return {
      currentStep: currentIndex + 1,
      totalSteps: selectedTimeframes.length,
      completedTimeframes,
      currentTimeframe
    };
  };

  const progress = getProgress();

  // Validation functions
  const validateCurrentTimeframe = (): TDAValidationError[] => {
    const errors: TDAValidationError[] = [];
    const timeframeQuestions = getCurrentTimeframeQuestions();
    

    
    timeframeQuestions.forEach((question: any) => {
      const answer = questionAnswers[question.id];
      

      
      // Only validate essential fields - make notes and some technical fields optional
      let isEssentialField = false;
      
      if (question.required) {
        // Make these fields optional
        if (question.question_text.includes('Notes') ||
            question.question_text.includes('Patterns') ||
            question.question_text.includes('Announcements') ||
            question.question_text.includes('Screenshot')) {
          isEssentialField = false;
        }
        // All other fields are mandatory
        else {
          isEssentialField = true;
        }
      }
      
      if (isEssentialField) {
        let isEmpty = false;
        
        if (answer === undefined || answer === null) {
          isEmpty = true;
        } else if (typeof answer === 'string') {
          isEmpty = answer.trim() === '';
        } else if (typeof answer === 'boolean') {
          // Boolean fields are always valid if they have a value
          isEmpty = false;
        } else if (typeof answer === 'number') {
          // Number fields are valid if they have a value
          isEmpty = false;
        } else if (Array.isArray(answer)) {
          isEmpty = answer.length === 0;
        } else {
          isEmpty = !answer;
        }
        

        
        if (isEmpty) {
          errors.push({
            timeframe: currentTimeframe,
            question_id: question.id,
            message: ``
          });
        }
      }
    });
    
    
    return errors;
  };

  const validateAllTimeframes = (): TDAValidationError[] => {
    if (!questions) return [];
    
    const errors: TDAValidationError[] = [];
    
    selectedTimeframes.forEach(timeframe => {
      const timeframeQuestions = questions.filter((q: any) => q.timeframe === timeframe);
      
      timeframeQuestions.forEach((question: any) => {
        const answer = questionAnswers[question.id];
        
        // Only validate essential fields - make notes and some technical fields optional
        let isEssentialField = false;
        
        if (question.required) {
          // Make these fields optional
          if (question.question_text.includes('Notes') ||
              question.question_text.includes('Patterns') ||
              question.question_text.includes('Announcements') ||
              question.question_text.includes('Screenshot')) {
            isEssentialField = false;
          }
          // All other fields are mandatory
          else {
            isEssentialField = true;
          }
        }
        
        if (isEssentialField) {
          let isEmpty = false;
          
          if (answer === undefined || answer === null) {
            isEmpty = true;
          } else if (typeof answer === 'string') {
            isEmpty = answer.trim() === '';
          } else if (typeof answer === 'boolean') {
            // Boolean fields are always valid if they have a value
            isEmpty = false;
          } else if (typeof answer === 'number') {
            // Number fields are valid if they have a value
            isEmpty = false;
          } else if (Array.isArray(answer)) {
            isEmpty = answer.length === 0;
          } else {
            isEmpty = !answer;
          }
          
          if (isEmpty) {
            errors.push({
              timeframe: timeframe,
              question_id: question.id,
              message: ``
            });
          }
        }
      });
    });
    
    return errors;
  };

  const renderQuestion = (question: TDAQuestion) => {
    const value = questionAnswers[question.id];
    const hasError = validationState.validationErrors.some(error => error.question_id === question.id);

    switch (question.question_type) {
      case 'ANNOUNCEMENTS':
        return (
          <div className="space-y-4">
            <div className="text-sm text-slate-600">
              Add medium and high impact announcements for today.
            </div>
            
            {/* Add new announcement form */}
            <div className="grid grid-cols-12 gap-2 p-4 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
              <div className="col-span-2">
                <Input
                  type="text"
                  value={newAnnouncement.time}
                  onChange={e => {
                    const value = e.target.value;
                    // Only allow numbers and colon, max 5 characters
                    const filteredValue = value.replace(/[^0-9:]/g, '').slice(0, 5);
                    setNewAnnouncement(prev => ({ ...prev, time: filteredValue }));
                  }}
                  placeholder="HH:MM"
                  maxLength={5}
                  className="w-full bg-white/80 backdrop-blur-sm text-slate-700 border-slate-200 hover:border-slate-300 focus:border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.05)] rounded-lg px-2 py-1"
                />
              </div>
              <div className="col-span-4">
                <Input
                  value={newAnnouncement.announcement_type}
                  onChange={(e) => setNewAnnouncement(prev => ({ ...prev, announcement_type: e.target.value.slice(0, 20) }))}
                  placeholder="Announcement type"
                  maxLength={20}
                  className="w-full bg-white/80 backdrop-blur-sm text-slate-700 border-slate-200 hover:border-slate-300 focus:border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
                />
              </div>
              <div className="col-span-4">
                <Select
                  value={newAnnouncement.impact}
                  onValueChange={(value: 'MEDIUM' | 'HIGH') => setNewAnnouncement(prev => ({ ...prev, impact: value }))}
                >
                  <SelectTrigger className="w-full bg-white/80 backdrop-blur-sm border-slate-200 hover:border-slate-300 focus:border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.05)] text-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-[0_8px_24px_rgba(0,0,0,0.1)]">
                    <SelectItem value="MEDIUM" className="text-orange-600 hover:bg-orange-50">Medium Impact</SelectItem>
                    <SelectItem value="HIGH" className="text-red-600 hover:bg-red-50">High Impact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex items-center justify-center">
                <Button
                  onClick={() => {
                    if (newAnnouncement.time && newAnnouncement.announcement_type && announcements.length < 15) {
                      const newAnn: TDAAnnouncement = {
                        id: `temp-${Date.now()}`,
                        analysis_id: analysisId || '',
                        timeframe: currentTimeframe,
                        time: newAnnouncement.time,
                        announcement_type: newAnnouncement.announcement_type,
                        impact: newAnnouncement.impact,
                        created_at: new Date().toISOString()
                      };
                      setAnnouncements(prev => [...prev, newAnn]);
                      setNewAnnouncement({ time: '', announcement_type: '', impact: 'MEDIUM' });
                    }
                  }}
                  disabled={!newAnnouncement.time || !newAnnouncement.announcement_type || announcements.length >= 15}
                  size="sm"
                  className="w-8 h-8 p-0 flex items-center justify-center bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-[0_2px_8px_rgba(59,130,246,0.3)]"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* List of announcements */}
            {announcements.length > 0 && (
              <div className="space-y-2">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="flex items-center justify-between p-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-sm text-slate-700">{announcement.time}</span>
                      <span className="text-sm text-slate-700">{announcement.announcement_type}</span>
                      <Badge 
                        variant="outline" 
                        className={`${announcement.impact === 'MEDIUM' ? 'text-orange-600 border-orange-600 bg-orange-50/50' : 'text-red-600 border-red-600 bg-red-50/50'} backdrop-blur-sm`}
                      >
                        {announcement.impact}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAnnouncements(prev => prev.filter(a => a.id !== announcement.id))}
                      className="text-slate-600 hover:text-red-500 hover:bg-red-50/50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'MULTIPLE_CHOICE':
        return (
          <RadioGroup
            value={value}
            onValueChange={(val) => handleAnswerChange(question.id, val)}
            className="space-y-0"
          >
            {question.options?.map((option) => {
              // Fix white text issue - ensure all text is readable
              let colorClass = 'text-slate-800'; // Default dark color for readability
              
              // Special handling for MACD Lines options - keep them black
              if (option.includes('Blue Below Red') || option.includes('Blue Above Red')) {
                colorClass = 'text-slate-800 font-medium';
              } else if (option.includes('Long') || option.includes('Bullish') || option.includes('Green') || 
                  option.includes('Support') || option.includes('Oversold') || option.includes('NZ From Oversold') ||
                  option.includes('Moving Up') || option.includes('Heading Up') || 
                  option.includes('From Low Moving Up') || option.includes('Nearing Top') || 
                  option.includes('Accelerating') || option.includes('Strong') || option.includes('High') ||
                  option.includes('Buying') || option.includes('Positive') || option.includes('Above') ||
                  option.includes('Higher') || option.includes('Increasing') || option.includes('Expanding') ||
                  option.includes('MidS1 to MidR2')) {
                colorClass = 'text-green-600 font-medium';
              } else if (option.includes('Short') || option.includes('Bearish') || option.includes('Red') ||
                  option.includes('Resistance') || option.includes('Overbought') || option.includes('NZ From Overbought') ||
                  option.includes('Moving Down') || option.includes('Heading Down') || 
                  option.includes('From High Moving Down') || option.includes('Nearing Bottom') || 
                  option.includes('Decelerating') || option.includes('Weak') || option.includes('Low') ||
                  option.includes('Selling') || option.includes('Negative') || option.includes('Below') ||
                  option.includes('Lower') || option.includes('Decreasing') || option.includes('Contracting') ||
                  option.includes('MidS2 to MidR1')) {
                colorClass = 'text-red-600 font-medium';
              } else if (option.includes('RED') || option.includes('Red')) {
                colorClass = 'text-red-600 font-medium';
              } else if (option.includes('GREEN') || option.includes('Green')) {
                colorClass = 'text-green-600 font-medium';
              } else if (option.includes('Sideways') || option.includes('Neutral') || option.includes('Balanced') ||
                  option.includes('Stable') || option.includes('Normal') || option.includes('Mixed') ||
                  option.includes('Consolidation') || option.includes('No Clear') || option.includes('No Divergence')) {
                colorClass = 'text-slate-600 font-medium';
              } else {
                colorClass = 'text-slate-800';
              }

              return (
                <div key={option} className="flex items-center space-x-2 py-0.5 px-1 rounded-sm hover:bg-white/50 transition-colors">
                  <RadioGroupItem value={option} id={`${question.id}-${option}`} className="text-blue-600 border-slate-300" />
                  <Label htmlFor={`${question.id}-${option}`} className={`${colorClass} cursor-pointer text-sm`}>{option}</Label>
                </div>
              );
            })}
          </RadioGroup>
        );

      case 'RATING':
        return (
          <RadioGroup
            value={value?.toString()}
            onValueChange={(val) => handleAnswerChange(question.id, parseInt(val))}
          >
            {[1, 2, 3, 4, 5].map((rating) => (
              <div key={rating} className="flex items-center space-x-2">
                <RadioGroupItem value={rating.toString()} id={`${question.id}-${rating}`} />
                <Label htmlFor={`${question.id}-${rating}`} className="text-slate-800 cursor-pointer text-sm">
                  {rating} {rating === 1 ? 'star' : 'stars'}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'BOOLEAN':
        return (
          <RadioGroup
            value={value?.toString()}
            onValueChange={(val) => handleAnswerChange(question.id, val === 'true')}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="true" id={`${question.id}-true`} />
              <Label htmlFor={`${question.id}-true`}>Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="false" id={`${question.id}-false`} />
              <Label htmlFor={`${question.id}-false`}>No</Label>
            </div>
          </RadioGroup>
        );

      case 'TEXT':
        // Determine max length and input type based on question
        let maxLength = 200; // default for new questions
        let useInput = false;
        let useTextarea = false;
        
        if (question.question_text.includes('Support / Resistance')) {
          maxLength = 200;
          useTextarea = true; // Use 2-row textarea for Support/Resistance
        } else if (question.question_text.includes('Fibonacci')) {
          maxLength = 200;
          useInput = true;
        } else if (question.question_text.includes('Patterns')) {
          maxLength = 200;
          useInput = true;
        } else if (question.question_text.includes('Notes')) {
          maxLength = 200;
          useInput = true;
        } else if (question.question_text.includes('Analysis')) {
          maxLength = 500; // 500 character limit for analysis fields
          useTextarea = true;
        } else {
          // For all other questions, use 200 character limit
          maxLength = 200;
          useTextarea = true;
        }

        if (useInput) {
          return (
            <Input
              value={value || ''}
              onChange={(e) => {
                const newValue = e.target.value.slice(0, maxLength);
                handleAnswerChange(question.id, newValue);
              }}
              placeholder=""
              maxLength={maxLength}
              className="bg-white/95 backdrop-blur-sm text-slate-900 border-slate-200 hover:border-slate-300 focus:border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.05)] placeholder:text-slate-500 font-medium"
            />
          );
        } else if (useTextarea) {
          return (
            <div className="space-y-1">
              <Textarea
                value={value || ''}
                onChange={(e) => {
                  const newValue = e.target.value.slice(0, maxLength);
                  handleAnswerChange(question.id, newValue);
                }}
                placeholder=""
                className={`bg-white/95 backdrop-blur-sm text-slate-900 border-slate-200 hover:border-slate-300 focus:border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.05)] placeholder:text-slate-500 font-medium ${
                  question.question_text.includes('Support / Resistance') ? "min-h-[60px]" : "min-h-[100px]"
                }`}
                maxLength={maxLength}
              />
            </div>
          );
        } else {
          return (
            <div className="space-y-1">
              <Textarea
                value={value || ''}
                onChange={(e) => {
                  const newValue = e.target.value.slice(0, maxLength);
                  handleAnswerChange(question.id, newValue);
                }}
                placeholder=""
                className="min-h-[100px] bg-white/95 backdrop-blur-sm text-slate-900 border-slate-200 hover:border-slate-300 focus:border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.05)] placeholder:text-slate-500 font-medium"
                maxLength={maxLength}
              />
            </div>
          );
        }

      default:
        return null;
    }
  };

  const renderAnalysisResults = () => {
    if (!analysisResult && enableAIAnalysis) return null;
    
    // Always show user's analysis summary first
    const renderUserAnalysisSummary = () => {
      if (!questions) return null;
      
      return (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-2 text-slate-800">Your Analysis Summary</h3>
            <p className="text-slate-600">Review your complete Top Down Analysis</p>
          </div>

          {/* Setup Information - Distinctive Header */}
          <Card className="bg-gradient-to-r from-orange-50/80 to-amber-50/80 backdrop-blur-md border border-orange-200/50 shadow-[0_8px_24px_rgba(251,146,60,0.15)]">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg flex items-center justify-center shadow-[0_4px_12px_rgba(251,146,60,0.3)]">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-slate-800">Analysis Setup</CardTitle>
                  <CardDescription className="text-slate-600 font-medium">
                    Configuration and analyst information
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Currency Pair</Label>
                  <div className="p-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                    <p className="text-sm font-medium text-slate-800">{setupForm.getValues('currency_pair')}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Analyst</Label>
                  <div className="p-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                    <p className="text-sm font-medium text-slate-800">
                    {profile?.first_name && profile?.last_name ? (
                      `${profile.first_name} ${profile.last_name}`
                    ) : profile?.username ? (
                      profile.username
                    ) : (
                      'User'
                    )}
                  </p>
                </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Analysis Date</Label>
                  <div className="p-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                    <p className="text-sm font-medium text-slate-800">
                    {analysisTimestamp ? (
                      new Date(analysisTimestamp.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })
                    ) : (
                      new Date().toLocaleDateString()
                    )}
                  </p>
                </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Analysis Time</Label>
                  <div className="p-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                    <p className="text-sm font-medium text-slate-800">
                    {analysisTimestamp?.time || new Date().toTimeString().slice(0, 5)}
                  </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeframe Analysis Summary */}
          {selectedTimeframes.map((timeframe) => {
            const timeframeQuestions = questions.filter((q: any) => q.timeframe === timeframe);
            const hasAnswers = timeframeQuestions.some((q: any) => questionAnswers[q.id]);
            const hasScreenshots = screenshots[timeframe] && screenshots[timeframe].length > 0;
            
            if (!hasAnswers && !hasScreenshots) return null;
            
            const timeframeData = allTimeframes.find(t => t.value === timeframe);
            
            return (
              <Card key={timeframe} className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-md border border-blue-200/50 shadow-[0_8px_24px_rgba(59,130,246,0.15)]">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-[0_4px_12px_rgba(59,130,246,0.3)]">
                    {timeframeData?.icon}
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-slate-800">{timeframeData?.label}</CardTitle>
                      <CardDescription className="text-slate-600 font-medium">{timeframeData?.value} Analysis</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Questions and Answers */}
                  {hasAnswers && (
                  <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-slate-800 border-b border-blue-200 pb-2">Analysis Questions & Answers</h4>
                    {timeframeQuestions.map((question: any) => {
                      const answer = questionAnswers[question.id];
                      if (!answer) return null;
                      
                      return (
                          <div key={question.id} className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-lg p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                            <Label className="text-sm font-semibold text-blue-800 mb-2 block">
                            {question.question_text}
                          </Label>
                            <div className="mt-2">
                            {question.question_type === 'TEXT' ? (
                                <p className="text-sm text-slate-700 whitespace-pre-wrap bg-white/40 backdrop-blur-sm border border-white/20 rounded p-3">{answer}</p>
                            ) : (
                                <Badge variant="outline" className="text-sm bg-white/80 backdrop-blur-sm border border-white/30 text-slate-700 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                                {answer.toString()}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  )}

                  {/* Screenshots */}
                  {hasScreenshots && (
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-slate-800 border-b border-blue-200 pb-2">Chart Screenshots</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {screenshots[timeframe].map((screenshot) => (
                          <div key={screenshot.id} className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-lg p-3 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-sm font-medium text-slate-700">{screenshot.file_name}</span>
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                Uploaded
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500">
                              {new Date(screenshot.created_at).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      );
    };

    // If AI analysis is not enabled, show only user analysis
    if (!enableAIAnalysis) {
      return (
        <div className="space-y-6">
          {renderUserAnalysisSummary()}
          
          <Card className="bg-white/60 backdrop-blur-sm border border-white/30 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <Check className="h-5 w-5 text-green-600" />
                Analysis Complete
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Your analysis has been completed and saved to your trading journal. 
                You can review it anytime from your analysis history.
              </p>
            </CardContent>
          </Card>

          <Alert className="bg-blue-50/80 backdrop-blur-sm border-blue-200/50 text-blue-800">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              Remember to always rely on your own analysis and risk management. 
              This tool is designed to help you structure your thinking, not to provide trading advice.
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    if (!analysisResult) return null;

    const getRecommendationColor = (recommendation: string) => {
      switch (recommendation) {
        case 'LONG': return 'text-green-600 bg-green-100';
        case 'SHORT': return 'text-red-600 bg-red-100';
        case 'NEUTRAL': return 'text-yellow-600 bg-yellow-100';
        case 'AVOID': return 'text-gray-600 bg-gray-100';
        default: return 'text-gray-600 bg-gray-100';
      }
    };

    const getRiskColor = (risk: string) => {
      switch (risk) {
        case 'LOW': return 'text-green-600 bg-green-100';
        case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
        case 'HIGH': return 'text-red-600 bg-red-100';
        default: return 'text-gray-600 bg-gray-100';
      }
    };

    return (
      <div className="space-y-6">
        {/* User Analysis Summary - Always shown first */}
        {renderUserAnalysisSummary()}
        
        <Separator className="bg-slate-200" />
        
        {/* AI Analysis Section */}
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-2 text-slate-800">AI Analysis & Recommendations</h3>
            <p className="text-slate-600">AI insights based on your analysis (for informational purposes only)</p>
          </div>

          <Alert className="bg-amber-50/80 backdrop-blur-sm border-amber-200/50 text-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription>
              <strong>Disclaimer:</strong> The following AI analysis is for informational purposes only and should not be used as trading advice. 
              Always rely on your own analysis and risk management. The AI does not guarantee profits or predict market movements.
            </AlertDescription>
          </Alert>

          {/* Overall Results */}
          <Card className="bg-white/60 backdrop-blur-sm border border-white/30 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-slate-800">
                AI Overall Assessment
                <Badge className={`${getRecommendationColor(analysisResult.trade_recommendation)} backdrop-blur-sm`}>
                  {analysisResult.trade_recommendation}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-slate-700">AI Probability</Label>
                  <p className="text-2xl font-bold text-slate-800">{analysisResult.overall_probability}%</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700">AI Confidence</Label>
                  <p className="text-2xl font-bold text-slate-800">{analysisResult.confidence_level}%</p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">AI Risk Assessment</Label>
                <Badge className={`${getRiskColor(analysisResult.risk_level)} backdrop-blur-sm`}>
                  {analysisResult.risk_level}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">AI Summary</Label>
                <p className="text-sm text-slate-600">{analysisResult.ai_summary}</p>
              </div>
            </CardContent>
          </Card>

          {/* Timeframe Breakdown */}
          <Card className="bg-white/60 backdrop-blur-sm border border-white/30 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
            <CardHeader>
              <CardTitle className="text-slate-800">AI Timeframe Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(analysisResult.timeframe_breakdown).map(([timeframe, data]) => {
                  const timeframeData = allTimeframes.find(t => t.value === timeframe);
                  return (
                    <div key={timeframe} className="bg-white/40 backdrop-blur-sm border border-white/30 rounded-lg p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-slate-800">{timeframeData?.label}</h4>
                        <Badge variant="outline" className="bg-white/80 backdrop-blur-sm border border-white/30 text-slate-700 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">{(data as any).sentiment}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-2">
                        <div>
                          <Label className="text-xs text-slate-700">AI Probability</Label>
                          <p className="font-medium text-slate-800">{(data as any).probability}%</p>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-700">AI Strength</Label>
                          <p className="font-medium text-slate-800">{(data as any).strength}%</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600">{(data as any).reasoning}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Reasoning */}
          <Card>
            <CardHeader>
              <CardTitle>AI Detailed Reasoning</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {analysisResult.ai_reasoning}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };



  const renderContent = (isFullscreen = false, hasTriedNext = false) => {
    switch (currentStep) {
      case 0:
        return (
          <Form {...setupForm}>
            <form onSubmit={setupForm.handleSubmit(handleSetupSubmit)} className="space-y-4 sm:space-y-6">
              {/* Analysis Info Header */}
              <div className="bg-gradient-to-r from-orange-50/80 to-amber-50/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-orange-200/30">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-orange-100 rounded-lg">
                      <User className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                  </div>
                    <div>
                      <span className="text-xs sm:text-sm font-semibold text-orange-800 uppercase tracking-wide">Analyst</span>
                      <div className="text-base sm:text-lg font-bold text-slate-800">
                    {profile?.first_name && profile?.last_name ? (
                      `${profile.first_name} ${profile.last_name}`
                    ) : profile?.username ? (
                      profile.username
                    ) : (
                      'User'
                    )}
                  </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-orange-100 rounded-lg">
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-semibold text-orange-800 uppercase tracking-wide">Analysis Date & Time</span>
                      <div className="text-base sm:text-lg font-bold text-slate-800">
                    {analysisTimestamp ? (
                      <>
                        {new Date(analysisTimestamp.date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })} at {analysisTimestamp.time}
                      </>
                    ) : (
                      'Loading...'
                    )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <FormField
                control={setupForm.control}
                name="currency_pair"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-medium">Currency Pair</FormLabel>
                    <div>
                      <Select 
                        onValueChange={(value) => {
                          if (value === 'Other') {
                            field.onChange('');
                          } else {
                            field.onChange(value);
                          }
                        }} 
                        value={currencyPairs.includes(field.value) ? field.value : 'Other'}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-white/90 backdrop-blur-sm border-slate-200 hover:border-slate-300 focus:border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.05)] text-slate-800">
                            <SelectValue placeholder="Select currency pair" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className={`${isFullscreen ? 'z-[10000]' : ''} bg-white/95 backdrop-blur-sm border border-slate-200 shadow-[0_8px_24px_rgba(0,0,0,0.1)]`}>
                          {currencyPairs.map((pair) => (
                            <SelectItem key={pair} value={pair} className="text-slate-800 hover:bg-slate-50">
                              {pair}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {(!currencyPairs.includes(field.value)) && (
                        <Input 
                          placeholder="Enter custom currency pair" 
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase().slice(0, 6))}
                          className="mt-2 w-full bg-white/90 backdrop-blur-sm border-slate-200 hover:border-slate-300 focus:border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.05)] text-slate-800"
                        />
                      )}
                    </div>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />

              {/* Timeframe Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-slate-700 font-medium">Select Timeframes (Max 10)</FormLabel>
                  <span className="text-sm text-slate-600">
                    {selectedTimeframes.length}/10
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1 max-h-60 overflow-y-auto bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                  {allTimeframes.map((timeframe) => (
                    <div key={timeframe.value} className="flex items-center space-x-2 p-1 rounded-lg hover:bg-white/40 transition-colors">
                      <Checkbox
                        id={timeframe.value}
                        checked={selectedTimeframes.includes(timeframe.value)}
                        onCheckedChange={(checked) => {
                          if (checked && selectedTimeframes.length < 10) {
                            setSelectedTimeframes(prev => [...prev, timeframe.value]);
                            setupForm.setValue('selected_timeframes', [...selectedTimeframes, timeframe.value]);
                          } else if (!checked) {
                            setSelectedTimeframes(prev => prev.filter(t => t !== timeframe.value));
                            setupForm.setValue('selected_timeframes', selectedTimeframes.filter(t => t !== timeframe.value));
                          }
                        }}
                        disabled={!selectedTimeframes.includes(timeframe.value) && selectedTimeframes.length >= 10}
                        className="text-blue-600 border-slate-300"
                      />
                      <Label htmlFor={timeframe.value} className="flex items-center gap-2 text-sm cursor-pointer text-slate-700">
                        {timeframe.icon}
                        <span className="font-medium">{timeframe.label}</span>
                      </Label>
                    </div>
                  ))}
                </div>
                
                {selectedTimeframes.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Selected Timeframes (in analysis order):</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedTimeframes
                        .map(tf => allTimeframes.find(ftf => ftf.value === tf))
                        .filter(Boolean)
                        .sort((a, b) => a!.order - b!.order)
                        .map((timeframe) => (
                          <Badge key={timeframe!.value} variant="secondary" className="flex items-center gap-1 bg-white/80 backdrop-blur-sm border border-white/30 text-slate-700 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                            {timeframe!.icon}
                            {timeframe!.label}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTimeframes(prev => prev.filter(t => t !== timeframe!.value));
                                setupForm.setValue('selected_timeframes', selectedTimeframes.filter(t => t !== timeframe!.value));
                              }}
                              className="ml-1 hover:text-red-500 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={createAnalysisMutation.isPending || selectedTimeframes.length === 0}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-[0_8px_24px_rgba(245,158,11,0.3)] backdrop-blur-sm border border-orange-400/20"
                >
                  {createAnalysisMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Start Analysis
                </Button>
              </DialogFooter>
            </form>
          </Form>
        );

      case 1:
      case 2:
      case 3:
        const { hasTriedNext, validationErrors } = validationState;
        const currentQuestions = getCurrentTimeframeQuestions();
        const currentTimeframeData = allTimeframes.find(t => t.value === currentTimeframe);
        const isLastTimeframe = currentTimeframe === selectedTimeframes[selectedTimeframes.length - 1];

        return (
          <div className="space-y-6">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-700 font-medium">Step {progress.currentStep} of {progress.totalSteps}</span>
                <span className="text-slate-600">{Math.round((progress.currentStep / progress.totalSteps) * 100)}%</span>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-full p-1 shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-white/30">
                <Progress value={(progress.currentStep / progress.totalSteps) * 100} className="h-2" />
              </div>
            </div>

            {/* Current Timeframe Header */}
            <div className="bg-black/80 backdrop-blur-md rounded-xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/20">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              {currentTimeframeData?.icon}
                </div>
              <div>
                  <h3 className="font-bold text-white text-lg">{currentTimeframeData?.label}</h3>
                  <p className="text-sm text-gray-300 font-medium">{currentTimeframeData?.value} Analysis</p>
                </div>
              </div>
            </div>

            {/* Trader Context Message for All Timeframes */}
            <Alert className="bg-blue-50/80 backdrop-blur-sm border-blue-200/50 text-blue-800">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm">
                <div dangerouslySetInnerHTML={{ 
                  __html: getTraderContextMessage(currentTimeframe).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                }} />
              </AlertDescription>
            </Alert>

            <Separator className="bg-slate-200" />

            {/* Questions */}
            <div className="space-y-1">
              {questionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
                </div>
              ) : (
                getOrganizedQuestions().map((questionRow, rowIndex) => (
                  <div key={rowIndex} className={`grid gap-1 ${
                    questionRow.length === 1 ? 'grid-cols-1' :
                    questionRow.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
                    questionRow.length === 3 ? 'grid-cols-1 md:grid-cols-3' :
                    questionRow.length === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' :
                    questionRow.length === 5 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5' :
                    'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
                  }`}>
                    {questionRow.map((question: any) => {
                      const hasError = hasTriedNext && validationErrors.some(error => error.question_id === question.id);
                      const errorMessage = validationErrors.find(error => error.question_id === question.id)?.message;
                      
                      return (
                        <div key={question.id} className={`space-y-1 p-1.5 rounded-lg ${hasError ? 'border-2 border-red-500 bg-red-50/50 shadow-[0_4px_12px_rgba(239,68,68,0.2)]' : 'bg-white/70 backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-white/30'}`}>
                          {(() => {
                            const showRedStar = question.required && hasTriedNext && hasError;
                            return (
                              <div className="flex items-start gap-2">
                                <Label className={`text-sm font-semibold ${hasError ? 'text-red-700' : 'text-slate-800'} flex-1 leading-tight`}>
                                  {question.question_text === 'Analysis' ? (
                                    <>
                                      Analysis 
                                      {question.info && (
                                        <span className="ml-1 relative" style={{ zIndex: 999999 }}>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-4 w-4 p-0 hover:bg-blue-50 inline-flex items-center justify-center"
                                            ref={(el) => { buttonRefs.current[question.id] = el; }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (openTooltipId === question.id) {
                                                setOpenTooltipId(null);
                                                setTooltipPosition(null);
                                              } else {
                                                const button = e.currentTarget;
                                                const rect = button.getBoundingClientRect();
                                                setTooltipPosition({ x: rect.left, y: rect.top - 10 });
                                                setOpenTooltipId(question.id);
                                              }
                                            }}
                                          >
                                            <Info className="h-3 w-3 text-blue-500 hover:text-blue-600 transition-colors" />
                                          </Button>
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      {question.question_text}
                                      {question.info && (
                                        <span className="ml-1 relative" style={{ zIndex: 999999 }}>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-4 w-4 p-0 hover:bg-blue-50 inline-flex items-center justify-center"
                                            ref={(el) => { buttonRefs.current[question.id] = el; }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (openTooltipId === question.id) {
                                                setOpenTooltipId(null);
                                                setTooltipPosition(null);
                                              } else {
                                                const button = e.currentTarget;
                                                const rect = button.getBoundingClientRect();
                                                setTooltipPosition({ x: rect.left, y: rect.top - 10 });
                                                setOpenTooltipId(question.id);
                                              }
                                            }}
                                          >
                                            <Info className="h-3 w-3 text-blue-500 hover:text-blue-600 transition-colors" />
                                          </Button>
                                        </span>
                                      )}
                                    </>
                                  )}
                                  {showRedStar && <span className="text-red-500 ml-1 font-bold">*</span>}
                                </Label>
                              </div>
                            );
                          })()}
                          {renderQuestion(question)}
                          {hasError && errorMessage && (
                            <p className="text-sm text-red-600 flex items-center gap-1 font-medium">
                              <AlertTriangle className="h-3 w-3" />
                              {errorMessage}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Screenshot Upload */}
            <div className="space-y-4 border-t border-slate-200 pt-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Chart Screenshots (Optional)</Label>
                <p className="text-xs text-slate-600">
                  Upload screenshots of your chart analysis. JPG, JPEG, PNG, HEIC formats only. Maximum 3MB per file.
                </p>
                
                {/* Upload Progress */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Upload Success Message */}
                {uploadSuccess && (
                  <Alert className="bg-green-50/80 backdrop-blur-sm border-green-200/50 text-green-800">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-xs">
                      Screenshot uploaded successfully!
                    </AlertDescription>
                  </Alert>
                )}

                <Input
                  type="file"
                  accept=".jpg,.jpeg,.png,.heic"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Check file size (3MB = 3 * 1024 * 1024 bytes)
                      if (file.size > 3 * 1024 * 1024) {
                        toast({
                          title: "File Too Large",
                          description: "Please select a file smaller than 3MB.",
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      // Simulate upload progress
                      setUploadProgress(0);
                      setUploadSuccess(false);
                      
                      const interval = setInterval(() => {
                        setUploadProgress(prev => {
                          if (prev >= 100) {
                            clearInterval(interval);
                            setUploadSuccess(true);
                            setTimeout(() => setUploadSuccess(false), 3000);
                            return 0;
                          }
                          return prev + 10;
                        });
                      }, 100);

                      // Add to screenshots array for this timeframe
                      const newScreenshot = {
                        id: Date.now(),
                        name: file.name,
                        file: file,
                        uploadedAt: new Date().toISOString()
                      };
                      
                      setScreenshots(prev => ({
                        ...prev,
                        [currentTimeframe]: prev[currentTimeframe] 
                          ? [...prev[currentTimeframe], newScreenshot]
                          : [newScreenshot]
                      }));
                    }
                  }}
                  className="bg-white/90 backdrop-blur-sm border-slate-200 hover:border-slate-300 focus:border-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.05)] text-slate-800"
                />
                
                {/* Display uploaded screenshots */}
                {screenshots[currentTimeframe] && screenshots[currentTimeframe].length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-700">Uploaded Screenshots:</p>
                    {screenshots[currentTimeframe].map((screenshot, index) => (
                      <div key={screenshot.id} className="flex items-center space-x-2 p-2 bg-white/60 backdrop-blur-sm border border-white/30 rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                        <span className="text-sm text-slate-700 flex-1">{screenshot.file_name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                          onClick={() => {
                            setScreenshots(prev => ({
                              ...prev,
                              [currentTimeframe]: prev[currentTimeframe].filter((_, i) => i !== index)
                            }));
                          }}
                          className="text-slate-600 hover:text-red-500 hover:bg-red-50/50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* AI Analysis Option - Show only on last timeframe */}
            {isLastTimeframe && (
              <div className="space-y-4 border-t border-slate-200 pt-4">
                <div className="flex items-start space-x-3 p-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                  <Checkbox
                    id="enable-ai-analysis"
                    checked={enableAIAnalysis}
                    onCheckedChange={(checked) => setEnableAIAnalysis(checked as boolean)}
                    className="text-blue-600 border-slate-300"
                  />
                  <div className="space-y-2">
                    <Label htmlFor="enable-ai-analysis" className="text-sm font-medium text-slate-700">
                      Include AI Analysis (Optional)
                    </Label>
                    <p className="text-xs text-slate-600">
                      Get AI-generated insights and recommendations based on your analysis
                    </p>
                  </div>
                </div>
                
                {enableAIAnalysis && (
                  <Alert className="bg-amber-50/80 backdrop-blur-sm border-amber-200/50 text-amber-800">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-xs">
                      <strong>Important:</strong> AI analysis is for informational purposes only and should not be used as trading advice. 
                      Always rely on your own analysis and risk management. The AI does not guarantee profits or predict market movements.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  const currentIndex = selectedTimeframes.findIndex(t => t === currentTimeframe);
                  if (currentIndex > 0) {
                    setCurrentTimeframe(selectedTimeframes[currentIndex - 1]);
                  }
                }}
                disabled={selectedTimeframes.findIndex(t => t === currentTimeframe) === 0}
                className="bg-white/80 hover:bg-white text-slate-700 border-slate-200 hover:border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
              <Button
                onClick={handleTimeframeComplete}
                // Never disable for validation, only for loading
                disabled={saveAnswersMutation.isPending || isSubmitting}
                variant={validationErrors.length > 0 ? "destructive" : "default"}
                className={validationErrors.length > 0 ? 
                  "bg-red-500 hover:bg-red-600 text-white shadow-[0_4px_12px_rgba(239,68,68,0.3)]" : 
                  "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)]"
                }
              >
                {saveAnswersMutation.isPending || isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : validationErrors.length > 0 ? (
                  <AlertTriangle className="mr-2 h-4 w-4" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                {isLastTimeframe ? 'Complete Analysis' : 'Next Timeframe'}
              </Button>
            </DialogFooter>
          </div>
        );

      case 4:
        return renderAnalysisResults();

      default:
        return null;
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className={`${expanded ? 'fixed inset-0 z-[9999] max-w-none w-screen h-screen rounded-none' : 'w-[98vw] sm:w-[95vw] md:w-[90vw] lg:w-[85vw] xl:w-[80vw] max-w-4xl h-[98vh] sm:h-[95vh] md:h-[90vh] lg:h-[85vh] xl:h-[80vh] max-h-[90vh] overflow-y-auto mx-auto'} bg-gradient-to-br from-slate-50 to-slate-100 border-0 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] backdrop-blur-sm [&>button]:hidden`}>
          <DialogHeader className="bg-black/80 backdrop-blur-md rounded-t-xl border-b border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-3 sm:p-4 md:p-6">
            <div className="flex items-start justify-between w-full">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-white font-bold text-lg sm:text-xl md:text-2xl px-1 sm:px-2">
                  {currentStep === 0 && "Top Down Analysis Setup"}
                  {currentStep >= 1 && currentStep <= 3 && "Top Down Analysis"}
                  {currentStep === 4 && "Analysis Results"}
                </DialogTitle>
                <DialogDescription className="text-gray-200 mt-1 sm:mt-2 font-medium px-1 sm:px-2 text-sm sm:text-base">
                  {currentStep === 0 && "Configure your analysis parameters and select timeframes"}
                  {currentStep >= 1 && currentStep <= 3 && "Complete each timeframe analysis"}
                  {currentStep === 4 && enableAIAnalysis && "Review your analysis results and AI recommendations"}
                  {currentStep === 4 && !enableAIAnalysis && "Your analysis has been completed successfully"}
                </DialogDescription>
              </div>
              <div className="flex items-center space-x-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleClose}
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

          {/* Success Message */}
          {saveSuccess && (
            <div className="mx-3 sm:mx-4 md:mx-6 mt-4">
              <Alert className="bg-green-50 border-green-200 text-green-800">
                <AlertDescription>
                  Your Top Down Analysis has been successfully saved to your Trader&apos;s Journal.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <div className={`${expanded ? 'flex-1 overflow-y-auto p-6' : 'p-3 sm:p-4 md:p-6'} bg-transparent`}>
          {renderContent(expanded, validationState.hasTriedNext)}
        </div>
        {/* (Removed error alert from bottom) */}
        {currentStep === 4 && (
            <DialogFooter className="bg-white/70 backdrop-blur-sm rounded-b-xl border-t border-white/20 shadow-sm">
              <Button variant="outline" onClick={handleClose} className="bg-white/80 hover:bg-white text-slate-700 border-slate-200 hover:border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
              Close
            </Button>
            <Button onClick={() => {
              // Reset and start new analysis
              setCurrentStep(0);
              setAnalysisId(null);
              setCurrentTimeframe('DAILY');
              setQuestionAnswers({});
              setAnalysisResult(null);
                setSelectedTimeframes(['DAILY', 'H1', 'M15']);
              }} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)]">
              New Analysis
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
      
      {/* Beautiful Validation Modal - Rendered at document body level */}
      {showValidationDialog && createPortal(
        <div 
          className="fixed inset-0 flex items-center justify-center"
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 999999999
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          <div 
            className="bg-white/90 backdrop-blur-md rounded-2xl p-8 max-w-md mx-4 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-white/30"
            style={{ 
              pointerEvents: 'auto',
              zIndex: 999999999,
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  Required Fields Missing
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  All mandatory fields must be answered before proceeding to the next timeframe or before submitting the analysis.
                </p>
              </div>
              <div className="pt-4">
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                    setShowValidationDialog(false);
                  }}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-[0_8px_24px_rgba(239,68,68,0.3)] backdrop-blur-sm border border-red-400/20 px-8 py-3 cursor-pointer rounded-lg font-medium transition-all duration-200 hover:shadow-[0_12px_32px_rgba(239,68,68,0.4)]"
                  type="button"
                  style={{ 
                    pointerEvents: 'auto', 
                    userSelect: 'none',
                    border: 'none',
                    outline: 'none'
                  }}
                >
                  Got it, I'll complete the fields
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Portal-based Tooltip */}
      {openTooltipId && tooltipPosition && questions && createPortal(
        (() => {
          const question = questions.find((q: any) => q.id === openTooltipId);
          if (!question?.info) return null;
          
          return (
            <div 
              className="fixed px-3 py-2 bg-slate-800 text-white text-sm rounded-lg shadow-lg max-w-xs"
              style={{ 
                width: 'max-content', 
                maxWidth: '280px', 
                zIndex: 999999999,
                position: 'fixed',
                top: tooltipPosition.y - 10,
                left: tooltipPosition.x,
                transform: 'translateY(-100%)'
              }}
            >
              <div className="text-xs font-medium mb-1">Why it&apos;s important:</div>
              <div className="text-xs leading-relaxed">{question.info}</div>
              <div className="absolute top-full left-2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
            </div>
          );
        })(),
        document.body
      )}
    </>
  );
};

export default TopDownAnalysisDialog; 