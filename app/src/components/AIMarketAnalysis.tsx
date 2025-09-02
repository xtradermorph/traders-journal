'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Loader2, TrendingUp, TrendingDown, Minus, AlertTriangle, Brain, BarChart3, Activity, Target, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import aiMarketAnalysis, { 
  MarketSentiment, 
  RiskPrediction, 
  BehavioralPattern, 
  MarketCorrelation, 
  VolatilityPrediction,
  AIInsight 
} from '@/lib/ai-market-analysis';

interface AIMarketAnalysisProps {
  defaultCurrencyPair?: string;
}

export default function AIMarketAnalysis({ defaultCurrencyPair = 'EURUSD' }: AIMarketAnalysisProps) {
  const [currencyPair, setCurrencyPair] = useState(defaultCurrencyPair);
  const [loading, setLoading] = useState(false);
  const [sentiment, setSentiment] = useState<MarketSentiment | null>(null);
  const [risk, setRisk] = useState<RiskPrediction | null>(null);
  const [patterns, setPatterns] = useState<BehavioralPattern[]>([]);
  const [correlations, setCorrelations] = useState<MarketCorrelation[]>([]);
  const [volatility, setVolatility] = useState<VolatilityPrediction | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  const currencyPairs = [
    'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD',
    'EURGBP', 'EURJPY', 'GBPJPY', 'CHFJPY', 'AUDJPY', 'CADJPY'
  ];

  const analyzeMarket = async () => {
    setLoading(true);
    try {
      const [sentimentData, riskData, patternsData, correlationsData, volatilityData, insightsData] = await Promise.all([
        aiMarketAnalysis.analyzeMarketSentiment(currencyPair),
        aiMarketAnalysis.predictRisk(currencyPair, 'LONG', 0),
        aiMarketAnalysis.recognizeBehavioralPatterns(currencyPair, '1D'),
        aiMarketAnalysis.analyzeMarketCorrelations(currencyPair, ['EURUSD', 'GBPUSD', 'USDJPY']),
        aiMarketAnalysis.predictVolatility(currencyPair, '1D'),
        aiMarketAnalysis.generateAIInsights(currencyPair)
      ]);

      setSentiment(sentimentData);
      setRisk(riskData);
      setPatterns(patternsData);
      setCorrelations(correlationsData);
      setVolatility(volatilityData);
      setInsights(insightsData);

      toast({
        title: "Analysis Complete",
        description: `AI analysis completed for ${currencyPair}`,
      });
    } catch (error) {
      console.error('Error analyzing market:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to complete AI market analysis",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currencyPair) {
      analyzeMarket();
    }
  }, [currencyPair]);

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'BULLISH':
        return <TrendingUp className="h-6 w-6 text-green-500" />;
      case 'BEARISH':
        return <TrendingDown className="h-6 w-6 text-red-500" />;
      default:
        return <Minus className="h-6 w-6 text-gray-500" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'BULLISH':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'BEARISH':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getVolatilityColor = (volatility: string) => {
    switch (volatility) {
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'EXTREME':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-600" />
            AI Market Analysis
          </h2>
          <p className="text-muted-foreground">
            Advanced AI-powered market insights and predictions
          </p>
        </div>
        
        <div className="flex gap-2">
          <Select value={currencyPair} onValueChange={setCurrencyPair}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              {currencyPairs.map((pair) => (
                <SelectItem key={pair} value={pair}>
                  {pair}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            onClick={analyzeMarket} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {loading ? 'Analyzing...' : 'Analyze'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="correlations">Correlations</TabsTrigger>
          <TabsTrigger value="volatility">Volatility</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Market Sentiment Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Market Sentiment</CardTitle>
                {sentiment && getSentimentIcon(sentiment.overall)}
              </CardHeader>
              <CardContent>
                {sentiment ? (
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">{sentiment.overall}</div>
                    <div className="flex items-center gap-2">
                      <Progress value={sentiment.confidence} className="flex-1" />
                      <span className="text-sm text-muted-foreground">{sentiment.confidence}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Confidence Level
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Risk Level Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
                <AlertTriangle className="h-6 w-6 text-orange-500" />
              </CardHeader>
              <CardContent>
                {risk ? (
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">{risk.risk_level}</div>
                    <div className="flex items-center gap-2">
                      <Progress value={risk.probability} className="flex-1" />
                      <span className="text-sm text-muted-foreground">{risk.probability}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Risk Probability
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Volatility Prediction Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Volatility</CardTitle>
                <Activity className="h-6 w-6 text-purple-500" />
              </CardHeader>
              <CardContent>
                {volatility ? (
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">{volatility.expected_volatility}</div>
                    <div className="flex items-center gap-2">
                      <Progress value={volatility.probability} className="flex-1" />
                      <span className="text-sm text-muted-foreground">{volatility.probability}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Prediction Confidence
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Insights
              </CardTitle>
              <CardDescription>
                Actionable insights generated by AI analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insights.length > 0 ? (
                <div className="space-y-3">
                  {insights.map((insight) => (
                    <div key={insight.id} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{insight.type}</Badge>
                          <Badge variant="outline">{insight.currency_pair}</Badge>
                          <Badge variant={insight.actionable ? "default" : "secondary"}>
                            {insight.actionable ? "Actionable" : "Informational"}
                          </Badge>
                        </div>
                        <p className="text-sm">{insight.insight}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Progress value={insight.confidence} className="w-20 h-2" />
                          <span className="text-xs text-muted-foreground">{insight.confidence}% confidence</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No insights available. Run analysis to generate insights.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sentiment Tab */}
        <TabsContent value="sentiment" className="space-y-6">
          {sentiment ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getSentimentIcon(sentiment.overall)}
                  Market Sentiment Analysis
                </CardTitle>
                <CardDescription>
                  Comprehensive sentiment analysis for {currencyPair}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold mb-2">{sentiment.confidence}%</div>
                    <div className="text-sm text-muted-foreground">Confidence</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold mb-2">{sentiment.currency_pair}</div>
                    <div className="text-sm text-muted-foreground">Currency Pair</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold mb-2">
                      {new Date(sentiment.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Last Updated</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Sentiment Factors</h4>
                  <div className="space-y-2">
                    {sentiment.factors.map((factor, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <span className="text-sm">{factor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Loading sentiment analysis...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Risk Tab */}
        <TabsContent value="risk" className="space-y-6">
          {risk ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Risk Prediction Analysis
                </CardTitle>
                <CardDescription>
                  AI-powered risk assessment and recommendations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold mb-2">{risk.risk_level}</div>
                    <div className="text-sm text-muted-foreground">Risk Level</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold mb-2">{risk.probability}%</div>
                    <div className="text-sm text-muted-foreground">Risk Probability</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Risk Factors</h4>
                  <div className="space-y-2">
                    {risk.factors.map((factor, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                        <div className="w-2 h-2 bg-orange-500 rounded-full" />
                        <span className="text-sm">{factor}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Recommendations</h4>
                  <div className="space-y-2">
                    {risk.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                        <Target className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{recommendation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Loading risk analysis...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Patterns Tab */}
        <TabsContent value="patterns" className="space-y-6">
          {patterns.length > 0 ? (
            <div className="space-y-4">
              {patterns.map((pattern, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      {pattern.pattern_type.replace('_', ' ')} Pattern
                    </CardTitle>
                    <CardDescription>
                      Behavioral pattern recognition with {pattern.confidence}% confidence
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-lg font-bold mb-1">{pattern.confidence}%</div>
                        <div className="text-sm text-muted-foreground">Confidence</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-lg font-bold mb-1">{(pattern.historical_accuracy * 100).toFixed(1)}%</div>
                        <div className="text-sm text-muted-foreground">Historical Accuracy</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-lg font-bold mb-1">{pattern.pattern_type}</div>
                        <div className="text-sm text-muted-foreground">Pattern Type</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground">{pattern.description}</p>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Suggested Action</h4>
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                        <span className="text-sm text-blue-800">{pattern.suggested_action}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Loading pattern analysis...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Correlations Tab */}
        <TabsContent value="correlations" className="space-y-6">
          {correlations.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Market Correlations
                </CardTitle>
                <CardDescription>
                  Correlation analysis between {currencyPair} and other currency pairs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {correlations.map((correlation, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-medium">
                          {correlation.pair1} vs {correlation.pair2}
                        </div>
                        <Badge variant="outline">
                          {correlation.correlation_coefficient.toFixed(3)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-sm font-medium mb-1">Strength</div>
                          <Badge variant="secondary">{correlation.strength}</Badge>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium mb-1">Direction</div>
                          <Badge variant={correlation.direction === 'POSITIVE' ? 'default' : 'destructive'}>
                            {correlation.direction}
                          </Badge>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium mb-1">Confidence</div>
                          <div className="text-sm">{correlation.confidence.toFixed(1)}%</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Loading correlation analysis...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Volatility Tab */}
        <TabsContent value="volatility" className="space-y-6">
          {volatility ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Volatility Prediction
                </CardTitle>
                <CardDescription>
                  AI-powered volatility forecasting and risk implications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold mb-2">{volatility.expected_volatility}</div>
                    <div className="text-sm text-muted-foreground">Expected Volatility</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold mb-2">{volatility.probability}%</div>
                    <div className="text-sm text-muted-foreground">Probability</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold mb-2">{volatility.timeframe}</div>
                    <div className="text-sm text-muted-foreground">Timeframe</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Volatility Factors</h4>
                  <div className="space-y-2">
                    {volatility.factors.map((factor, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                        <div className="w-2 h-2 bg-purple-500 rounded-full" />
                        <span className="text-sm">{factor}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Risk Implications</h4>
                  <div className="space-y-2">
                    {volatility.risk_implications.map((implication, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-red-800">{implication}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Loading volatility analysis...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
