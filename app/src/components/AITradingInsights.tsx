'use client'

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, AlertTriangle, Brain, TrendingUp, TrendingDown, Minus, Shield, AlertCircle, AlertOctagon, Check, X } from "lucide-react";
import { 
  analyzeTradingPattern, 
  analyzeMarketSentiment, 
  getStrategySuggestions, 
  assessRisk, 
  analyzeTradingBehavior 
} from "@/lib/grok";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { askSecretsFunction, checkApiKeys } from "@/lib/checkKeys";

import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


interface AITradingInsightsProps {
  trades: Array<Record<string, unknown>>;
  stats: Record<string, unknown>;
  isLoading: boolean;
}

const AITradingInsights = ({ trades, stats, isLoading }: AITradingInsightsProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("patterns");
  const [currencyPair, setCurrencyPair] = useState<string>("");
  const [patternAnalysis, setPatternAnalysis] = useState<string>("");
  const [sentimentAnalysis, setSentimentAnalysis] = useState<{
    sentiment: string;
    score: number;
    analysis: string;
    factors: string[];
  } | null>(null);
  const [strategyInsights, setStrategyInsights] = useState<string>("");
  
  // New state for risk assessment
  const [riskProfile, setRiskProfile] = useState<{
    riskScore: number;
    riskLevel: string;
    analysis: string;
    recommendations: string[];
  } | null>(null);
  
  // New state for trading behavior analysis
  const [behaviorAnalysis, setBehaviorAnalysis] = useState<{
    behavioralPatterns: string[];
    psychologicalInsights: string;
    actionableSteps: string[];
  } | null>(null);
  
  const { toast } = useToast();

  const handlePatternAnalysis = async () => {
    // Check if API key exists
    if (!(await checkApiKey())) return;
    
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeTradingPattern(trades);
      setPatternAnalysis(analysis);
    } catch (error) {
      console.error("Error analyzing patterns:", error);
      toast({
        id: `analysis-failed-${Date.now()}`, // Add a unique ID for the toast
        title: "Analysis failed",
        description: "Could not analyze your trading patterns. Please try again later."
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleMarketSentiment = async () => {
    // Check if API key exists
    if (!(await checkApiKey())) return;
    
    if (!currencyPair) {
      toast({
        id: `no-currency-pair-${Date.now()}`, // Add a unique ID for the toast
        title: "No currency pair selected",
        description: "Please select a currency pair to analyze."
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const sentiment = await analyzeMarketSentiment(currencyPair);
      setSentimentAnalysis(sentiment);
    } catch (error) {
      console.error("Error analyzing market sentiment:", error);
      toast({
        id: `sentiment-analysis-failed-${Date.now()}`, // Add a unique ID for the toast
        title: "Analysis failed",
        description: "Could not analyze market sentiment. Please try again later."
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStrategySuggestions = async () => {
    // Check if API key exists
    if (!(await checkApiKey())) return;
    
    setIsAnalyzing(true);
    try {
      const suggestions = await getStrategySuggestions(stats);
      setStrategyInsights(suggestions);
    } catch (error) {
      console.error("Error generating strategy suggestions:", error);
      toast({
        id: `strategy-suggestions-failed-${Date.now()}`, // Add a unique ID for the toast
        title: "Analysis failed",
        description: "Could not generate strategy suggestions. Please try again later."
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handler for risk assessment
  const handleRiskAssessment = async () => {
    // Check if API key exists
    if (!(await checkApiKey())) return;
    
    setIsAnalyzing(true);
    try {
      const riskAnalysis = await assessRisk(trades);
      setRiskProfile(riskAnalysis);
    } catch (error) {
      console.error("Error analyzing risk profile:", error);
      toast({
        id: `risk-analysis-failed-${Date.now()}`,
        title: "Risk analysis failed",
        description: "Could not analyze your risk profile. Please try again later."
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handler for trading behavior analysis
  const handleBehaviorAnalysis = async () => {
    // Check if API key exists
    if (!(await checkApiKey())) return;
    
    setIsAnalyzing(true);
    try {
      const behaviorInsights = await analyzeTradingBehavior(trades);
      setBehaviorAnalysis(behaviorInsights);
    } catch (error) {
      console.error("Error analyzing trading behavior:", error);
      toast({
        id: `behavior-analysis-failed-${Date.now()}`,
        title: "Behavior analysis failed",
        description: "Could not analyze your trading behavior. Please try again later."
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper function to check if API key exists
  const checkApiKey = async (): Promise<boolean> => {
    // Use the improved checkApiKeys function from checkKeys.ts
    const hasApiKey = await checkApiKeys();
    
    if (!hasApiKey) {
      toast({
        id: `api-key-required-${Date.now()}`,
        title: "API Key Required",
        description: "AI API key is required for AI-powered insights.",
        variant: "destructive"
      });
      
      // Prompt user to enter API key
      await askSecretsFunction();
      return false;
    }
    return true;
  };

  // Helper to get unique currency pairs from trades
  const getCurrencyPairs = () => {
    // Major forex pairs that should always be available
    const majorForexPairs = [
      "EUR/USD",
      "GBP/USD",
      "USD/JPY",
      "USD/CHF",
      "AUD/USD",
      "USD/CAD",
      "NZD/USD",
      "EUR/GBP",
      "EUR/JPY",
      "GBP/JPY"
    ];
    
    // Get pairs from user trades if available
    const tradePairs = trades?.length ? new Set(trades.map(trade => trade.currencyPair)) : new Set();
    
    // Combine major pairs with user's trade pairs
    const allPairs = new Set([...majorForexPairs, ...Array.from(tradePairs)]);
    
    // Return as sorted array
    return Array.from(allPairs).sort();
  };

  // Render sentiment badge based on analysis
  const renderSentimentBadge = () => {
    if (!sentimentAnalysis) return null;

    const { sentiment, score } = sentimentAnalysis;
    
    let badgeClass = "";
    let icon = null;
    
    if (sentiment === "bullish") {
      badgeClass = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      icon = <TrendingUp className="h-4 w-4 mr-1" />;
    } else if (sentiment === "bearish") {
      badgeClass = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      icon = <TrendingDown className="h-4 w-4 mr-1" />;
    } else {
      badgeClass = "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
      icon = <Minus className="h-4 w-4 mr-1" />;
    }
    
    return (
      <div className="mb-4">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badgeClass}`}>
          {icon}
          {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)} (Score: {score})
        </div>
      </div>
    );
  };

  // Render risk level badge
  const renderRiskLevelBadge = () => {
    if (!riskProfile) return null;

    const { riskLevel } = riskProfile;
    
    let badgeClass = "";
    let icon = null;
    
    if (riskLevel === "low") {
      badgeClass = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      icon = <Shield className="h-4 w-4 mr-1" />;
    } else if (riskLevel === "moderate") {
      badgeClass = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
      icon = <AlertCircle className="h-4 w-4 mr-1" />;
    } else if (riskLevel === "high") {
      badgeClass = "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100";
      icon = <AlertTriangle className="h-4 w-4 mr-1" />;
    } else {
      badgeClass = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      icon = <AlertOctagon className="h-4 w-4 mr-1" />;
    }
    
    return (
      <div className="mb-4">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badgeClass}`}>
          {icon}
          {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk Profile
        </div>
      </div>
    );
  };

  // Render behavior pattern badge
  const renderBehaviorPatternBadge = (pattern: string, impact: 'positive' | 'negative' | 'neutral') => {
    let badgeClass = "";
    let icon = null;
    
    if (impact === "positive") {
      badgeClass = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      icon = <Check className="h-3 w-3 mr-1" />;
    } else if (impact === "negative") {
      badgeClass = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      icon = <X className="h-3 w-3 mr-1" />;
    } else {
      badgeClass = "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
      icon = <Minus className="h-3 w-3 mr-1" />;
    }
    
    return (
      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mr-2 mb-2 ${badgeClass}`}>
        {icon}
        {pattern}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <Skeleton className="h-6 w-48" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-full" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle />
        <CardDescription>
          Get AI-powered analysis and recommendations based on your trading data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-6 gap-1">
            <TabsTrigger value="patterns" className="text-xs sm:text-sm">Pattern Analysis</TabsTrigger>
            <TabsTrigger value="sentiment" className="text-xs sm:text-sm">Market Sentiment</TabsTrigger>
            <TabsTrigger value="strategy" className="text-xs sm:text-sm">Strategy Tips</TabsTrigger>
            <TabsTrigger value="risk" className="text-xs sm:text-sm">Risk Assessment</TabsTrigger>
            <TabsTrigger value="behavior" className="text-xs sm:text-sm">Trading Behavior</TabsTrigger>
          </TabsList>
          
          <TabsContent value="patterns" className="space-y-4">
            {patternAnalysis ? (
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-line">{patternAnalysis}</div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 mb-4">
                  Get AI analysis of your trading patterns, strengths, and weaknesses
                </p>
                <Button 
                  onClick={handlePatternAnalysis} 
                  disabled={isAnalyzing || (trades?.length || 0) < 3}
                >
                  {isAnalyzing ? "Analyzing..." : "Analyze My Patterns"}
                </Button>
                {(trades?.length || 0) < 3 && (
                  <p className="text-xs text-amber-600 mt-2">
                    You need at least 3 trades for pattern analysis
                  </p>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="sentiment" className="space-y-4">
            <div className="mb-4">
              <Select value={currencyPair} onValueChange={setCurrencyPair}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency pair" />
                </SelectTrigger>
                <SelectContent>
                  {getCurrencyPairs().map((pair, idx) => (
                    pair ? (
                      <SelectItem key={pair + '-' + idx} value={pair as string}>
                        {pair as string}
                      </SelectItem>
                    ) : null
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {sentimentAnalysis ? (
              <>
                {renderSentimentBadge()}
                <div className="prose prose-sm max-w-none">
                  <p>{sentimentAnalysis.analysis}</p>
                </div>
                <Button 
                  variant="outline" 
                  className="mt-2" 
                  onClick={() => setSentimentAnalysis(null)}
                >
                  Analyze Another Pair
                </Button>
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500 mb-4">
                  Get AI-powered sentiment analysis for your currency pairs
                </p>
                <Button 
                  onClick={handleMarketSentiment} 
                  disabled={isAnalyzing || !currencyPair}
                >
                  {isAnalyzing ? "Analyzing..." : "Analyze Sentiment"}
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="strategy" className="space-y-4">
            {strategyInsights ? (
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-line">{strategyInsights}</div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 mb-4">
                  Get personalized strategy recommendations based on your performance
                </p>
                <Button 
                  onClick={handleStrategySuggestions} 
                  disabled={isAnalyzing || !stats || (trades?.length || 0) === 0}
                >
                  {isAnalyzing ? "Generating..." : "Get Strategy Tips"}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="risk" className="space-y-4">
            {riskProfile ? (
              <div className="space-y-4">
                {renderRiskLevelBadge()}
                
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Low Risk</span>
                    <span>High Risk</span>
                  </div>
                  <div className="relative pt-1">
                    <Progress value={riskProfile.riskScore} max={100} className="h-2" />
                  </div>
                </div>

                <div className="prose prose-sm max-w-none">
                  <p>{riskProfile.analysis}</p>
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Recommendations:</h4>
                  <ul className="space-y-2">
                    {riskProfile.recommendations.map((recommendation, idx) => (
                      <li key={recommendation + '-' + idx} className="flex items-start">
                        <div className="mr-2 mt-0.5 text-primary">
                          <AlertCircle className="h-4 w-4" />
                        </div>
                        <span className="text-sm">{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setRiskProfile(null)}
                    className="w-full"
                  >
                    Analyze Again
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 mb-4">
                  Get a comprehensive assessment of your trading risk profile
                </p>
                <Button 
                  onClick={handleRiskAssessment} 
                  disabled={isAnalyzing || (trades?.length || 0) < 5}
                >
                  {isAnalyzing ? "Analyzing..." : "Analyze My Risk Profile"}
                </Button>
                {(trades?.length || 0) < 5 && (
                  <p className="text-xs text-amber-600 mt-2">
                    You need at least 5 trades for risk assessment
                  </p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="behavior" className="space-y-4">
            {behaviorAnalysis ? (
              <div className="space-y-4">
                <div className="flex flex-wrap">
                  {behaviorAnalysis.behavioralPatterns.map((pattern, idx) => (
                    <div key={pattern.pattern + '-' + idx}>
                      {renderBehaviorPatternBadge(pattern.pattern, pattern.impact)}
                    </div>
                  ))}
                </div>

                <Alert className="mt-4">
                  <Brain className="h-4 w-4" />
                  <AlertTitle>Psychological Insights</AlertTitle>
                  <AlertDescription>
                    {behaviorAnalysis.psychologicalInsights}
                  </AlertDescription>
                </Alert>

                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Actionable Steps:</h4>
                  <ul className="space-y-2">
                    {behaviorAnalysis.actionableSteps.map((step, idx) => (
                      <li key={step + '-' + idx} className="flex items-start">
                        <div className="mr-2 mt-0.5 text-primary">
                          <Check className="h-4 w-4" />
                        </div>
                        <span className="text-sm">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4">
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    {behaviorAnalysis.behavioralPatterns.map((pattern, idx) => (
                      <div key={pattern.pattern + '-desc-' + idx} className="space-y-1">
                        <div className="flex items-center">
                          {pattern.impact === 'positive' ? (
                            <Check className="h-4 w-4 text-green-500 mr-2" />
                          ) : pattern.impact === 'negative' ? (
                            <X className="h-4 w-4 text-red-500 mr-2" />
                          ) : (
                            <Minus className="h-4 w-4 text-gray-500 mr-2" />
                          )}
                          <h5 className="text-sm font-medium">{pattern.pattern}</h5>
                        </div>
                        <p className="text-xs text-muted-foreground pl-6">{pattern.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setBehaviorAnalysis(null)}
                    className="w-full"
                  >
                    Analyze Again
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 mb-4">
                  Discover psychological patterns in your trading decisions
                </p>
                <Button 
                  onClick={handleBehaviorAnalysis} 
                  disabled={isAnalyzing || (trades?.length || 0) < 5}
                >
                  {isAnalyzing ? "Analyzing..." : "Analyze My Trading Behavior"}
                </Button>
                {(trades?.length || 0) < 5 && (
                  <p className="text-xs text-amber-600 mt-2">
                    You need at least 5 trades for behavior analysis
                  </p>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AITradingInsights;