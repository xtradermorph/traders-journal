import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';
import { AIAnalysisResponse, TimeframeType } from '@/types/tda';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { analysis_id, answers, timeframe_analyses, selected_timeframes } = body;

    if (!analysis_id || !answers || !timeframe_analyses || !selected_timeframes) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    // Verify analysis ownership
    const { data: analysis, error: analysisError } = await supabase
      .from('top_down_analyses')
      .select('*')
      .eq('id', analysis_id)
      .eq('user_id', user.id)
      .single();

    if (analysisError || !analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Get questions for context
    const { data: questions, error: questionsError } = await supabase
      .from('tda_questions')
      .select('*')
      .eq('is_active', true)
      .order('timeframe, order_index');

    if (questionsError) {
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
    }

    // Fetch Alpha Vantage market data for enhanced AI analysis
    const alphaVantageData = await fetchAlphaVantageData(analysis.currency_pair);

    // Generate AI analysis with only selected timeframes and Alpha Vantage data
    const aiResponse = await generateAIAnalysis(answers, timeframe_analyses, questions, analysis.currency_pair, selected_timeframes, alphaVantageData);

    // Update analysis with AI results
    const { error: updateError } = await supabase
      .from('top_down_analyses')
      .update({
        status: 'COMPLETED',
        overall_probability: aiResponse.overall_probability,
        trade_recommendation: aiResponse.trade_recommendation,
        confidence_level: aiResponse.confidence_level,
        risk_level: aiResponse.risk_level,
        ai_summary: aiResponse.ai_summary,
        ai_reasoning: aiResponse.ai_reasoning,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', analysis_id);

    if (updateError) {
      console.error('Analysis update error:', updateError);
      return NextResponse.json({ error: 'Failed to update analysis' }, { status: 500 });
    }

    // Update timeframe analyses with AI breakdown - ONLY for selected timeframes
    for (const timeframe of selected_timeframes) {
      const breakdown = aiResponse.timeframe_breakdown[timeframe];
      const existingTimeframe = timeframe_analyses.find((t: Record<string, unknown>) => t.timeframe === timeframe);
      
      if (existingTimeframe && breakdown) {
        await supabase
          .from('tda_timeframe_analyses')
          .update({
            timeframe_probability: breakdown.probability,
            timeframe_sentiment: breakdown.sentiment,
            timeframe_strength: breakdown.strength,
            analysis_data: {
              ...existingTimeframe.analysis_data,
              ai_reasoning: breakdown.reasoning
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', existingTimeframe.id);
      }
    }

    // Log the completion
    await supabase
      .from('tda_analysis_history')
      .insert({
        analysis_id: analysis_id,
        action: 'COMPLETED',
        changes: {
          overall_probability: aiResponse.overall_probability,
          trade_recommendation: aiResponse.trade_recommendation,
          confidence_level: aiResponse.confidence_level,
          risk_level: aiResponse.risk_level
        },
        performed_by: user.id
      });

    return NextResponse.json({ 
      analysis: aiResponse,
      message: 'Analysis completed successfully'
    });

  } catch (error) {
    console.error('AI Analysis error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function fetchAlphaVantageData(currencyPair: string) {
  try {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      console.warn('Alpha Vantage API key not configured');
      return null;
    }

    // Fetch current market data
    const response = await fetch(
      `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${currencyPair.slice(0, 3)}&to_symbol=${currencyPair.slice(3, 6)}&apikey=${apiKey}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Alpha Vantage data');
    }

    const data = await response.json();
    
    // Extract relevant market data
    const timeSeriesData = data['Time Series FX (Daily)'];
    if (!timeSeriesData) {
      return null;
    }

    const dates = Object.keys(timeSeriesData).sort().reverse();
    const latestData = timeSeriesData[dates[0]];
    const previousData = timeSeriesData[dates[1]];

    return {
      currentPrice: parseFloat(latestData['4. close']),
      previousPrice: parseFloat(previousData['4. close']),
      dailyChange: parseFloat(latestData['4. close']) - parseFloat(previousData['4. close']),
      dailyChangePercent: ((parseFloat(latestData['4. close']) - parseFloat(previousData['4. close'])) / parseFloat(previousData['4. close'])) * 100,
      high: parseFloat(latestData['2. high']),
      low: parseFloat(latestData['3. low']),
      volume: parseFloat(latestData['5. volume']),
      marketTrend: parseFloat(latestData['4. close']) > parseFloat(previousData['4. close']) ? 'BULLISH' : 'BEARISH'
    };
  } catch (error) {
    console.error('Alpha Vantage fetch error:', error);
    return null;
  }
}

async function generateAIAnalysis(
  answers: Record<string, unknown>[],
  timeframeAnalyses: Record<string, unknown>[],
  questions: Record<string, unknown>[],
  currencyPair: string,
  selectedTimeframes: TimeframeType[],
  alphaVantageData?: any
): Promise<AIAnalysisResponse> {
  // Use OpenAI for real AI analysis
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Fallback to algorithm if no API key
    console.warn("No OpenAI API key found, using algorithm fallback");
    return generateAlgorithmAnalysis(answers, timeframeAnalyses, questions, currencyPair, selectedTimeframes, alphaVantageData);
  }

  try {
    // Use Alpha Vantage data if available, otherwise fetch market data
    const marketData = alphaVantageData || await fetchMarketData(currencyPair);
    
    // Prepare data for OpenAI - only include selected timeframes
    const analysisData = {
      currencyPair,
      selectedTimeframes,
      marketData,
      answers: answers.map(a => ({
        question: questions.find(q => q.id === a.question_id)?.question_text || 'Unknown',
        answer: a.answer_text || a.answer_value,
        timeframe: questions.find(q => q.id === a.question_id)?.timeframe || 'Unknown'
      })).filter(a => selectedTimeframes.includes(a.timeframe as TimeframeType)),
      timeframeAnalyses: timeframeAnalyses
        .filter(t => selectedTimeframes.includes(t.timeframe as TimeframeType))
        .map(t => ({
          timeframe: t.timeframe,
          analysis: t.analysis_data
        }))
    };

    const prompt = `You are a professional forex trading analyst performing a comprehensive top-down analysis for ${currencyPair}.

ANALYSIS CONTEXT:
- Currency Pair: ${currencyPair}
- Selected Timeframes: ${selectedTimeframes.join(', ')}
- Analysis Date: ${new Date().toISOString().split('T')[0]}

USER ANALYSIS DATA:
${JSON.stringify(analysisData, null, 2)}

ALPHA VANTAGE MARKET DATA:
${alphaVantageData ? JSON.stringify(alphaVantageData, null, 2) : 'Market data unavailable'}

TASK: Provide a comprehensive trading analysis based on the user's timeframe analysis and real-time Alpha Vantage market data.

ANALYSIS REQUIREMENTS:
1. Technical Analysis: Analyze user's technical assessment across selected timeframes
2. Market Sentiment: Evaluate current market sentiment based on user answers and Alpha Vantage news sentiment
3. Technical Indicators: Incorporate RSI, MACD, and Moving Average data from Alpha Vantage
4. Risk-Reward Assessment: Calculate potential risk-reward ratios using market volatility data
5. Entry/Exit Strategy: Provide specific entry and exit recommendations with price levels
6. Risk Management: Suggest position sizing and stop-loss levels based on market conditions
7. Market Volatility: Consider current volatility levels for position sizing recommendations
8. Support/Resistance: Use technical analysis to identify key levels

Please provide a JSON response with the following structure:
{
  "overall_probability": number (0-100),
  "trade_recommendation": "LONG" | "SHORT" | "NEUTRAL" | "AVOID",
  "confidence_level": number (0-100),
  "risk_level": "LOW" | "MEDIUM" | "HIGH",
  "ai_summary": "executive summary with key insights and actionable recommendations",
  "ai_reasoning": "detailed reasoning including technical analysis, market sentiment, and risk assessment",
  "risk_reward_ratio": number (e.g., 1.5, 2.0, etc.),
  "entry_strategy": "specific entry recommendations with price levels",
  "exit_strategy": "specific exit recommendations with profit targets and stop losses",
  "position_sizing": "recommended position size based on risk assessment and volatility",
  "market_sentiment": "overall market sentiment analysis from Alpha Vantage news",
  "technical_indicators": "analysis of RSI, MACD, and other technical indicators",
  "market_volatility": "current market volatility assessment",
  "support_resistance": "key support and resistance levels identified",
  "timeframe_breakdown": {
    ${selectedTimeframes.map(tf => `"${tf}": {
      "probability": number,
      "sentiment": "BULLISH"|"BEARISH"|"NEUTRAL",
      "strength": number,
      "reasoning": "detailed reasoning for this timeframe",
      "key_levels": "support/resistance levels identified",
      "technical_analysis": "technical analysis summary incorporating Alpha Vantage data"
    }`).join(',\n    ')}
  }
}

IMPORTANT ANALYSIS GUIDELINES:
- Only analyze the timeframes that the user selected: ${selectedTimeframes.join(', ')}
- Incorporate Alpha Vantage technical indicators (RSI, MACD, Moving Averages) in your analysis
- Consider market sentiment from recent news and economic events
- Factor in current market volatility for position sizing recommendations
- Use real-time exchange rates and bid/ask spreads for accurate price analysis
- Provide specific price levels for entry, stop-loss, and take-profit based on technical analysis
- Consider market conditions (volatility, trend strength) for risk assessment

Respond only with valid JSON.`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are an expert forex trading analyst with deep knowledge of technical analysis, market sentiment, and risk management. Provide comprehensive, actionable trading analysis based on user input and market data. Respond only with valid JSON." },
          { role: "user", content: prompt },
        ],
        max_tokens: 2000,
        temperature: 0.2,
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.json();
      console.error("OpenAI API error:", err);
      // Fallback to algorithm
      return generateAlgorithmAnalysis(answers, timeframeAnalyses, questions, currencyPair, selectedTimeframes);
    }

    const openaiData = await openaiRes.json();
    const responseText = openaiData.choices?.[0]?.message?.content || "{}";
    
    try {
      const analysis = JSON.parse(responseText);
      return analysis as AIAnalysisResponse;
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", parseError);
      // Fallback to algorithm
      return generateAlgorithmAnalysis(answers, timeframeAnalyses, questions, currencyPair, selectedTimeframes);
    }
  } catch (error) {
    console.error("OpenAI analysis error:", error);
    // Fallback to algorithm
    return generateAlgorithmAnalysis(answers, timeframeAnalyses, questions, currencyPair, selectedTimeframes);
  }
}

// Fetch market data from Alpha Vantage API
async function fetchMarketData(currencyPair: string) {
  const ALPHA_VANTAGE_API_KEY = 'UYIBL618VPL93Z0X';
  const baseCurrency = currencyPair.substring(0, 3);
  const quoteCurrency = currencyPair.substring(3, 6);
  
  try {
    // Fetch multiple data points from Alpha Vantage
    const [forexData, technicalData, sentimentData] = await Promise.allSettled([
      // Real-time forex data
      fetch(`https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${baseCurrency}&to_currency=${quoteCurrency}&apikey=${ALPHA_VANTAGE_API_KEY}`),
      
      // Technical indicators (RSI, MACD, Moving Averages)
      fetch(`https://www.alphavantage.co/query?function=TECHNICAL_INDICATORS&symbol=${baseCurrency}${quoteCurrency}&interval=daily&time_period=14&series_type=close&apikey=${ALPHA_VANTAGE_API_KEY}`),
      
      // Market sentiment (News and Sentiment)
      fetch(`https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${baseCurrency}${quoteCurrency}&apikey=${ALPHA_VANTAGE_API_KEY}`)
    ]);

    const marketData: any = {
      currency_pair: currencyPair,
      base_currency: baseCurrency,
      quote_currency: quoteCurrency,
      timestamp: new Date().toISOString(),
      source: 'Alpha Vantage',
      data_points: {}
    };

    // Process forex data
    if (forexData.status === 'fulfilled' && forexData.value.ok) {
      const forexResult = await forexData.value.json();
      if (forexResult['Realtime Currency Exchange Rate']) {
        const rate = forexResult['Realtime Currency Exchange Rate'];
        marketData.data_points.forex = {
          exchange_rate: rate['5. Exchange Rate'],
          last_refreshed: rate['6. Last Refreshed'],
          time_zone: rate['7. Time Zone'],
          bid_price: rate['8. Bid Price'],
          ask_price: rate['9. Ask Price']
        };
      }
    }

    // Process technical indicators
    if (technicalData.status === 'fulfilled' && technicalData.value.ok) {
      const technicalResult = await technicalData.value.json();
      
      // RSI
      if (technicalResult['Technical Analysis: RSI']) {
        const rsiData = technicalResult['Technical Analysis: RSI'];
        const latestRSI = Object.values(rsiData)[0] as any;
        marketData.data_points.rsi = {
          value: latestRSI?.RSI,
          interpretation: getRSIInterpretation(parseFloat(latestRSI?.RSI || '50'))
        };
      }
      
      // MACD
      if (technicalResult['Technical Analysis: MACD']) {
        const macdData = technicalResult['Technical Analysis: MACD'];
        const latestMACD = Object.values(macdData)[0] as any;
        marketData.data_points.macd = {
          macd: latestMACD?.MACD,
          macd_signal: latestMACD?.MACD_Signal,
          macd_hist: latestMACD?.MACD_Hist,
          interpretation: getMACDInterpretation(latestMACD?.MACD_Hist)
        };
      }
      
      // Moving Averages
      if (technicalResult['Technical Analysis: SMA']) {
        const smaData = technicalResult['Technical Analysis: SMA'];
        const latestSMA = Object.values(smaData)[0] as any;
        marketData.data_points.sma = {
          value: latestSMA?.SMA,
          trend: getMovingAverageTrend(latestSMA?.SMA)
        };
      }
    }

    // Process market sentiment
    if (sentimentData.status === 'fulfilled' && sentimentData.value.ok) {
      const sentimentResult = await sentimentData.value.json();
      if (sentimentResult.feed && sentimentResult.feed.length > 0) {
        const recentNews = sentimentResult.feed.slice(0, 5);
        const overallSentiment = calculateOverallSentiment(recentNews);
        
        marketData.data_points.sentiment = {
          overall_sentiment: overallSentiment,
          news_count: recentNews.length,
          recent_news: recentNews.map((news: any) => ({
            title: news.title,
            summary: news.summary,
            sentiment_score: news.overall_sentiment_score,
            sentiment_label: news.overall_sentiment_label,
            time_published: news.time_published
          }))
        };
      }
    }

    // Add market volatility and trend analysis
    marketData.data_points.market_analysis = {
      volatility: calculateVolatility(marketData.data_points),
      trend_strength: calculateTrendStrength(marketData.data_points),
      support_resistance: estimateSupportResistance(marketData.data_points),
      market_condition: getMarketCondition(marketData.data_points)
    };

    return marketData;

  } catch (error) {
    console.warn('Failed to fetch Alpha Vantage data:', error);
    
    // Fallback to basic market data
    return {
      currency_pair: currencyPair,
      base_currency: baseCurrency,
      quote_currency: quoteCurrency,
      timestamp: new Date().toISOString(),
      source: 'Fallback',
      note: 'Alpha Vantage data unavailable, using default values',
      data_points: {
        forex: {
          exchange_rate: '1.0000',
          last_refreshed: new Date().toISOString(),
          time_zone: 'UTC'
        },
        market_analysis: {
          volatility: 'MEDIUM',
          trend_strength: 'NEUTRAL',
          market_condition: 'NORMAL'
        }
      }
    };
  }
}

// Helper functions for technical analysis
function getRSIInterpretation(rsi: number): string {
  if (rsi >= 70) return 'OVERBOUGHT - Potential reversal to downside';
  if (rsi <= 30) return 'OVERSOLD - Potential reversal to upside';
  if (rsi > 50) return 'BULLISH - Momentum favors upside';
  return 'BEARISH - Momentum favors downside';
}

function getMACDInterpretation(histogram: string): string {
  const hist = parseFloat(histogram || '0');
  if (hist > 0) return 'BULLISH - MACD above signal line';
  if (hist < 0) return 'BEARISH - MACD below signal line';
  return 'NEUTRAL - MACD at signal line';
}

function getMovingAverageTrend(sma: string): string {
  // This would need historical data for proper trend calculation
  // For now, return neutral
  return 'NEUTRAL';
}

function calculateOverallSentiment(news: any[]): string {
  if (!news || news.length === 0) return 'NEUTRAL';
  
  const sentimentScores = news.map(item => {
    const score = parseFloat(item.overall_sentiment_score || '0');
    if (score > 0.1) return 'POSITIVE';
    if (score < -0.1) return 'NEGATIVE';
    return 'NEUTRAL';
  });
  
  const positiveCount = sentimentScores.filter(s => s === 'POSITIVE').length;
  const negativeCount = sentimentScores.filter(s => s === 'NEGATIVE').length;
  
  if (positiveCount > negativeCount) return 'BULLISH';
  if (negativeCount > positiveCount) return 'BEARISH';
  return 'NEUTRAL';
}

function calculateVolatility(dataPoints: any): string {
  // Simple volatility calculation based on available data
  if (dataPoints.rsi && dataPoints.macd) {
    const rsi = parseFloat(dataPoints.rsi.value || '50');
    const macdHist = parseFloat(dataPoints.macd.macd_hist || '0');
    
    if (Math.abs(rsi - 50) > 20 || Math.abs(macdHist) > 0.01) {
      return 'HIGH';
    }
  }
  return 'MEDIUM';
}

function calculateTrendStrength(dataPoints: any): string {
  if (dataPoints.rsi && dataPoints.macd) {
    const rsi = parseFloat(dataPoints.rsi.value || '50');
    const macdHist = parseFloat(dataPoints.macd.macd_hist || '0');
    
    if ((rsi > 60 && macdHist > 0) || (rsi < 40 && macdHist < 0)) {
      return 'STRONG';
    }
  }
  return 'WEAK';
}

function estimateSupportResistance(dataPoints: any): any {
  // This would need historical price data for accurate levels
  // For now, provide estimated levels based on current data
  return {
    support_levels: ['Estimated support based on current analysis'],
    resistance_levels: ['Estimated resistance based on current analysis'],
    note: 'Levels are estimates based on available technical data'
  };
}

function getMarketCondition(dataPoints: any): string {
  if (dataPoints.sentiment && dataPoints.sentiment.overall_sentiment === 'BULLISH') {
    return 'BULLISH';
  }
  if (dataPoints.sentiment && dataPoints.sentiment.overall_sentiment === 'BEARISH') {
    return 'BEARISH';
  }
  return 'NEUTRAL';
}

// Fallback algorithm analysis (updated to only use selected timeframes)
function generateAlgorithmAnalysis(
  answers: Record<string, unknown>[],
  timeframeAnalyses: Record<string, unknown>[],
  questions: Record<string, unknown>[],
  currencyPair: string,
  selectedTimeframes: TimeframeType[],
  alphaVantageData?: any
): AIAnalysisResponse {
  
  // Initialize only selected timeframes with default values
  const timeframeScores: Record<TimeframeType, number> = {} as Record<TimeframeType, number>;
  const timeframeSentiments: Record<TimeframeType, 'BULLISH' | 'BEARISH' | 'NEUTRAL'> = {} as Record<TimeframeType, 'BULLISH' | 'BEARISH' | 'NEUTRAL'>;
  const timeframeStrengths: Record<TimeframeType, number> = {} as Record<TimeframeType, number>;
  const timeframeReasonings: Record<TimeframeType, string> = {} as Record<TimeframeType, string>;

  // Initialize only selected timeframes
  selectedTimeframes.forEach(timeframe => {
    timeframeScores[timeframe] = 50;
    timeframeSentiments[timeframe] = 'NEUTRAL';
    timeframeStrengths[timeframe] = 0;
    timeframeReasonings[timeframe] = '';
  });

  // Analyze each selected timeframe
  for (const timeframe of selectedTimeframes) {
    const timeframeAnswers = answers.filter(a => {
      const question = questions.find(q => q.id === a.question_id);
      return question?.timeframe === timeframe;
    });

    const analysis = analyzeTimeframe(timeframe, timeframeAnswers, questions);
    timeframeScores[timeframe] = analysis.score;
    timeframeSentiments[timeframe] = analysis.sentiment;
    timeframeStrengths[timeframe] = analysis.strength;
    timeframeReasonings[timeframe] = analysis.reasoning;
  }

  // Calculate overall probability using weighted average based on selected timeframes
  const timeframeWeights: Record<TimeframeType, number> = {
    DAILY: 0.4, W1: 0.25, H4: 0.2, H1: 0.1, M15: 0.05,
    H8: 0.15, H2: 0.15, M30: 0.08, M10: 0.03, MN1: 0.3
  };

  let totalWeight = 0;
  let weightedSum = 0;

  selectedTimeframes.forEach(timeframe => {
    const weight = timeframeWeights[timeframe] || 0.1;
    totalWeight += weight;
    weightedSum += timeframeScores[timeframe] * weight;
  });

  let overallProbability = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 50;

  // Determine trade recommendation
  let tradeRecommendation: 'LONG' | 'SHORT' | 'NEUTRAL' | 'AVOID';
  let confidenceLevel: number;
  let riskLevel: string;

  if (overallProbability >= 75) {
    tradeRecommendation = timeframeSentiments.DAILY === 'BULLISH' ? 'LONG' : 'SHORT';
    confidenceLevel = Math.min(95, overallProbability + 10);
    riskLevel = 'LOW';
  } else if (overallProbability >= 60) {
    tradeRecommendation = timeframeSentiments.DAILY === 'BULLISH' ? 'LONG' : 'SHORT';
    confidenceLevel = overallProbability;
    riskLevel = 'MEDIUM';
  } else if (overallProbability >= 45) {
    tradeRecommendation = 'NEUTRAL';
    confidenceLevel = overallProbability;
    riskLevel = 'MEDIUM';
  } else {
    tradeRecommendation = 'AVOID';
    confidenceLevel = 100 - overallProbability;
    riskLevel = 'HIGH';
  }

  // Enhance metrics with Alpha Vantage data if available
  if (alphaVantageData) {
    const marketAlignment = calculateMarketAlignment(timeframeSentiments, alphaVantageData);
    
    // Adjust probability based on market alignment
    if (marketAlignment > 0.7) {
      overallProbability = Math.min(100, overallProbability + 10);
    } else if (marketAlignment < 0.3) {
      overallProbability = Math.max(0, overallProbability - 10);
    }

    // Adjust confidence based on market volatility
    const volatility = Math.abs(alphaVantageData.dailyChangePercent);
    if (volatility > 2) {
      confidenceLevel = Math.max(0, confidenceLevel - 15);
      riskLevel = 'HIGH';
    } else if (volatility < 0.5) {
      confidenceLevel = Math.min(100, confidenceLevel + 10);
      riskLevel = 'LOW';
    }
  }

  // Generate enhanced AI summary and reasoning
  const aiSummary = generateEnhancedSummary(currencyPair, overallProbability, tradeRecommendation, timeframeSentiments, selectedTimeframes);
  const aiReasoning = generateEnhancedReasoning(timeframeScores, timeframeSentiments, timeframeReasonings, selectedTimeframes);

  // Build timeframe breakdown only for selected timeframes
  const timeframeBreakdown: Record<TimeframeType, any> = {} as Record<TimeframeType, any>;
  selectedTimeframes.forEach(timeframe => {
    timeframeBreakdown[timeframe] = {
      probability: timeframeScores[timeframe],
      sentiment: timeframeSentiments[timeframe],
      strength: timeframeStrengths[timeframe],
      reasoning: timeframeReasonings[timeframe]
    };
  });

  return {
    overall_probability: overallProbability,
    trade_recommendation: tradeRecommendation,
    confidence_level: confidenceLevel,
    risk_level: riskLevel,
    ai_summary: aiSummary,
    ai_reasoning: aiReasoning,
    risk_reward_ratio: calculateRiskRewardRatio(overallProbability, riskLevel),
    entry_strategy: generateEntryStrategy(tradeRecommendation, timeframeScores, selectedTimeframes),
    exit_strategy: generateExitStrategy(tradeRecommendation, timeframeScores, selectedTimeframes),
    position_sizing: generatePositionSizing(riskLevel, overallProbability),
    market_sentiment: generateMarketSentiment(timeframeSentiments, selectedTimeframes),
    technical_indicators: generateTechnicalIndicators(answers, questions, selectedTimeframes),
    timeframe_breakdown: timeframeBreakdown
  };
}

function calculateMarketAlignment(timeframeSentiments: Record<TimeframeType, string>, alphaVantageData: any) {
  if (!alphaVantageData) return 0.5;

  const marketTrend = alphaVantageData.marketTrend;
  const bullishTimeframes = Object.values(timeframeSentiments).filter(sentiment => sentiment === 'BULLISH').length;
  const bearishTimeframes = Object.values(timeframeSentiments).filter(sentiment => sentiment === 'BEARISH').length;
  const totalTimeframes = Object.keys(timeframeSentiments).length;

  if (totalTimeframes === 0) return 0.5;

  const analysisTrend = bullishTimeframes > bearishTimeframes ? 'BULLISH' : 'BEARISH';
  
  if (marketTrend === analysisTrend) {
    return Math.max(0.7, (Math.max(bullishTimeframes, bearishTimeframes) / totalTimeframes));
  } else {
    return Math.min(0.3, (Math.min(bullishTimeframes, bearishTimeframes) / totalTimeframes));
  }
}

function analyzeTimeframe(timeframe: TimeframeType, answers: Record<string, unknown>[], questions: Record<string, unknown>[]): {
  score: number;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength: number;
  reasoning: string;
} {
  let score = 50; // Start neutral
  let bullishSignals = 0;
  let bearishSignals = 0;
  let totalSignals = 0;
  const reasoning: string[] = [];

  for (const answer of answers) {
    const question = questions.find(q => q.id === answer.question_id);
    if (!question) continue;

    totalSignals++;
    const answerValue = answer.answer_text || answer.answer_value;

    switch (question.question_type) {
      case 'MULTIPLE_CHOICE':
        if (answerValue === 'Bullish') {
          bullishSignals++;
          score += 15;
          reasoning.push(`Strong bullish signal from ${question.question_text}`);
        } else if (answerValue === 'Bearish') {
          bearishSignals++;
          score -= 15;
          reasoning.push(`Strong bearish signal from ${question.question_text}`);
        } else if (answerValue === 'Sideways') {
          score -= 5;
          reasoning.push(`Neutral/sideways signal from ${question.question_text}`);
        }
        break;

      case 'RATING':
        const rating = parseInt(String(answerValue));
        if (rating >= 4) {
          bullishSignals++;
          score += 10;
          reasoning.push(`High confidence (${rating}/5) in ${question.question_text}`);
        } else if (rating <= 2) {
          bearishSignals++;
          score -= 10;
          reasoning.push(`Low confidence (${rating}/5) in ${question.question_text}`);
        }
        break;

      case 'BOOLEAN':
        if (answerValue === true || answerValue === 'true' || answerValue === 'yes') {
          bullishSignals++;
          score += 8;
          reasoning.push(`Positive confirmation for ${question.question_text}`);
        } else {
          bearishSignals++;
          score -= 8;
          reasoning.push(`Negative confirmation for ${question.question_text}`);
        }
        break;

      case 'TEXT':
        // Simple sentiment analysis for text answers
        const text = String(answerValue).toLowerCase() || '';
        if (text.includes('bullish') || text.includes('strong') || text.includes('support')) {
          bullishSignals++;
          score += 5;
          reasoning.push(`Positive text analysis: ${text.substring(0, 50)}...`);
        } else if (text.includes('bearish') || text.includes('weak') || text.includes('resistance')) {
          bearishSignals++;
          score -= 5;
          reasoning.push(`Negative text analysis: ${text.substring(0, 50)}...`);
        }
        break;
    }
  }

  // Normalize score to 0-100 range
  score = Math.max(0, Math.min(100, score));

  // Determine sentiment
  let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  if (bullishSignals > bearishSignals && score > 55) {
    sentiment = 'BULLISH';
  } else if (bearishSignals > bullishSignals && score < 45) {
    sentiment = 'BEARISH';
  } else {
    sentiment = 'NEUTRAL';
  }

  // Calculate strength based on signal consistency
  const strength = totalSignals > 0 ? Math.min(100, (Math.max(bullishSignals, bearishSignals) / totalSignals) * 100) : 0;

  return {
    score,
    sentiment,
    strength,
    reasoning: reasoning.join('; ')
  };
}

function generateSummary(
  currencyPair: string,
  probability: number,
  recommendation: string,
  sentiments: Record<TimeframeType, string>
): string {
  const sentimentText = recommendation === 'LONG' ? 'bullish' : 
                       recommendation === 'SHORT' ? 'bearish' : 'neutral';

  return `Top Down Analysis for ${currencyPair} shows a ${probability.toFixed(1)}% probability of a ${sentimentText} move. ` +
         `Key timeframes: Daily (${sentiments.DAILY.toLowerCase()}), Weekly (${sentiments.W1.toLowerCase()}), 4H (${sentiments.H4.toLowerCase()}), 1H (${sentiments.H1.toLowerCase()}), 15M (${sentiments.M15.toLowerCase()}). ` +
         `Recommendation: ${recommendation === 'AVOID' ? 'Avoid trading at this time' : `Consider ${recommendation.toLowerCase()} position`}.`;
}

function generateReasoning(
  scores: Record<TimeframeType, number>,
  sentiments: Record<TimeframeType, string>,
  reasonings: Record<TimeframeType, string>
): string {
  return `Analysis breakdown: Daily timeframe (${scores.DAILY.toFixed(1)}% probability, ${sentiments.DAILY.toLowerCase()}) - ${reasonings.DAILY}. ` +
         `Weekly timeframe (${scores.W1.toFixed(1)}% probability, ${sentiments.W1.toLowerCase()}) - ${reasonings.W1}. ` +
         `4H timeframe (${scores.H4.toFixed(1)}% probability, ${sentiments.H4.toLowerCase()}) - ${reasonings.H4}. ` +
         `1H timeframe (${scores.H1.toFixed(1)}% probability, ${sentiments.H1.toLowerCase()}) - ${reasonings.H1}. ` +
         `15M timeframe (${scores.M15.toFixed(1)}% probability, ${sentiments.M15.toLowerCase()}) - ${reasonings.M15}. ` +
         `The weighted analysis prioritizes larger timeframes for trend direction and smaller timeframes for entry timing.`;
} 

function generateEnhancedSummary(
  currencyPair: string,
  probability: number,
  recommendation: string,
  sentiments: Record<TimeframeType, string>,
  selectedTimeframes: TimeframeType[]
): string {
  const sentimentText = recommendation === 'LONG' ? 'bullish' : 
                       recommendation === 'SHORT' ? 'bearish' : 'neutral';

  const timeframeSentimentsText = selectedTimeframes.map(tf => `${tf.toLowerCase()}: ${sentiments[tf].toLowerCase()}`).join(', ');

  return `Top Down Analysis for ${currencyPair} shows a ${probability.toFixed(1)}% probability of a ${sentimentText} move. ` +
         `Key timeframes: ${timeframeSentimentsText}. ` +
         `Recommendation: ${recommendation === 'AVOID' ? 'Avoid trading at this time' : `Consider ${recommendation.toLowerCase()} position`}.`;
}

function generateEnhancedReasoning(
  scores: Record<TimeframeType, number>,
  sentiments: Record<TimeframeType, string>,
  reasonings: Record<TimeframeType, string>,
  selectedTimeframes: TimeframeType[]
): string {
  const timeframeBreakdownText = selectedTimeframes.map(tf => `${tf.toLowerCase()}: ${reasonings[tf]}`).join('; ');

  return `Analysis breakdown: ${timeframeBreakdownText}. ` +
         `The weighted analysis prioritizes larger timeframes for trend direction and smaller timeframes for entry timing.`;
}

function calculateRiskRewardRatio(probability: number, riskLevel: string): number {
  if (riskLevel === 'LOW') return 1.5;
  if (riskLevel === 'MEDIUM') return 2.0;
  if (riskLevel === 'HIGH') return 3.0;
  return 1.0; // Default
}

function generateEntryStrategy(
  recommendation: string,
  scores: Record<TimeframeType, number>,
  selectedTimeframes: TimeframeType[]
): string {
  const timeframeScoresText = selectedTimeframes.map(tf => `${tf.toLowerCase()}: ${scores[tf].toFixed(1)}%`).join(', ');

  if (recommendation === 'AVOID') {
    return 'Avoid trading at this time due to high risk and low probability.';
  }

  const primaryTimeframe = selectedTimeframes.find(tf => scores[tf] > 60);
  if (primaryTimeframe) {
    return `Entry strategy for ${primaryTimeframe.toLowerCase()}: ${recommendation.toLowerCase()} position. ` +
           `Expect a ${recommendation.toLowerCase()} move with a potential reward of ${calculateRiskRewardRatio(scores[primaryTimeframe], 'MEDIUM')}x risk. ` +
           `Key levels: Support and resistance levels identified from analysis.`;
  }

  return `Entry strategy: ${recommendation.toLowerCase()} position. ` +
         `Expect a ${recommendation.toLowerCase()} move. ` +
         `Key levels: Support and resistance levels identified from analysis.`;
}

function generateExitStrategy(
  recommendation: string,
  scores: Record<TimeframeType, number>,
  selectedTimeframes: TimeframeType[]
): string {
  const timeframeScoresText = selectedTimeframes.map(tf => `${tf.toLowerCase()}: ${scores[tf].toFixed(1)}%`).join(', ');

  if (recommendation === 'AVOID') {
    return 'No specific exit strategy for AVOID recommendation.';
  }

  const primaryTimeframe = selectedTimeframes.find(tf => scores[tf] > 60);
  if (primaryTimeframe) {
    return `Exit strategy for ${primaryTimeframe.toLowerCase()}: ` +
           `Take profit at ${calculateRiskRewardRatio(scores[primaryTimeframe], 'MEDIUM')}x risk. ` +
           `Stop loss at support/resistance levels.`;
  }

  return `Exit strategy: ` +
         `Take profit at ${calculateRiskRewardRatio(scores.DAILY || 50, 'MEDIUM')}x risk. ` +
         `Stop loss at support/resistance levels.`;
}

function generatePositionSizing(riskLevel: string, probability: number): string {
  if (riskLevel === 'LOW') {
    return `Position sizing: Risk 1% of account per trade.`;
  }
  if (riskLevel === 'MEDIUM') {
    return `Position sizing: Risk 0.5% of account per trade.`;
  }
  if (riskLevel === 'HIGH') {
    return `Position sizing: Risk 0.2% of account per trade.`;
  }
  return `Position sizing: Risk 1% of account per trade.`; // Default
}

function generateMarketSentiment(
  sentiments: Record<TimeframeType, string>,
  selectedTimeframes: TimeframeType[]
): string {
  const timeframeSentimentsText = selectedTimeframes.map(tf => `${tf.toLowerCase()}: ${sentiments[tf].toLowerCase()}`).join(', ');

  return `Overall market sentiment: ${timeframeSentimentsText}. ` +
         `The analysis prioritizes larger timeframes for trend direction and smaller timeframes for entry timing.`;
}

function generateTechnicalIndicators(
  answers: Record<string, unknown>[],
  questions: Record<string, unknown>[],
  selectedTimeframes: TimeframeType[]
): string {
  const technicalIndicators: string[] = [];
  const uniqueIndicators = new Set<string>();

  answers.forEach(answer => {
    const question = questions.find(q => q.id === answer.question_id);
    if (!question) return;

    if (question.question_type === 'MULTIPLE_CHOICE' && answer.answer_value === 'Bullish') {
      uniqueIndicators.add('Bullish momentum');
    } else if (question.question_type === 'MULTIPLE_CHOICE' && answer.answer_value === 'Bearish') {
      uniqueIndicators.add('Bearish momentum');
    } else if (question.question_type === 'RATING' && parseInt(String(answer.answer_value)) >= 4) {
      uniqueIndicators.add('High confidence');
    } else if (question.question_type === 'BOOLEAN' && (answer.answer_value === true || answer.answer_value === 'true' || answer.answer_value === 'yes')) {
      uniqueIndicators.add('Positive confirmation');
    } else if (question.question_type === 'TEXT' && (String(answer.answer_value).toLowerCase().includes('bullish') || String(answer.answer_value).toLowerCase().includes('strong') || String(answer.answer_value).toLowerCase().includes('support'))) {
      uniqueIndicators.add('Positive text analysis');
    } else if (question.question_type === 'TEXT' && (String(answer.answer_value).toLowerCase().includes('bearish') || String(answer.answer_value).toLowerCase().includes('weak') || String(answer.answer_value).toLowerCase().includes('resistance'))) {
      uniqueIndicators.add('Negative text analysis');
    }
  });

  if (uniqueIndicators.size === 0) {
    return 'No specific technical indicators identified.';
  }

  return `Technical indicators: ${Array.from(uniqueIndicators).join(', ')}.`;
} 