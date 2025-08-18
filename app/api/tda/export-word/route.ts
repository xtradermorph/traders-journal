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

    // Create HTML document that Word can open properly
    const htmlDocument = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Top Down Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        h1 { color: #2c3e50; text-align: center; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px; margin-top: 30px; }
        h3 { color: #2c3e50; }
        .metadata { background: #ecf0f1; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .metadata p { margin: 5px 0; }
        .ai-section { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .answers-section { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .screenshots-section { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .disclaimer { background: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545; }
        .footer { text-align: center; margin-top: 40px; color: #7f8c8d; }
        .answer-item { margin: 15px 0; padding: 10px; background: white; border-left: 3px solid #007bff; }
        .question { font-weight: bold; color: #2c3e50; }
        .answer { margin-top: 5px; color: #34495e; }
    </style>
</head>
<body>
    <h1>TOP DOWN ANALYSIS REPORT</h1>
    
    <div class="metadata">
        <h2>Document Information</h2>
        <p><strong>Currency Pair:</strong> ${analysis.currency_pair}</p>
        <p><strong>Analysis Date:</strong> ${new Date(analysis.analysis_date).toLocaleDateString()}</p>
        <p><strong>Analyst:</strong> ${analystName}</p>
        <p><strong>Report Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Total Answers:</strong> ${answers?.length || 0}</p>
        <p><strong>Total Screenshots:</strong> ${screenshots?.length || 0}</p>
    </div>
    
    ${analysis.ai_summary ? `
    <div class="ai-section">
        <h2>AI ANALYSIS</h2>
        <p><strong>AI Summary:</strong></p>
        <p>${analysis.ai_summary}</p>
    </div>
    ` : ''}
    
    ${answers && answers.length > 0 ? `
    <div class="answers-section">
        <h2>ANALYSIS ANSWERS</h2>
        ${answers.map((answer, index) => {
          const question = questions?.find(q => q.id === answer.question_id);
          return `
            <div class="answer-item">
                <div class="question">${index + 1}. ${question?.question_text || 'Unknown question'}</div>
                <div class="answer">Answer: ${answer.answer_text || answer.answer_value || 'No answer provided'}</div>
            </div>
          `;
        }).join('')}
    </div>
    ` : ''}
    
    ${screenshots && screenshots.length > 0 ? `
    <div class="screenshots-section">
        <h2>CHART SCREENSHOTS</h2>
        <ul>
            ${screenshots.map(screenshot => `
                <li><strong>${screenshot.file_name}</strong> (${screenshot.timeframe} timeframe)</li>
            `).join('')}
        </ul>
    </div>
    ` : ''}
    
    <div class="disclaimer">
        <h2>DISCLAIMER</h2>
        <p>This report is generated for ${analystName} based on their Top Down Analysis of ${analysis.currency_pair}. 
        The AI analysis provided is for informational purposes only and should not be considered as trading advice. 
        Always rely on your own analysis and risk management. Trading forex involves substantial risk of loss.</p>
    </div>
    
    <div class="footer">
        <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} | 
        Trader's Journal - Top Down Analysis Report</p>
    </div>
</body>
</html>`;

    console.log('Document generated, length:', htmlDocument.length);

    // Return the document as a Word-compatible HTML file
    const fileName = `TDA_${analysis.currency_pair}_${new Date(analysis.analysis_date).toISOString().split('T')[0]}.html`;
    
    console.log('Sending response with filename:', fileName);
    
    return new NextResponse(htmlDocument, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': Buffer.byteLength(htmlDocument, 'utf8').toString()
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
