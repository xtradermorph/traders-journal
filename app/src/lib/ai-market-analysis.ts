import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Types for AI market analysis
export interface MarketSentiment {
  overall: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number; // 0-100
  factors: string[];
  timestamp: string;
  currency_pair: string;
}

export interface RiskPrediction {
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  probability: number; // 0-100
  factors: string[];
  recommendations: string[];
  confidence: number;
  timestamp: string;
}

export interface BehavioralPattern {
  pattern_type: 'TREND_FOLLOWING' | 'MEAN_REVERSION' | 'BREAKOUT' | 'CONSOLIDATION';
  confidence: number;
  description: string;
  historical_accuracy: number;
  suggested_action: string;
}

export interface MarketCorrelation {
  pair1: string;
  pair2: string;
  correlation_coefficient: number; // -1 to 1
  strength: 'STRONG' | 'MODERATE' | 'WEAK';
  direction: 'POSITIVE' | 'NEGATIVE';
  confidence: number;
}

export interface VolatilityPrediction {
  expected_volatility: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  probability: number;
  timeframe: string;
  factors: string[];
  risk_implications: string[];
}

export interface AIInsight {
  id: string;
  type: 'SENTIMENT' | 'RISK' | 'PATTERN' | 'CORRELATION' | 'VOLATILITY';
  currency_pair: string;
  insight: string;
  confidence: number;
  actionable: boolean;
  timestamp: string;
  metadata: any;
}

class AIMarketAnalysisService {
  private supabase = createClientComponentClient();

  /**
   * Analyze market sentiment using multiple data sources
   */
  async analyzeMarketSentiment(currencyPair: string): Promise<MarketSentiment> {
    try {
      // Get news sentiment, technical indicators, and social media data
      const [newsSentiment, technicalSentiment, socialSentiment] = await Promise.all([
        this.getNewsSentiment(currencyPair),
        this.getTechnicalSentiment(currencyPair),
        this.getSocialSentiment(currencyPair)
      ]);

      // Combine sentiment scores using weighted average
      const overallSentiment = this.calculateOverallSentiment([
        { score: newsSentiment, weight: 0.4 },
        { score: technicalSentiment, weight: 0.4 },
        { score: socialSentiment, weight: 0.2 }
      ]);

      const sentiment: MarketSentiment = {
        overall: overallSentiment.sentiment,
        confidence: overallSentiment.confidence,
        factors: [
          `News Sentiment: ${newsSentiment > 0 ? 'Positive' : 'Negative'} (${Math.abs(newsSentiment).toFixed(2)})`,
          `Technical Analysis: ${technicalSentiment > 0 ? 'Bullish' : 'Bearish'} (${Math.abs(technicalSentiment).toFixed(2)})`,
          `Social Sentiment: ${socialSentiment > 0 ? 'Optimistic' : 'Pessimistic'} (${Math.abs(socialSentiment).toFixed(2)})`
        ],
        timestamp: new Date().toISOString(),
        currency_pair: currencyPair
      };

      // Store sentiment analysis
      await this.storeSentimentAnalysis(sentiment);

      return sentiment;
    } catch (error) {
      console.error('Error analyzing market sentiment:', error);
      throw new Error('Failed to analyze market sentiment');
    }
  }

  /**
   * Predict risk levels for trading decisions
   */
  async predictRisk(currencyPair: string, tradeType: 'LONG' | 'SHORT', entryPrice: number): Promise<RiskPrediction> {
    try {
      // Get market volatility, correlation data, and economic indicators
      const [volatility, correlations, economicFactors] = await Promise.all([
        this.getMarketVolatility(currencyPair),
        this.getMarketCorrelations(currencyPair),
        this.getEconomicIndicators(currencyPair)
      ]);

      // Calculate risk score based on multiple factors
      const riskScore = this.calculateRiskScore({
        volatility,
        correlations,
        economicFactors,
        tradeType,
        entryPrice
      });

      const riskPrediction: RiskPrediction = {
        risk_level: this.getRiskLevel(riskScore),
        probability: riskScore,
        factors: [
          `Market Volatility: ${volatility.level}`,
          `Correlation Risk: ${correlations.riskLevel}`,
          `Economic Conditions: ${economicFactors.overall}`,
          `Trade Direction: ${tradeType}`
        ],
        recommendations: this.generateRiskRecommendations(riskScore, tradeType),
        confidence: this.calculateConfidence(volatility, correlations, economicFactors),
        timestamp: new Date().toISOString()
      };

      // Store risk prediction
      await this.storeRiskPrediction(riskPrediction);

      return riskPrediction;
    } catch (error) {
      console.error('Error predicting risk:', error);
      throw new Error('Failed to predict risk');
    }
  }

  /**
   * Recognize behavioral patterns in market data
   */
  async recognizeBehavioralPatterns(currencyPair: string, timeframe: string): Promise<BehavioralPattern[]> {
    try {
      // Get historical price data and volume patterns
      const [priceData, volumeData, indicatorData] = await Promise.all([
        this.getHistoricalPrices(currencyPair, timeframe),
        this.getVolumePatterns(currencyPair, timeframe),
        this.getTechnicalIndicators(currencyPair, timeframe)
      ]);

      // Analyze patterns using technical analysis and AI algorithms
      const patterns = this.analyzePatterns(priceData, volumeData, indicatorData);

      // Store pattern recognition results
      await this.storePatternRecognition(patterns);

      return patterns;
    } catch (error) {
      console.error('Error recognizing behavioral patterns:', error);
      throw new Error('Failed to recognize behavioral patterns');
    }
  }

  /**
   * Analyze market correlations between currency pairs
   */
  async analyzeMarketCorrelations(primaryPair: string, secondaryPairs: string[]): Promise<MarketCorrelation[]> {
    try {
      const correlations: MarketCorrelation[] = [];

      for (const secondaryPair of secondaryPairs) {
        const correlation = await this.calculateCorrelation(primaryPair, secondaryPair);
        correlations.push(correlation);
      }

      // Store correlation analysis
      await this.storeCorrelationAnalysis(correlations);

      return correlations;
    } catch (error) {
      console.error('Error analyzing market correlations:', error);
      throw new Error('Failed to analyze market correlations');
    }
  }

  /**
   * Predict market volatility
   */
  async predictVolatility(currencyPair: string, timeframe: string): Promise<VolatilityPrediction> {
    try {
      // Get historical volatility, market conditions, and news impact
      const [historicalVolatility, marketConditions, newsImpact] = await Promise.all([
        this.getHistoricalVolatility(currencyPair, timeframe),
        this.getMarketConditions(currencyPair),
        this.getNewsVolatilityImpact(currencyPair)
      ]);

      // Predict future volatility using machine learning models
      const volatilityPrediction = this.predictFutureVolatility(
        historicalVolatility,
        marketConditions,
        newsImpact
      );

      // Store volatility prediction
      await this.storeVolatilityPrediction(volatilityPrediction);

      return volatilityPrediction;
    } catch (error) {
      console.error('Error predicting volatility:', error);
      throw new Error('Failed to predict volatility');
    }
  }

  /**
   * Generate comprehensive AI insights
   */
  async generateAIInsights(currencyPair: string): Promise<AIInsight[]> {
    try {
      const insights: AIInsight[] = [];

      // Generate insights from all analysis types
      const [sentiment, risk, patterns, correlations, volatility] = await Promise.all([
        this.analyzeMarketSentiment(currencyPair),
        this.predictRisk(currencyPair, 'LONG', 0), // Will be updated with actual price
        this.recognizeBehavioralPatterns(currencyPair, '1D'),
        this.analyzeMarketCorrelations(currencyPair, ['EURUSD', 'GBPUSD', 'USDJPY']),
        this.predictVolatility(currencyPair, '1D')
      ]);

      // Create insights from analysis results
      insights.push(
        this.createInsight('SENTIMENT', currencyPair, sentiment),
        this.createInsight('RISK', currencyPair, risk),
        this.createInsight('PATTERN', currencyPair, patterns),
        this.createInsight('CORRELATION', currencyPair, correlations),
        this.createInsight('VOLATILITY', currencyPair, volatility)
      );

      // Store AI insights
      await this.storeAIInsights(insights);

      return insights;
    } catch (error) {
      console.error('Error generating AI insights:', error);
      throw new Error('Failed to generate AI insights');
    }
  }

  // Helper methods for sentiment analysis
  private async getNewsSentiment(currencyPair: string): Promise<number> {
    // Mock implementation - replace with actual news API integration
    return Math.random() * 2 - 1; // Returns value between -1 and 1
  }

  private async getTechnicalSentiment(currencyPair: string): Promise<number> {
    // Mock implementation - replace with actual technical analysis
    return Math.random() * 2 - 1;
  }

  private async getSocialSentiment(currencyPair: string): Promise<number> {
    // Mock implementation - replace with actual social media sentiment analysis
    return Math.random() * 2 - 1;
  }

  private calculateOverallSentiment(sentiments: Array<{ score: number; weight: number }>): { sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; confidence: number } {
    const weightedSum = sentiments.reduce((sum, item) => sum + item.score * item.weight, 0);
    const totalWeight = sentiments.reduce((sum, item) => sum + item.weight, 0);
    const averageSentiment = weightedSum / totalWeight;

    let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    if (averageSentiment > 0.2) sentiment = 'BULLISH';
    else if (averageSentiment < -0.2) sentiment = 'BEARISH';
    else sentiment = 'NEUTRAL';

    const confidence = Math.min(Math.abs(averageSentiment) * 100, 100);

    return { sentiment, confidence };
  }

  // Helper methods for risk prediction
  private async getMarketVolatility(currencyPair: string): Promise<{ level: string; value: number }> {
    // Mock implementation
    return { level: 'MEDIUM', value: 0.5 };
  }

  private async getMarketCorrelations(currencyPair: string): Promise<{ riskLevel: string }> {
    // Mock implementation
    return { riskLevel: 'LOW' };
  }

  private async getEconomicIndicators(currencyPair: string): Promise<{ overall: string }> {
    // Mock implementation
    return { overall: 'STABLE' };
  }

  private calculateRiskScore(factors: any): number {
    // Mock risk calculation - replace with actual algorithm
    return Math.random() * 100;
  }

  private getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score < 25) return 'LOW';
    if (score < 50) return 'MEDIUM';
    if (score < 75) return 'HIGH';
    return 'CRITICAL';
  }

  private generateRiskRecommendations(score: number, tradeType: string): string[] {
    const recommendations = [];
    
    if (score > 75) {
      recommendations.push('Consider reducing position size');
      recommendations.push('Implement strict stop-loss orders');
      recommendations.push('Monitor market conditions closely');
    } else if (score > 50) {
      recommendations.push('Use standard risk management');
      recommendations.push('Set reasonable stop-loss levels');
    } else {
      recommendations.push('Standard trading approach acceptable');
    }

    return recommendations;
  }

  private calculateConfidence(...factors: any[]): number {
    // Mock confidence calculation
    return Math.random() * 100;
  }

  // Helper methods for pattern recognition
  private async getHistoricalPrices(currencyPair: string, timeframe: string): Promise<any[]> {
    // Mock implementation
    return [];
  }

  private async getVolumePatterns(currencyPair: string, timeframe: string): Promise<any[]> {
    // Mock implementation
    return [];
  }

  private async getTechnicalIndicators(currencyPair: string, timeframe: string): Promise<any[]> {
    // Mock implementation
    return [];
  }

  private analyzePatterns(priceData: any[], volumeData: any[], indicatorData: any[]): BehavioralPattern[] {
    // Mock pattern analysis
    return [
      {
        pattern_type: 'TREND_FOLLOWING',
        confidence: 75,
        description: 'Strong uptrend with increasing volume',
        historical_accuracy: 0.8,
        suggested_action: 'Consider long positions with trend'
      }
    ];
  }

  // Helper methods for correlation analysis
  private async calculateCorrelation(pair1: string, pair2: string): Promise<MarketCorrelation> {
    // Mock correlation calculation
    const correlation = Math.random() * 2 - 1;
    
    return {
      pair1,
      pair2,
      correlation_coefficient: correlation,
      strength: Math.abs(correlation) > 0.7 ? 'STRONG' : Math.abs(correlation) > 0.4 ? 'MODERATE' : 'WEAK',
      direction: correlation > 0 ? 'POSITIVE' : 'NEGATIVE',
      confidence: Math.random() * 100
    };
  }

  // Helper methods for volatility prediction
  private async getHistoricalVolatility(currencyPair: string, timeframe: string): Promise<any> {
    // Mock implementation
    return { value: 0.5, trend: 'INCREASING' };
  }

  private async getMarketConditions(currencyPair: string): Promise<any> {
    // Mock implementation
    return { liquidity: 'HIGH', spread: 'LOW' };
  }

  private async getNewsVolatilityImpact(currencyPair: string): Promise<any> {
    // Mock implementation
    return { impact: 'MEDIUM', events: ['Economic data release'] };
  }

  private predictFutureVolatility(historical: any, conditions: any, news: any): VolatilityPrediction {
    // Mock volatility prediction
    return {
      expected_volatility: 'MEDIUM',
      probability: 65,
      timeframe: '24 hours',
      factors: ['Historical volatility trend', 'Market liquidity conditions', 'News event impact'],
      risk_implications: ['Moderate risk for short-term trades', 'Consider wider stop-loss levels']
    };
  }

  // Helper method for creating insights
  private createInsight(type: string, currencyPair: string, data: any): AIInsight {
    return {
      id: crypto.randomUUID(),
      type: type as any,
      currency_pair: currencyPair,
      insight: this.generateInsightText(type, data),
      confidence: data.confidence || 75,
      actionable: true,
      timestamp: new Date().toISOString(),
      metadata: data
    };
  }

  private generateInsightText(type: string, data: any): string {
    switch (type) {
      case 'SENTIMENT':
        return `Market sentiment is ${data.overall.toLowerCase()} with ${data.confidence}% confidence`;
      case 'RISK':
        return `Risk level is ${data.risk_level} with ${data.probability}% probability`;
      case 'PATTERN':
        return `Detected ${data[0]?.pattern_type.toLowerCase().replace('_', ' ')} pattern with ${data[0]?.confidence}% confidence`;
      case 'CORRELATION':
        return `Found ${data.length} significant correlations with other currency pairs`;
      case 'VOLATILITY':
        return `Expected volatility is ${data.expected_volatility.toLowerCase()} with ${data.probability}% probability`;
      default:
        return 'AI analysis completed successfully';
    }
  }

  // Database storage methods
  private async storeSentimentAnalysis(sentiment: MarketSentiment): Promise<void> {
    try {
      await this.supabase
        .from('ai_market_analysis')
        .insert({
          type: 'sentiment',
          currency_pair: sentiment.currency_pair,
          data: sentiment,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error storing sentiment analysis:', error);
    }
  }

  private async storeRiskPrediction(risk: RiskPrediction): Promise<void> {
    try {
      await this.supabase
        .from('ai_market_analysis')
        .insert({
          type: 'risk',
          currency_pair: 'GENERAL',
          data: risk,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error storing risk prediction:', error);
    }
  }

  private async storePatternRecognition(patterns: BehavioralPattern[]): Promise<void> {
    try {
      await this.supabase
        .from('ai_market_analysis')
        .insert({
          type: 'pattern',
          currency_pair: 'GENERAL',
          data: patterns,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error storing pattern recognition:', error);
    }
  }

  private async storeCorrelationAnalysis(correlations: MarketCorrelation[]): Promise<void> {
    try {
      await this.supabase
        .from('ai_market_analysis')
        .insert({
          type: 'correlation',
          currency_pair: 'GENERAL',
          data: correlations,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error storing correlation analysis:', error);
    }
  }

  private async storeVolatilityPrediction(volatility: VolatilityPrediction): Promise<void> {
    try {
      await this.supabase
        .from('ai_market_analysis')
        .insert({
          type: 'volatility',
          currency_pair: 'GENERAL',
          data: volatility,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error storing volatility prediction:', error);
    }
  }

  private async storeAIInsights(insights: AIInsight[]): Promise<void> {
    try {
      await this.supabase
        .from('ai_insights')
        .insert(insights.map(insight => ({
          id: insight.id,
          type: insight.type,
          currency_pair: insight.currency_pair,
          insight: insight.insight,
          confidence: insight.confidence,
          actionable: insight.actionable,
          created_at: insight.timestamp,
          metadata: insight.metadata
        })));
    } catch (error) {
      console.error('Error storing AI insights:', error);
    }
  }
}

// Export singleton instance
export const aiMarketAnalysis = new AIMarketAnalysisService();
export default aiMarketAnalysis;
