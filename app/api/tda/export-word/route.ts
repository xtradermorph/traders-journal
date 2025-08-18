import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    console.log('Export request started');
    
    const supabase = createRouteHandlerClient({ cookies });
    
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

    let document = '';
    document += `TOP DOWN ANALYSIS REPORT\n`;
    document += `========================\n\n`;
    document += `Currency Pair: ${analysis.currency_pair}\n`;
    document += `Analysis Date: ${new Date(analysis.analysis_date).toLocaleDateString()}\n`;
    document += `Analyst: ${analystName}\n`;
    document += `Report Date: ${new Date().toLocaleDateString()}\n\n`;
    
    if (analysis.ai_summary) {
      document += `AI SUMMARY\n`;
      document += `==========\n`;
      document += `${analysis.ai_summary}\n\n`;
    }
    
    if (answers && answers.length > 0) {
      document += `ANSWERS\n`;
      document += `=======\n`;
      answers.forEach((answer, index) => {
        const question = questions?.find(q => q.id === answer.question_id);
        document += `${index + 1}. ${question?.question_text || 'Unknown question'}\n`;
        document += `   Answer: ${answer.answer_text || answer.answer_value || 'No answer'}\n\n`;
      });
    }
    
    if (screenshots && screenshots.length > 0) {
      document += `SCREENSHOTS\n`;
      document += `===========\n`;
      screenshots.forEach(screenshot => {
        document += `- ${screenshot.file_name} (${screenshot.timeframe})\n`;
      });
      document += '\n';
    }
    
    document += `DISCLAIMER\n`;
    document += `==========\n`;
    document += `This report is generated for ${analystName} based on their Top Down Analysis of ${analysis.currency_pair}.\n`;
    document += `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;

    console.log('Document generated, length:', document.length);

    // Return the document
    const fileName = `TDA_${analysis.currency_pair}_${new Date(analysis.analysis_date).toISOString().split('T')[0]}.txt`;
    
    console.log('Sending response with filename:', fileName);
    
    return new NextResponse(document, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': Buffer.byteLength(document, 'utf8').toString()
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
