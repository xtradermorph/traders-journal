import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('Export request started');
    
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { analysis_id } = body;
    console.log('Request body:', { analysis_id });

    if (!analysis_id) {
      return NextResponse.json({ error: 'Analysis ID is required' }, { status: 400 });
    }

    // Get the analysis
    const { data: analysis, error: analysisError } = await supabase
      .from('top_down_analyses')
      .select('*')
      .eq('id', analysis_id)
      .eq('user_id', user.id)
      .single();

    if (analysisError || !analysis) {
      console.log('Analysis error:', analysisError);
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    console.log('Analysis found:', analysis.currency_pair);

    // Get user profile
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name, username')
      .eq('id', user.id)
      .single();

    // Get answers
    const { data: answers } = await supabase
      .from('tda_answers')
      .select('*')
      .eq('analysis_id', analysis_id);

    // Get questions
    const { data: questions } = await supabase
      .from('tda_questions')
      .select('*');

    // Get screenshots
    const { data: screenshots } = await supabase
      .from('tda_screenshots')
      .select('*')
      .eq('analysis_id', analysis_id);

    console.log('Data fetched:', {
      answers: answers?.length || 0,
      questions: questions?.length || 0,
      screenshots: screenshots?.length || 0,
      userProfile: !!userProfile
    });

    // Generate simple document
    const analystName = userProfile?.first_name && userProfile?.last_name 
      ? `${userProfile.first_name} ${userProfile.last_name}`
      : userProfile?.username || 'Trader';

    // Create RTF document that Word can open properly
    const rtfDocument = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}
\\f0\\fs24
{\\b TOP DOWN ANALYSIS REPORT}\\par
{\\b ========================}\\par\\par

{\\b Document Information:}\\par
Currency Pair: ${analysis.currency_pair}\\par
Analysis Date: ${new Date(analysis.analysis_date).toLocaleDateString()}\\par
Analyst: ${analystName}\\par
Report Date: ${new Date().toLocaleDateString()}\\par
Total Answers: ${answers?.length || 0}\\par
Total Screenshots: ${screenshots?.length || 0}\\par\\par

${analysis.ai_summary ? `
{\\b AI ANALYSIS}\\par
{\\b ===========}\\par
AI Summary: ${analysis.ai_summary}\\par\\par
` : ''}

${answers && answers.length > 0 ? `
{\\b ANALYSIS ANSWERS}\\par
{\\b ===============}\\par
${answers.map((answer, index) => {
  const question = questions?.find(q => q.id === answer.question_id);
  return `${index + 1}. ${question?.question_text || 'Unknown question'}\\par
   Answer: ${answer.answer_text || answer.answer_value || 'No answer provided'}\\par\\par`;
}).join('')}
` : ''}

${screenshots && screenshots.length > 0 ? `
{\\b CHART SCREENSHOTS}\\par
{\\b =================}\\par
${screenshots.map(screenshot => `- ${screenshot.file_name} (${screenshot.timeframe} timeframe)\\par`).join('')}\\par
` : ''}

{\\b DISCLAIMER}\\par
{\\b ==========}\\par
This report is generated for ${analystName} based on their Top Down Analysis of ${analysis.currency_pair}. The AI analysis provided is for informational purposes only and should not be considered as trading advice. Always rely on your own analysis and risk management. Trading forex involves substantial risk of loss.\\par\\par

Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} | Trader's Journal - Top Down Analysis Report\\par
}`;

    console.log('Document generated, length:', rtfDocument.length);

    // Return the document as a Word-compatible RTF file
    const fileName = `TDA_${analysis.currency_pair}_${new Date(analysis.analysis_date).toISOString().split('T')[0]}.rtf`;
    
    console.log('Sending response with filename:', fileName);
    
    return new NextResponse(rtfDocument, {
      status: 200,
      headers: {
        'Content-Type': 'application/rtf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': Buffer.byteLength(rtfDocument, 'utf8').toString()
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
