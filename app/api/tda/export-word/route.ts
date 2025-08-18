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
    const [answersResponse, questionsResponse, screenshotsResponse, userProfileResponse] = await Promise.all([
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

    if (answersResponse.error || questionsResponse.error || screenshotsResponse.error) {
      return NextResponse.json({ error: 'Failed to fetch analysis data' }, { status: 500 });
    }

    const answers = answersResponse.data || [];
    const questions = questionsResponse.data || [];
    const screenshots = screenshotsResponse.data || [];
    const userProfile = userProfileResponse.data;

    // Generate simple text document
    const documentContent = generateSimpleDocument({
      analysis,
      answers,
      questions,
      screenshots,
      selectedTimeframes: selected_timeframes || [],
      userProfile
    });

    // Return the document as a downloadable file
    const fileName = `TDA_${analysis.currency_pair}_${new Date(analysis.analysis_date).toISOString().split('T')[0]}.txt`;
    
    return new NextResponse(documentContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': Buffer.byteLength(documentContent, 'utf8').toString()
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateSimpleDocument(data: any): string {
  const { analysis, answers, questions, screenshots, selectedTimeframes, userProfile } = data;
  
  // Get analyst name
  const analystName = userProfile?.first_name && userProfile?.last_name 
    ? `${userProfile.first_name} ${userProfile.last_name}`
    : userProfile?.username || 'Trader';

  let document = '';
  
  // Header
  document += `TOP DOWN ANALYSIS REPORT\n`;
  document += `========================\n\n`;
  
  // Document metadata
  document += `Currency Pair: ${analysis.currency_pair}\n`;
  document += `Analysis Date: ${new Date(analysis.analysis_date).toLocaleDateString()}\n`;
  document += `Analyst: ${analystName}\n`;
  document += `Report Date: ${new Date().toLocaleDateString()}\n\n`;
  
  // Analysis overview
  document += `ANALYSIS OVERVIEW\n`;
  document += `=================\n`;
  document += `Selected Timeframes: ${selectedTimeframes.map(tf => getTimeframeDisplayName(tf)).join(', ')}\n`;
  document += `Total Timeframes: ${selectedTimeframes.length}\n`;
  document += `Questions Answered: ${answers.length}\n`;
  document += `Screenshots: ${screenshots.length}\n\n`;
  
  // AI Analysis
  if (analysis.ai_summary || analysis.ai_reasoning) {
    document += `AI ANALYSIS\n`;
    document += `===========\n`;
    if (analysis.overall_probability) {
      document += `Overall Probability: ${analysis.overall_probability}%\n`;
    }
    if (analysis.trade_recommendation) {
      document += `Trade Recommendation: ${analysis.trade_recommendation}\n`;
    }
    if (analysis.confidence_level) {
      document += `Confidence Level: ${analysis.confidence_level}%\n`;
    }
    if (analysis.risk_level) {
      document += `Risk Level: ${analysis.risk_level}\n`;
    }
    document += '\n';
    
    if (analysis.ai_summary) {
      document += `AI Summary:\n${analysis.ai_summary}\n\n`;
    }
    if (analysis.ai_reasoning) {
      document += `AI Reasoning:\n${analysis.ai_reasoning}\n\n`;
    }
  }
  
  // Timeframe Analysis
  document += `TIMEFRAME ANALYSIS\n`;
  document += `==================\n`;
  
  selectedTimeframes.forEach(timeframe => {
    const timeframeQuestions = questions.filter(q => q.timeframe === timeframe);
    const timeframeAnswers = answers.filter(a => 
      timeframeQuestions.some(q => q.id === a.question_id)
    );
    const timeframeScreenshots = screenshots.filter(s => s.timeframe === timeframe);
    
    document += `${getTimeframeDisplayName(timeframe)} Timeframe:\n`;
    document += `- Questions: ${timeframeQuestions.length}\n`;
    document += `- Answers: ${timeframeAnswers.length}\n`;
    document += `- Screenshots: ${timeframeScreenshots.length}\n`;
    
    // Show questions and answers
    timeframeQuestions.forEach(question => {
      const answer = timeframeAnswers.find(a => a.question_id === question.id);
      if (answer) {
        document += `\n  Q: ${question.question_text}\n`;
        document += `  A: ${answer.answer_text || answer.answer_value || 'No answer'}\n`;
      }
    });
    
    document += '\n';
  });
  
  // Screenshots
  if (screenshots.length > 0) {
    document += `SCREENSHOTS\n`;
    document += `===========\n`;
    screenshots.forEach(screenshot => {
      document += `- ${screenshot.file_name} (${getTimeframeDisplayName(screenshot.timeframe)})\n`;
    });
    document += '\n';
  }
  
  // Disclaimer
  document += `DISCLAIMER\n`;
  document += `==========\n`;
  document += `This report is generated for ${analystName} based on their Top Down Analysis of ${analysis.currency_pair}. `;
  document += `The AI analysis provided is for informational purposes only and should not be considered as trading advice. `;
  document += `Always rely on your own analysis and risk management. Trading forex involves substantial risk of loss.\n\n`;
  
  // Footer
  document += `---\n`;
  document += `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} | `;
  document += `Trader's Journal - Top Down Analysis Report`;
  
  return document;
}

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
