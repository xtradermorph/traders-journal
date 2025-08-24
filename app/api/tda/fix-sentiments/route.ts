import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';
import { TimeframeType } from '@/types/tda';

async function fetchHistoricalAlphaVantageData(currencyPair: string, analysisDate: Date) {
  try {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      console.warn('Alpha Vantage API key not configured');
      return null;
    }

    // Fetch historical market data
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
    
    // Find the closest date to the analysis date
    const analysisDateStr = analysisDate.toISOString().split('T')[0];
    const targetDate = dates.find(date => date <= analysisDateStr) || dates[0];
    const targetIndex = dates.indexOf(targetDate);
    const latestData = timeSeriesData[targetDate];
    const previousData = timeSeriesData[dates[targetIndex + 1]] || timeSeriesData[dates[0]];

    return {
      currentPrice: parseFloat(latestData['4. close']),
      previousPrice: parseFloat(previousData['4. close']),
      dailyChange: parseFloat(latestData['4. close']) - parseFloat(previousData['4. close']),
      dailyChangePercent: ((parseFloat(latestData['4. close']) - parseFloat(previousData['4. close'])) / parseFloat(previousData['4. close'])) * 100,
      high: parseFloat(latestData['2. high']),
      low: parseFloat(latestData['3. low']),
      volume: parseFloat(latestData['5. volume']),
      marketTrend: parseFloat(latestData['4. close']) > parseFloat(previousData['4. close']) ? 'BULLISH' : 'BEARISH',
      dataSource: 'historical',
      targetDate: targetDate
    };
  } catch (error) {
    console.error('Historical Alpha Vantage fetch error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { analysisId } = body;

    if (!analysisId) {
      return NextResponse.json({ error: 'Analysis ID is required' }, { status: 400 });
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

    // Fetch all questions and answers for this analysis
    const { data: answers, error: answersError } = await supabase
      .from('tda_answers')
      .select('*')
      .eq('analysis_id', analysisId);

    if (answersError) {
      return NextResponse.json({ error: 'Failed to fetch answers' }, { status: 500 });
    }

    // Fetch questions for context
    const { data: questions, error: questionsError } = await supabase
      .from('tda_questions')
      .select('*')
      .eq('is_active', true)
      .order('timeframe, order_index');

    if (questionsError) {
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
    }

    // Get selected timeframes from the analysis
    const selectedTimeframes = analysis.selected_timeframes || [];

    // Fetch historical Alpha Vantage data for the analysis date
    const analysisDate = new Date(analysis.completed_at);
    const alphaVantageData = await fetchHistoricalAlphaVantageData(analysis.currency_pair, analysisDate);

    // Recalculate sentiments for each timeframe
    const updatedTimeframes = [];
    
    for (const timeframe of selectedTimeframes) {
      const timeframeAnswers = answers.filter(a => {
        const question = questions.find(q => q.id === a.question_id);
        return question?.timeframe === timeframe;
      });

      const sentimentAnalysis = analyzeTimeframeSentiment(timeframe, timeframeAnswers, questions, alphaVantageData);
      
      // Update the timeframe analysis in the database
      const { data: existingTimeframe, error: fetchError } = await supabase
        .from('tda_timeframe_analyses')
        .select('*')
        .eq('analysis_id', analysisId)
        .eq('timeframe', timeframe)
        .single();

      if (existingTimeframe) {
        const { error: updateError } = await supabase
          .from('tda_timeframe_analyses')
          .update({
            timeframe_sentiment: sentimentAnalysis.sentiment,
            timeframe_probability: sentimentAnalysis.score,
            timeframe_strength: sentimentAnalysis.strength,
            analysis_data: {
              ...existingTimeframe.analysis_data,
              ai_reasoning: sentimentAnalysis.reasoning,
              recalculated_at: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', existingTimeframe.id);

        if (updateError) {
          console.error(`Failed to update timeframe ${timeframe}:`, updateError);
        } else {
          updatedTimeframes.push({
            timeframe,
            sentiment: sentimentAnalysis.sentiment,
            probability: sentimentAnalysis.score,
            strength: sentimentAnalysis.strength
          });
        }
      }
    }

    // Recalculate overall metrics
    const overallMetrics = calculateOverallMetrics(updatedTimeframes, analysis);

    // Update the main analysis
    const { error: analysisUpdateError } = await supabase
      .from('top_down_analyses')
      .update({
        overall_probability: overallMetrics.overall_probability,
        confidence_level: overallMetrics.confidence_level,
        risk_level: overallMetrics.risk_level,
        updated_at: new Date().toISOString()
      })
      .eq('id', analysisId);

    if (analysisUpdateError) {
      console.error('Failed to update analysis:', analysisUpdateError);
    }

    return NextResponse.json({
      success: true,
      message: 'Sentiments recalculated successfully',
      updatedTimeframes,
      overallMetrics
    });

  } catch (error) {
    console.error('Fix sentiments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function analyzeTimeframeSentiment(
  timeframe: TimeframeType, 
  answers: any[], 
  questions: any[],
  alphaVantageData?: any
): {
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
        if (answerValue === 'Bullish' || answerValue === 'bullish') {
          bullishSignals++;
          score += 20;
          reasoning.push(`Strong bullish signal from ${question.question_text}`);
        } else if (answerValue === 'Bearish' || answerValue === 'bearish') {
          bearishSignals++;
          score -= 20;
          reasoning.push(`Strong bearish signal from ${question.question_text}`);
        } else if (answerValue === 'Sideways' || answerValue === 'sideways') {
          score += 0; // Neutral
          reasoning.push(`Neutral/sideways signal from ${question.question_text}`);
        }
        break;

      case 'RATING':
        const rating = parseInt(String(answerValue));
        if (!isNaN(rating)) {
          if (rating >= 4) {
            bullishSignals++;
            score += 15;
            reasoning.push(`High confidence (${rating}/5) in ${question.question_text}`);
          } else if (rating <= 2) {
            bearishSignals++;
            score -= 15;
            reasoning.push(`Low confidence (${rating}/5) in ${question.question_text}`);
          } else {
            score += 0; // Neutral
            reasoning.push(`Moderate confidence (${rating}/5) in ${question.question_text}`);
          }
        }
        break;

      case 'BOOLEAN':
        if (answerValue === true || answerValue === 'true' || answerValue === 'yes' || answerValue === 'Yes') {
          bullishSignals++;
          score += 12;
          reasoning.push(`Positive confirmation for ${question.question_text}`);
        } else if (answerValue === false || answerValue === 'false' || answerValue === 'no' || answerValue === 'No') {
          bearishSignals++;
          score -= 12;
          reasoning.push(`Negative confirmation for ${question.question_text}`);
        }
        break;

      case 'TEXT':
        // Enhanced text sentiment analysis
        const text = String(answerValue).toLowerCase() || '';
        const bullishKeywords = ['bullish', 'strong', 'support', 'uptrend', 'buy', 'long', 'positive', 'good', 'stronger'];
        const bearishKeywords = ['bearish', 'weak', 'resistance', 'downtrend', 'sell', 'short', 'negative', 'bad', 'weaker'];
        
        const bullishMatches = bullishKeywords.filter(keyword => text.includes(keyword)).length;
        const bearishMatches = bearishKeywords.filter(keyword => text.includes(keyword)).length;
        
        if (bullishMatches > bearishMatches) {
          bullishSignals++;
          score += 8;
          reasoning.push(`Positive text analysis: ${text.substring(0, 50)}...`);
        } else if (bearishMatches > bullishMatches) {
          bearishSignals++;
          score -= 8;
          reasoning.push(`Negative text analysis: ${text.substring(0, 50)}...`);
        }
        break;
    }
  }

  // Normalize score to 0-100 range
  score = Math.max(0, Math.min(100, score));

  // Improved sentiment determination with more flexible thresholds
  let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  
  if (bullishSignals > bearishSignals && score >= 52) {
    sentiment = 'BULLISH';
  } else if (bearishSignals > bullishSignals && score <= 48) {
    sentiment = 'BEARISH';
  } else if (bullishSignals === bearishSignals && score === 50) {
    sentiment = 'NEUTRAL';
  } else if (score > 50) {
    sentiment = 'BULLISH';
  } else if (score < 50) {
    sentiment = 'BEARISH';
  } else {
    sentiment = 'NEUTRAL';
  }

  // Adjust sentiment based on Alpha Vantage market data if available
  if (alphaVantageData) {
    const marketTrend = alphaVantageData.marketTrend;
    const marketAlignment = marketTrend === sentiment ? 1 : -1;
    
    // If market trend aligns with analysis, strengthen the sentiment
    // If market trend conflicts with analysis, consider adjusting
    if (marketAlignment === 1 && Math.abs(score - 50) < 10) {
      // Strengthen weak signals that align with market
      score += 5;
      if (score > 50) sentiment = 'BULLISH';
      else if (score < 50) sentiment = 'BEARISH';
    } else if (marketAlignment === -1 && Math.abs(score - 50) < 5) {
      // Consider market trend for very close calls
      if (marketTrend === 'BULLISH') {
        sentiment = 'BULLISH';
        score += 3;
      } else if (marketTrend === 'BEARISH') {
        sentiment = 'BEARISH';
        score -= 3;
      }
    }
    
    // Add market context to reasoning
    reasoning.push(`Market trend: ${marketTrend.toLowerCase()} (${alphaVantageData.dataSource} data from ${alphaVantageData.targetDate})`);
  }

  // Calculate strength based on signal consistency and score deviation
  const signalStrength = totalSignals > 0 ? (Math.max(bullishSignals, bearishSignals) / totalSignals) * 100 : 0;
  const scoreDeviation = Math.abs(score - 50) * 2; // Convert to 0-100 scale
  const strength = Math.min(100, (signalStrength + scoreDeviation) / 2);

  return {
    score: Math.round(score * 10) / 10,
    sentiment,
    strength: Math.round(strength * 10) / 10,
    reasoning: reasoning.join('; ')
  };
}

function calculateOverallMetrics(timeframes: any[], analysis: any) {
  // Calculate weighted average based on timeframe importance
  const timeframeWeights: Record<TimeframeType, number> = {
    DAILY: 0.35, W1: 0.25, H4: 0.20, H1: 0.10, M15: 0.05,
    H8: 0.15, H2: 0.15, M30: 0.08, M10: 0.03, MN1: 0.30
  };

  let totalWeight = 0;
  let weightedSum = 0;
  let bullishCount = 0;
  let bearishCount = 0;

  timeframes.forEach(tf => {
    const weight = timeframeWeights[tf.timeframe] || 0.1;
    totalWeight += weight;
    weightedSum += tf.probability * weight;
    
    if (tf.sentiment === 'BULLISH') bullishCount++;
    else if (tf.sentiment === 'BEARISH') bearishCount++;
  });

  const overallProbability = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 50;

  // Determine confidence level based on sentiment consistency
  const totalTimeframes = timeframes.length;
  const dominantSentiment = bullishCount > bearishCount ? 'BULLISH' : bearishCount > bullishCount ? 'BEARISH' : 'NEUTRAL';
  const sentimentConsistency = totalTimeframes > 0 ? Math.max(bullishCount, bearishCount) / totalTimeframes : 0;
  
  let confidenceLevel = Math.round((overallProbability + (sentimentConsistency * 30)) * 10) / 10;
  confidenceLevel = Math.max(0, Math.min(100, confidenceLevel));

  // Determine risk level
  let riskLevel = 'MEDIUM';
  if (sentimentConsistency > 0.8 && overallProbability > 70) {
    riskLevel = 'LOW';
  } else if (sentimentConsistency < 0.5 || overallProbability < 30) {
    riskLevel = 'HIGH';
  }

  return {
    overall_probability: overallProbability,
    confidence_level: confidenceLevel,
    risk_level: riskLevel
  };
}
