import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { analysis_id, selected_timeframes } = body;

    if (!analysis_id) {
      return NextResponse.json({ error: 'Analysis ID is required' }, { status: 400 });
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

    // Fetch all related data
    const [timeframeAnalysesResponse, answersResponse, questionsResponse, screenshotsResponse, userProfileResponse] = await Promise.all([
      supabase
        .from('tda_timeframe_analyses')
        .select('*')
        .eq('analysis_id', analysis_id)
        .in('timeframe', selected_timeframes || []),
      supabase
        .from('tda_answers')
        .select('*')
        .eq('analysis_id', analysis_id),
      supabase
        .from('tda_questions')
        .select('*')
        .in('timeframe', selected_timeframes || []),
      supabase
        .from('tda_screenshots')
        .select('*')
        .eq('analysis_id', analysis_id)
        .in('timeframe', selected_timeframes || []),
      supabase
        .from('profiles')
        .select('first_name, last_name, username')
        .eq('id', user.id)
        .single()
    ]);

    if (timeframeAnalysesResponse.error || answersResponse.error || questionsResponse.error || screenshotsResponse.error) {
      return NextResponse.json({ error: 'Failed to fetch analysis data' }, { status: 500 });
    }

    const timeframeAnalyses = timeframeAnalysesResponse.data || [];
    const answers = answersResponse.data || [];
    const questions = questionsResponse.data || [];
    const screenshots = screenshotsResponse.data || [];
    const userProfile = userProfileResponse.data;

    // Prepare data for Word document generation
    const wordData = prepareWordData({
      analysis,
      timeframeAnalyses,
      answers,
      questions,
      screenshots,
      selectedTimeframes: selected_timeframes || [],
      userProfile
    });

    // Generate Word document
    const wordBuffer = await generateWordDocument(wordData);

    // Return the document as a downloadable file
    const fileName = `TDA_${analysis.currency_pair}_${new Date(analysis.analysis_date).toISOString().split('T')[0]}.html`;
    
    return new NextResponse(wordBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': wordBuffer.length.toString()
      }
    });

  } catch (error) {
    console.error('Word export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

interface WordData {
  analysis: any;
  timeframeAnalyses: any[];
  answers: any[];
  questions: any[];
  screenshots: any[];
  selectedTimeframes: string[];
  userProfile?: any;
}

function prepareWordData(data: WordData) {
  const { analysis, timeframeAnalyses, answers, questions, screenshots, selectedTimeframes, userProfile } = data;

  // Get analyst name
  const analystName = userProfile?.first_name && userProfile?.last_name 
    ? `${userProfile.first_name} ${userProfile.last_name}`
    : userProfile?.username || 'Trader';

  // Prepare timeframe data - only selected timeframes
  const timeframeData = selectedTimeframes.map(timeframe => {
    const timeframeAnalysis = timeframeAnalyses.find(ta => ta.timeframe === timeframe);
    const timeframeQuestions = questions.filter(q => q.timeframe === timeframe);
    const timeframeAnswers = answers.filter(a => 
      timeframeQuestions.some(q => q.id === a.question_id)
    );
    const timeframeScreenshots = screenshots.filter(s => s.timeframe === timeframe);

    return {
      name: getTimeframeDisplayName(timeframe),
      value: timeframe,
      analysis: timeframeAnalysis,
      questions: timeframeQuestions.map(q => {
        const answer = timeframeAnswers.find(a => a.question_id === q.id);
        return {
          question: q.question_text,
          answer: answer?.answer_text || answer?.answer_value || 'Not answered',
          type: q.question_type
        };
      }),
      screenshots: timeframeScreenshots.map(s => ({
        name: s.file_name,
        url: s.file_url,
        size: formatFileSize(s.file_size)
      })),
      hasScreenshots: timeframeScreenshots.length > 0,
      screenshotCount: timeframeScreenshots.length
    };
  });

  // Prepare AI analysis data with backward compatibility
  const aiAnalysis = {
    probability: analysis.overall_probability || 0,
    recommendation: analysis.trade_recommendation || 'NEUTRAL',
    confidence: analysis.confidence_level || 0,
    riskLevel: analysis.risk_level || 'MEDIUM',
    summary: analysis.ai_summary || 'No AI analysis available',
    reasoning: analysis.ai_reasoning || 'No AI reasoning available',
    // New Alpha Vantage fields with fallbacks for old analyses
    riskRewardRatio: analysis.risk_reward_ratio || 0,
    entryStrategy: analysis.entry_strategy || '',
    exitStrategy: analysis.exit_strategy || '',
    positionSizing: analysis.position_sizing || '',
    marketSentiment: analysis.market_sentiment || '',
    technicalIndicators: analysis.technical_indicators || '',
    marketVolatility: analysis.market_volatility || '',
    supportResistance: analysis.support_resistance || ''
  };

  // Calculate summary statistics
  const totalQuestions = questions.filter(q => selectedTimeframes.includes(q.timeframe)).length;
  const answeredQuestions = answers.filter(a => 
    questions.some(q => q.id === a.question_id && selectedTimeframes.includes(q.timeframe))
  ).length;
  const totalScreenshots = screenshots.filter(s => selectedTimeframes.includes(s.timeframe)).length;

  return {
    // Document metadata
    currencyPair: analysis.currency_pair,
    analysisDate: new Date(analysis.analysis_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    analystName: analystName,
    reportDate: new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),

    // Analysis overview
    selectedTimeframes: selectedTimeframes.map(tf => getTimeframeDisplayName(tf)).join(', '),
    totalTimeframes: selectedTimeframes.length,
    totalQuestions: totalQuestions,
    answeredQuestions: answeredQuestions,
    completionRate: totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0,
    totalScreenshots: totalScreenshots,

    // AI Analysis
    aiAnalysis: aiAnalysis,
    hasAI: analysis.ai_summary && analysis.ai_reasoning,

    // Timeframe data
    timeframes: timeframeData,
    hasTimeframes: timeframeData.length > 0,

    // Risk assessment
    riskAssessment: {
      level: aiAnalysis.riskLevel,
      description: getRiskDescription(aiAnalysis.riskLevel),
      color: getRiskColor(aiAnalysis.riskLevel)
    },

    // Trading recommendation
    tradingRecommendation: {
      action: aiAnalysis.recommendation,
      description: getRecommendationDescription(aiAnalysis.recommendation),
      color: getRecommendationColor(aiAnalysis.recommendation)
    },

    // Executive summary
    executiveSummary: generateExecutiveSummary(analysis, selectedTimeframes, timeframeData),

    // Risk management section
    riskManagement: generateRiskManagementSection(aiAnalysis),

    // Action plan
    actionPlan: generateActionPlan(aiAnalysis, selectedTimeframes),

    // Market sentiment
    marketSentiment: generateMarketSentimentSection(aiAnalysis, timeframeData),

    // Technical analysis
    technicalAnalysis: generateTechnicalAnalysisSection(aiAnalysis, timeframeData),

    // Alpha Vantage Market Data Section
    alphaVantageData: generateAlphaVantageDataSection(aiAnalysis),

    // Screenshots summary
    screenshotsSummary: generateScreenshotsSummary(timeframeData),

    // Disclaimer
    disclaimer: `This report is generated for ${analystName} based on their Top Down Analysis of ${analysis.currency_pair}. 
    The AI analysis provided is for informational purposes only and should not be considered as trading advice. 
    Always rely on your own analysis and risk management. Trading forex involves substantial risk of loss.`,

    // Footer
    footer: `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} | 
    Trader's Journal - Top Down Analysis Report`
  };
}

async function generateWordDocument(templateData: any): Promise<Buffer> {
  try {
    // Create a simple text-based document that can be opened in Word
    const documentContent = generateTextDocument(templateData);
    
    // Create a simple HTML document that Word can open
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Top Down Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #2c3e50; text-align: center; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px; margin-top: 30px; }
        h3 { color: #2c3e50; }
        .metadata { background: #ecf0f1; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .metadata p { margin: 5px 0; }
        .ai-section { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .timeframe-section { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .disclaimer { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .footer { text-align: center; margin-top: 40px; color: #7f8c8d; }
    </style>
</head>
<body>
    <h1>TOP DOWN ANALYSIS REPORT</h1>
    
    <div class="metadata">
        <h2>Document Information</h2>
        <p><strong>Currency Pair:</strong> ${templateData.currencyPair}</p>
        <p><strong>Analysis Date:</strong> ${templateData.analysisDate}</p>
        <p><strong>Analyst:</strong> ${templateData.analystName}</p>
        <p><strong>Report Date:</strong> ${templateData.reportDate}</p>
        <p><strong>Selected Timeframes:</strong> ${templateData.selectedTimeframes}</p>
        <p><strong>Questions Answered:</strong> ${templateData.answeredQuestions}/${templateData.totalQuestions} (${templateData.completionRate}%)</p>
        <p><strong>Screenshots:</strong> ${templateData.totalScreenshots}</p>
    </div>

    ${templateData.hasAI ? `
    <div class="ai-section">
        <h2>AI ANALYSIS</h2>
        <p><strong>Overall Probability:</strong> ${templateData.aiAnalysis.probability}%</p>
        <p><strong>Trade Recommendation:</strong> ${templateData.aiAnalysis.recommendation}</p>
        <p><strong>Confidence Level:</strong> ${templateData.aiAnalysis.confidence}%</p>
        <p><strong>Risk Level:</strong> ${templateData.aiAnalysis.riskLevel}</p>
        <p><strong>Risk-Reward Ratio:</strong> ${templateData.aiAnalysis.riskRewardRatio}:1</p>
        
        <h3>AI Summary</h3>
        <p>${templateData.aiAnalysis.summary}</p>
        
        <h3>AI Reasoning</h3>
        <p>${templateData.aiAnalysis.reasoning}</p>
    </div>
    ` : ''}

    ${templateData.hasTimeframes ? `
    <div class="timeframe-section">
        <h2>TIMEFRAME ANALYSIS</h2>
        ${templateData.timeframes.map(tf => `
            <h3>${tf.name} Timeframe</h3>
            <table>
                <tr>
                    <th>Metric</th>
                    <th>Value</th>
                </tr>
                <tr>
                    <td>Questions</td>
                    <td>${tf.questions.length}</td>
                </tr>
                <tr>
                    <td>Screenshots</td>
                    <td>${tf.screenshotCount}</td>
                </tr>
                ${tf.analysis?.timeframe_probability ? `
                <tr>
                    <td>Probability</td>
                    <td>${tf.analysis.timeframe_probability}%</td>
                </tr>
                ` : ''}
                ${tf.analysis?.timeframe_sentiment ? `
                <tr>
                    <td>Sentiment</td>
                    <td>${tf.analysis.timeframe_sentiment}</td>
                </tr>
                ` : ''}
            </table>
        `).join('')}
    </div>
    ` : ''}

    <div class="disclaimer">
        <h2>DISCLAIMER</h2>
        <p>${templateData.disclaimer}</p>
    </div>

    <div class="footer">
        <p>${templateData.footer}</p>
    </div>
</body>
</html>`;

    return Buffer.from(htmlContent, 'utf-8');
  } catch (error) {
    console.error('Error generating document:', error);
    // Ultimate fallback
    const fallbackContent = `TOP DOWN ANALYSIS REPORT\n\nCurrency Pair: ${templateData.currencyPair}\nAnalysis Date: ${templateData.analysisDate}\n\nError generating full report.`;
    return Buffer.from(fallbackContent, 'utf-8');
  }
}

function generateTextDocument(data: any): string {
  let document = '';
  
  // Header
  document += `TOP DOWN ANALYSIS REPORT\n`;
  document += `========================\n\n`;
  
  // Document metadata
  document += `Currency Pair: ${data.currencyPair}\n`;
  document += `Analysis Date: ${data.analysisDate}\n`;
  document += `Analyst: ${data.analystName}\n`;
  document += `Report Date: ${data.reportDate}\n\n`;
  
  // Analysis overview
  document += `ANALYSIS OVERVIEW\n`;
  document += `=================\n`;
  document += `Selected Timeframes: ${data.selectedTimeframes}\n`;
  document += `Total Timeframes: ${data.totalTimeframes}\n`;
  document += `Questions Answered: ${data.answeredQuestions}/${data.totalQuestions} (${data.completionRate}%)\n`;
  document += `Screenshots: ${data.totalScreenshots}\n\n`;
  
  // AI Analysis
  if (data.hasAI) {
    document += `AI ANALYSIS\n`;
    document += `===========\n`;
    document += `Overall Probability: ${data.aiAnalysis.probability}%\n`;
    document += `Trade Recommendation: ${data.aiAnalysis.recommendation}\n`;
    document += `Confidence Level: ${data.aiAnalysis.confidence}%\n`;
    document += `Risk Level: ${data.aiAnalysis.riskLevel}\n`;
    document += `Risk-Reward Ratio: ${data.aiAnalysis.riskRewardRatio}:1\n\n`;
    
    document += `AI Summary:\n${data.aiAnalysis.summary}\n\n`;
    document += `AI Reasoning:\n${data.aiAnalysis.reasoning}\n\n`;
    
    if (data.aiAnalysis.entryStrategy) {
      document += `Entry Strategy: ${data.aiAnalysis.entryStrategy}\n\n`;
    }
    if (data.aiAnalysis.exitStrategy) {
      document += `Exit Strategy: ${data.aiAnalysis.exitStrategy}\n\n`;
    }
    if (data.aiAnalysis.positionSizing) {
      document += `Position Sizing: ${data.aiAnalysis.positionSizing}\n\n`;
    }
  }
  
  // Alpha Vantage Data (only show if data exists)
  if (data.alphaVantageData && data.alphaVantageData.trim() !== '') {
    document += `ALPHA VANTAGE MARKET DATA\n`;
    document += `=========================\n`;
    document += data.alphaVantageData;
    document += '\n';
  }
  
  // Timeframe Analysis
  if (data.hasTimeframes) {
    document += `TIMEFRAME ANALYSIS\n`;
    document += `==================\n`;
    data.timeframes.forEach(tf => {
      document += `${tf.name} Timeframe:\n`;
      document += `- Questions: ${tf.questions.length}\n`;
      document += `- Screenshots: ${tf.screenshotCount}\n`;
      if (tf.analysis?.timeframe_probability) {
        document += `- Probability: ${tf.analysis.timeframe_probability}%\n`;
      }
      if (tf.analysis?.timeframe_sentiment) {
        document += `- Sentiment: ${tf.analysis.timeframe_sentiment}\n`;
      }
      document += '\n';
    });
  }
  
  // Risk Management
  document += `RISK MANAGEMENT\n`;
  document += `================\n`;
  document += data.riskManagement;
  document += '\n';
  
  // Action Plan
  document += `ACTION PLAN\n`;
  document += `===========\n`;
  document += data.actionPlan;
  document += '\n';
  
  // Market Sentiment
  document += `MARKET SENTIMENT\n`;
  document += `================\n`;
  document += data.marketSentiment;
  document += '\n';
  
  // Technical Analysis
  document += `TECHNICAL ANALYSIS\n`;
  document += `==================\n`;
  document += data.technicalAnalysis;
  document += '\n';
  
  // Screenshots Summary
  document += `SCREENSHOTS SUMMARY\n`;
  document += `===================\n`;
  document += data.screenshotsSummary;
  document += '\n';
  
  // Disclaimer
  document += `DISCLAIMER\n`;
  document += `==========\n`;
  document += data.disclaimer;
  document += '\n\n';
  
  // Footer
  document += `---\n`;
  document += data.footer;
  
  return document;
}

// Helper functions (same as in the original file)
function getTimeframeDisplayName(timeframe: string): string {
  const names: Record<string, string> = {
    M10: '10 Minutes',
    M15: '15 Minutes',
    M30: '30 Minutes',
    H1: '1 Hour',
    H2: '2 Hours',
    H4: '4 Hours',
    H8: '8 Hours',
    DAILY: 'Daily',
    W1: 'Weekly',
    MN1: 'Monthly'
  };
  return names[timeframe] || timeframe;
}

function getRiskDescription(riskLevel: string): string {
  switch (riskLevel) {
    case 'LOW': return 'Low risk environment with clear market structure and favorable conditions';
    case 'MEDIUM': return 'Moderate risk with mixed signals requiring careful position sizing';
    case 'HIGH': return 'High risk environment with unclear market direction and volatile conditions';
    default: return 'Risk level not specified';
  }
}

function getRiskColor(riskLevel: string): string {
  switch (riskLevel) {
    case 'LOW': return '#10B981';
    case 'MEDIUM': return '#F59E0B';
    case 'HIGH': return '#EF4444';
    default: return '#6B7280';
  }
}

function getRecommendationDescription(recommendation: string): string {
  switch (recommendation) {
    case 'LONG': return 'Consider taking a long position based on bullish market analysis';
    case 'SHORT': return 'Consider taking a short position based on bearish market analysis';
    case 'NEUTRAL': return 'Market conditions suggest staying neutral or waiting for clearer signals';
    case 'AVOID': return 'Avoid trading at this time due to unfavorable market conditions';
    default: return 'No specific recommendation available';
  }
}

function getRecommendationColor(recommendation: string): string {
  switch (recommendation) {
    case 'LONG': return '#10B981';
    case 'SHORT': return '#EF4444';
    case 'NEUTRAL': return '#F59E0B';
    case 'AVOID': return '#6B7280';
    default: return '#6B7280';
  }
}

function generateExecutiveSummary(analysis: any, selectedTimeframes: string[], timeframeData: any[]): string {
  const timeframeNames = selectedTimeframes.map(tf => getTimeframeDisplayName(tf)).join(', ');
  
  let summary = `This Top Down Analysis for ${analysis.currency_pair} covers ${selectedTimeframes.length} timeframes: ${timeframeNames}. `;
  
  if (analysis.ai_summary) {
    summary += analysis.ai_summary;
  } else {
    summary += `The analysis was completed on ${new Date(analysis.analysis_date).toLocaleDateString()} with ${timeframeData.length} timeframes analyzed. `;
    summary += `Overall probability: ${analysis.overall_probability || 0}%, Confidence: ${analysis.confidence_level || 0}%.`;
  }
  
  return summary;
}

function generateRiskManagementSection(aiAnalysis: any): string {
  let section = 'Risk Management:\n\n';
  
  if (aiAnalysis.riskLevel) {
    section += `Risk Level: ${aiAnalysis.riskLevel}\n`;
    section += `${getRiskDescription(aiAnalysis.riskLevel)}\n\n`;
  }
  
  if (aiAnalysis.positionSizing) {
    section += `Position Sizing: ${aiAnalysis.positionSizing}\n\n`;
  }
  
  if (aiAnalysis.riskRewardRatio) {
    section += `Risk-Reward Ratio: ${aiAnalysis.riskRewardRatio}:1\n\n`;
  }
  
  section += 'Key Risk Management Principles:\n';
  section += '• Never risk more than 1-2% of your account on any single trade\n';
  section += '• Always use stop-loss orders to limit potential losses\n';
  section += '• Consider market volatility when determining position size\n';
  section += '• Monitor trades and adjust positions as market conditions change\n';
  
  return section;
}

function generateActionPlan(aiAnalysis: any, selectedTimeframes: string[]): string {
  let plan = 'Action Plan:\n\n';
  
  if (aiAnalysis.entryStrategy) {
    plan += `Entry Strategy: ${aiAnalysis.entryStrategy}\n\n`;
  }
  
  if (aiAnalysis.exitStrategy) {
    plan += `Exit Strategy: ${aiAnalysis.exitStrategy}\n\n`;
  }
  
  plan += 'Implementation Steps:\n';
  plan += '1. Review all timeframe analyses before entering any position\n';
  plan += '2. Confirm market conditions align with your analysis\n';
  plan += '3. Set appropriate entry, stop-loss, and take-profit levels\n';
  plan += '4. Monitor the trade and adjust as necessary\n';
  plan += '5. Document the outcome for future reference\n\n';
  
  plan += 'Key Timeframes to Monitor:\n';
  selectedTimeframes.forEach(tf => {
    plan += `• ${getTimeframeDisplayName(tf)}: Monitor for ${tf === 'DAILY' || tf === 'W1' ? 'trend direction' : 'entry timing'}\n`;
  });
  
  return plan;
}

function generateMarketSentimentSection(aiAnalysis: any, timeframeData: any[]): string {
  let section = 'Market Sentiment Analysis:\n\n';
  
  if (aiAnalysis.marketSentiment) {
    section += `Overall Sentiment: ${aiAnalysis.marketSentiment}\n\n`;
  }
  
  section += 'Timeframe Sentiment Breakdown:\n';
  timeframeData.forEach(tf => {
    if (tf.analysis?.timeframe_sentiment) {
      section += `• ${tf.name}: ${tf.analysis.timeframe_sentiment}\n`;
    }
  });
  
  if (aiAnalysis.technicalIndicators) {
    section += `\nTechnical Indicators: ${aiAnalysis.technicalIndicators}\n`;
  }
  
  return section;
}

function generateTechnicalAnalysisSection(aiAnalysis: any, timeframeData: any[]): string {
  let section = 'Technical Analysis Summary:\n\n';
  
  timeframeData.forEach(tf => {
    section += `${tf.name} Timeframe:\n`;
    if (tf.analysis?.timeframe_probability) {
      section += `• Probability: ${tf.analysis.timeframe_probability}%\n`;
    }
    if (tf.analysis?.timeframe_strength) {
      section += `• Strength: ${tf.analysis.timeframe_strength}%\n`;
    }
    if (tf.analysis?.analysis_data?.ai_reasoning) {
      section += `• Analysis: ${tf.analysis.analysis_data.ai_reasoning}\n`;
    }
    section += '\n';
  });
  
  return section;
}

function generateAlphaVantageDataSection(aiAnalysis: any): string {
  let section = '';
  let hasData = false;

  if (aiAnalysis.marketVolatility && aiAnalysis.marketVolatility.trim() !== '') {
    section += `• Market Volatility: ${aiAnalysis.marketVolatility}\n`;
    hasData = true;
  }
  if (aiAnalysis.supportResistance && aiAnalysis.supportResistance.trim() !== '') {
    section += `• Support/Resistance: ${aiAnalysis.supportResistance}\n`;
    hasData = true;
  }
  if (aiAnalysis.riskRewardRatio && aiAnalysis.riskRewardRatio > 0) {
    section += `• Risk-Reward Ratio: ${aiAnalysis.riskRewardRatio}:1\n`;
    hasData = true;
  }
  if (aiAnalysis.entryStrategy && aiAnalysis.entryStrategy.trim() !== '') {
    section += `• Entry Strategy: ${aiAnalysis.entryStrategy}\n`;
    hasData = true;
  }
  if (aiAnalysis.exitStrategy && aiAnalysis.exitStrategy.trim() !== '') {
    section += `• Exit Strategy: ${aiAnalysis.exitStrategy}\n`;
    hasData = true;
  }
  if (aiAnalysis.positionSizing && aiAnalysis.positionSizing.trim() !== '') {
    section += `• Position Sizing: ${aiAnalysis.positionSizing}\n`;
    hasData = true;
  }

  // Only return the section if we have actual data
  return hasData ? section : '';
}

function generateScreenshotsSummary(timeframeData: any[]): string {
  const timeframesWithScreenshots = timeframeData.filter(tf => tf.hasScreenshots);
  
  if (timeframesWithScreenshots.length === 0) {
    return 'No chart screenshots were uploaded for this analysis.';
  }
  
  let summary = 'Chart Screenshots Included:\n\n';
  
  timeframesWithScreenshots.forEach(tf => {
    summary += `${tf.name} Timeframe:\n`;
    summary += `• ${tf.screenshotCount} screenshot${tf.screenshotCount > 1 ? 's' : ''}\n`;
    tf.screenshots.forEach((screenshot: any) => {
      summary += `  - ${screenshot.name} (${screenshot.size})\n`;
    });
    summary += '\n';
  });
  
  return summary;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
