import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { analysisId, currencyPair } = body;

    if (!analysisId || !currencyPair) {
      return NextResponse.json({ error: 'Analysis ID and currency pair are required' }, { status: 400 });
    }

    // Fetch existing TDA analysis data
    const { data: analysis, error: analysisError } = await supabase
      .from('top_down_analyses')
      .select('*')
      .eq('id', analysisId)
      .eq('user_id', user.id)
      .single();

    if (analysisError || !analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Fetch timeframe analyses
    const { data: timeframeAnalyses, error: timeframeError } = await supabase
      .from('tda_timeframe_analyses')
      .select('*')
      .eq('analysis_id', analysisId);

    if (timeframeError) {
      return NextResponse.json({ error: 'Failed to fetch timeframe analyses' }, { status: 500 });
    }

    // Fetch Alpha Vantage market data
    const alphaVantageData = await fetchAlphaVantageData(currencyPair);

    // Generate enhanced reasoning with external data
    const enhancedReasoning = await generateEnhancedReasoning(timeframeAnalyses, alphaVantageData, currencyPair);

    // Calculate updated metrics considering external data
    const updatedMetrics = calculateUpdatedMetrics(analysis, timeframeAnalyses, alphaVantageData);

    return NextResponse.json({
      enhancedReasoning,
      updatedMetrics
    });

  } catch (error) {
    console.error('Enhanced analysis error:', error);
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

    // Calculate additional market metrics
    const currentPrice = parseFloat(latestData['4. close']);
    const previousPrice = parseFloat(previousData['4. close']);
    const dailyChange = currentPrice - previousPrice;
    const dailyChangePercent = (dailyChange / previousPrice) * 100;
    const high = parseFloat(latestData['2. high']);
    const low = parseFloat(latestData['3. low']);
    const volume = parseFloat(latestData['5. volume']);
    const marketTrend = currentPrice > previousPrice ? 'BULLISH' : 'BEARISH';

    // Calculate volatility and momentum
    const volatility = Math.abs(dailyChangePercent);
    const momentum = dailyChangePercent > 0 ? 'positive' : 'negative';
    const strength = Math.abs(dailyChangePercent) > 1 ? 'strong' : Math.abs(dailyChangePercent) > 0.5 ? 'moderate' : 'weak';

    // Generate market sentiment description
    let marketSentiment = '';
    if (volatility > 2) {
      marketSentiment = `The market is experiencing high volatility with a ${strength} ${momentum} momentum.`;
    } else if (volatility > 1) {
      marketSentiment = `Moderate volatility observed with ${momentum} price movement.`;
    } else {
      marketSentiment = `Low volatility environment with minimal price movement.`;
    }

    return {
      currentPrice,
      previousPrice,
      dailyChange,
      dailyChangePercent,
      high,
      low,
      volume,
      marketTrend,
      volatility,
      momentum,
      strength,
      marketSentiment,
      // Additional context for reasoning
      priceContext: `Current price at ${currentPrice.toFixed(5)} with ${dailyChange > 0 ? 'gain' : 'loss'} of ${Math.abs(dailyChange).toFixed(5)} (${Math.abs(dailyChangePercent).toFixed(2)}%)`,
      rangeContext: `Trading range: ${low.toFixed(5)} - ${high.toFixed(5)}`,
      trendContext: `${marketTrend.toLowerCase()} trend with ${strength} momentum`
    };
  } catch (error) {
    console.error('Alpha Vantage fetch error:', error);
    return null;
  }
}

async function generateEnhancedReasoning(timeframeAnalyses: any[], alphaVantageData: any, currencyPair: string) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return generateFallbackReasoning(timeframeAnalyses);
    }

    // Prepare timeframe data for AI analysis
    const timeframeData = timeframeAnalyses.map(tf => ({
      timeframe: tf.timeframe,
      sentiment: tf.timeframe_sentiment,
      probability: tf.timeframe_probability,
      reasoning: tf.analysis_data?.ai_reasoning || tf.analysis_data?.reasoning || 'Analysis completed.'
    }));

    const prompt = `You are a professional forex analyst. Analyze the following Top Down Analysis data and provide detailed, comprehensive reasoning for each timeframe that incorporates real-time market data.

Currency Pair: ${currencyPair}

ALPHA VANTAGE MARKET DATA:
${alphaVantageData ? `
- Current Price: ${alphaVantageData.currentPrice.toFixed(5)}
- Daily Change: ${alphaVantageData.dailyChange > 0 ? '+' : ''}${alphaVantageData.dailyChange.toFixed(5)} (${alphaVantageData.dailyChangePercent > 0 ? '+' : ''}${alphaVantageData.dailyChangePercent.toFixed(2)}%)
- Market Trend: ${alphaVantageData.marketTrend}
- Volatility: ${alphaVantageData.volatility.toFixed(2)}%
- Momentum: ${alphaVantageData.momentum} (${alphaVantageData.strength})
- Trading Range: ${alphaVantageData.low.toFixed(5)} - ${alphaVantageData.high.toFixed(5)}
- Market Sentiment: ${alphaVantageData.marketSentiment}
` : 'Market data unavailable'}

Timeframe Analysis Data:
${timeframeData.map(tf => `- ${tf.timeframe}: ${tf.sentiment} (${tf.probability}% probability)`).join('\n')}

TASK: Provide detailed reasoning for each timeframe that combines the user's technical analysis with current market conditions. Each reasoning should be 2-3 sentences and include:

1. How the current market conditions (price, trend, volatility) align with or contradict the user's analysis
2. Specific insights about the timeframe's sentiment in relation to market momentum
3. Risk considerations based on current volatility and market strength
4. Actionable insights for trading decisions

Format each timeframe response as: "TIMEFRAME: [detailed reasoning]"

Focus on providing professional, actionable insights that help traders understand the relationship between their analysis and current market reality.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error('OpenAI API request failed');
    }

    const result = await response.json();
    const aiReasoning = result.choices[0]?.message?.content || '';

    // Parse AI response and map to timeframes
    const enhancedReasoning = timeframeAnalyses.map(tf => {
      const timeframeName = tf.timeframe.toLowerCase();
      // Look for the timeframe in the AI response with more flexible matching
      const reasoningMatch = aiReasoning.match(new RegExp(`${timeframeName}[^\\n]*?([^\\n]+(?:\\n[^\\n]+)*)`, 'i'));
      
      let reasoning = 'Analysis considers current market conditions and user input.';
      if (reasoningMatch) {
        // Extract the reasoning part after the timeframe
        reasoning = reasoningMatch[0].replace(new RegExp(`^${timeframeName}[^:]*:\\s*`, 'i'), '').trim();
        // Clean up any remaining formatting
        reasoning = reasoning.replace(/^[-•]\s*/, '').trim();
      }
      
      return {
        timeframe: tf.timeframe,
        reasoning: reasoning
      };
    });

    return enhancedReasoning;
  } catch (error) {
    console.error('AI reasoning generation error:', error);
    return generateFallbackReasoning(timeframeAnalyses);
  }
}

function generateFallbackReasoning(timeframeAnalyses: any[]) {
  return timeframeAnalyses.map(tf => ({
    timeframe: tf.timeframe,
    reasoning: tf.analysis_data?.ai_reasoning || tf.analysis_data?.reasoning || 'Analysis completed based on user input and market conditions.'
  }));
}

function calculateUpdatedMetrics(analysis: any, timeframeAnalyses: any[], alphaVantageData: any) {
  // Base metrics from existing analysis
  let overallProbability = analysis.overall_probability || 50;
  let confidenceLevel = analysis.confidence_level || 50;
  let riskLevel = analysis.risk_level || 'MEDIUM';

  // Adjust based on Alpha Vantage market data
  if (alphaVantageData) {
    const marketAlignment = calculateMarketAlignment(timeframeAnalyses, alphaVantageData);
    
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

  return {
    overall_probability: Math.round(overallProbability * 10) / 10,
    confidence_level: Math.round(confidenceLevel * 10) / 10,
    risk_level: riskLevel
  };
}

function calculateMarketAlignment(timeframeAnalyses: any[], alphaVantageData: any) {
  if (!alphaVantageData) return 0.5;

  const marketTrend = alphaVantageData.marketTrend;
  const bullishTimeframes = timeframeAnalyses.filter(tf => tf.timeframe_sentiment === 'BULLISH').length;
  const bearishTimeframes = timeframeAnalyses.filter(tf => tf.timeframe_sentiment === 'BEARISH').length;
  const totalTimeframes = timeframeAnalyses.length;

  if (totalTimeframes === 0) return 0.5;

  const analysisTrend = bullishTimeframes > bearishTimeframes ? 'BULLISH' : 'BEARISH';
  
  if (marketTrend === analysisTrend) {
    return Math.max(0.7, (Math.max(bullishTimeframes, bearishTimeframes) / totalTimeframes));
  } else {
    return Math.min(0.3, (Math.min(bullishTimeframes, bearishTimeframes) / totalTimeframes));
  }
}
