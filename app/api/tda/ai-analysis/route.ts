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
    const { analysis_id, answers, timeframe_analyses } = body;

    if (!analysis_id || !answers || !timeframe_analyses) {
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

    // Generate AI analysis
    const aiResponse = await generateAIAnalysis(answers, timeframe_analyses, questions, analysis.currency_pair);

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

    // Update timeframe analyses with AI breakdown
    const allTimeframes: TimeframeType[] = ['M10', 'M15', 'M30', 'H1', 'H2', 'H4', 'H8', 'W1', 'MN1', 'DAILY'];
    
    for (const timeframe of allTimeframes) {
      const breakdown = aiResponse.timeframe_breakdown[timeframe];
      const existingTimeframe = timeframe_analyses.find((t: any) => t.timeframe === timeframe);
      
      if (existingTimeframe) {
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

async function generateAIAnalysis(
  answers: any[],
  timeframeAnalyses: any[],
  questions: any[],
  currencyPair: string
): Promise<AIAnalysisResponse> {
  // This is a sophisticated AI analysis algorithm
  // In production, you might want to use a real AI service like OpenAI, Claude, or Grok
  
  // Initialize all timeframes with default values
  const timeframeScores: Record<TimeframeType, number> = {
    M10: 0, M15: 0, M30: 0,
    H1: 0, H2: 0, H4: 0, H8: 0,
    W1: 0, MN1: 0, DAILY: 0
  };

  const timeframeSentiments: Record<TimeframeType, 'BULLISH' | 'BEARISH' | 'NEUTRAL'> = {
    M10: 'NEUTRAL', M15: 'NEUTRAL', M30: 'NEUTRAL',
    H1: 'NEUTRAL', H2: 'NEUTRAL', H4: 'NEUTRAL', H8: 'NEUTRAL',
    W1: 'NEUTRAL', MN1: 'NEUTRAL', DAILY: 'NEUTRAL'
  };

  const timeframeStrengths: Record<TimeframeType, number> = {
    M10: 0, M15: 0, M30: 0,
    H1: 0, H2: 0, H4: 0, H8: 0,
    W1: 0, MN1: 0, DAILY: 0
  };

  const timeframeReasonings: Record<TimeframeType, string> = {
    M10: '', M15: '', M30: '',
    H1: '', H2: '', H4: '', H8: '',
    W1: '', MN1: '', DAILY: ''
  };

  // Analyze each timeframe
  const allTimeframes: TimeframeType[] = ['M10', 'M15', 'M30', 'H1', 'H2', 'H4', 'H8', 'W1', 'MN1', 'DAILY'];
  
  for (const timeframe of allTimeframes) {
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

  // Calculate overall probability using weighted average
  // Prioritize larger timeframes: Daily (40%), Weekly (25%), 4H (20%), 1H (10%), 15M (5%)
  const overallProbability = Math.round(
    (timeframeScores.DAILY * 0.4 + 
     timeframeScores.W1 * 0.25 + 
     timeframeScores.H4 * 0.2 + 
     timeframeScores.H1 * 0.1 + 
     timeframeScores.M15 * 0.05) * 100
  ) / 100;

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

  // Generate AI summary and reasoning
  const aiSummary = generateSummary(currencyPair, overallProbability, tradeRecommendation, timeframeSentiments);
  const aiReasoning = generateReasoning(timeframeScores, timeframeSentiments, timeframeReasonings);

  return {
    overall_probability: overallProbability,
    trade_recommendation: tradeRecommendation,
    confidence_level: confidenceLevel,
    risk_level: riskLevel,
    ai_summary: aiSummary,
    ai_reasoning: aiReasoning,
    timeframe_breakdown: {
      M10: {
        probability: timeframeScores.M10,
        sentiment: timeframeSentiments.M10,
        strength: timeframeStrengths.M10,
        reasoning: timeframeReasonings.M10
      },
      M15: {
        probability: timeframeScores.M15,
        sentiment: timeframeSentiments.M15,
        strength: timeframeStrengths.M15,
        reasoning: timeframeReasonings.M15
      },
      M30: {
        probability: timeframeScores.M30,
        sentiment: timeframeSentiments.M30,
        strength: timeframeStrengths.M30,
        reasoning: timeframeReasonings.M30
      },
      H1: {
        probability: timeframeScores.H1,
        sentiment: timeframeSentiments.H1,
        strength: timeframeStrengths.H1,
        reasoning: timeframeReasonings.H1
      },
      H2: {
        probability: timeframeScores.H2,
        sentiment: timeframeSentiments.H2,
        strength: timeframeStrengths.H2,
        reasoning: timeframeReasonings.H2
      },
      H4: {
        probability: timeframeScores.H4,
        sentiment: timeframeSentiments.H4,
        strength: timeframeStrengths.H4,
        reasoning: timeframeReasonings.H4
      },
      H8: {
        probability: timeframeScores.H8,
        sentiment: timeframeSentiments.H8,
        strength: timeframeStrengths.H8,
        reasoning: timeframeReasonings.H8
      },
      W1: {
        probability: timeframeScores.W1,
        sentiment: timeframeSentiments.W1,
        strength: timeframeStrengths.W1,
        reasoning: timeframeReasonings.W1
      },
      MN1: {
        probability: timeframeScores.MN1,
        sentiment: timeframeSentiments.MN1,
        strength: timeframeStrengths.MN1,
        reasoning: timeframeReasonings.MN1
      },
      DAILY: {
        probability: timeframeScores.DAILY,
        sentiment: timeframeSentiments.DAILY,
        strength: timeframeStrengths.DAILY,
        reasoning: timeframeReasonings.DAILY
      }
    }
  };
}

function analyzeTimeframe(timeframe: TimeframeType, answers: any[], questions: any[]): {
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
        const rating = parseInt(answerValue);
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
        const text = answerValue?.toLowerCase() || '';
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