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

    // Generate Word document
    const analystName = userProfile?.first_name && userProfile?.last_name 
      ? `${userProfile.first_name} ${userProfile.last_name}`
      : userProfile?.username || 'Trader';

    console.log('Generating Word document...');
    
    // Create Word document using docx library
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx');
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "TOP DOWN ANALYSIS REPORT",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: "==================================",
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }),
          
          // Document Information
          new Paragraph({
            text: "Document Information",
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Currency Pair: ", bold: true }),
              new TextRun({ text: analysis.currency_pair }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Analysis Date: ", bold: true }),
              new TextRun({ text: new Date(analysis.analysis_date).toLocaleDateString() }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Analyst: ", bold: true }),
              new TextRun({ text: analystName }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Report Date: ", bold: true }),
              new TextRun({ text: new Date().toLocaleDateString() }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Total Answers: ", bold: true }),
              new TextRun({ text: (answers?.length || 0).toString() }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Total Screenshots: ", bold: true }),
              new TextRun({ text: (screenshots?.length || 0).toString() }),
            ],
          }),
          new Paragraph({ text: "" }),
          
          // AI Analysis
          ...(analysis.ai_summary ? [
            new Paragraph({
              text: "AI ANALYSIS",
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "AI Summary: ", bold: true }),
              ],
            }),
            new Paragraph({
              text: analysis.ai_summary,
            }),
            new Paragraph({ text: "" }),
          ] : []),
          
          // Analysis Answers
          ...(answers && answers.length > 0 ? [
            new Paragraph({
              text: "ANALYSIS ANSWERS",
              heading: HeadingLevel.HEADING_2,
            }),
            ...answers.map((answer, index) => {
              const question = questions?.find(q => q.id === answer.question_id);
              return [
                new Paragraph({
                  children: [
                    new TextRun({ text: `${index + 1}. `, bold: true }),
                    new TextRun({ text: question?.question_text || 'Unknown question' }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "Answer: ", bold: true }),
                    new TextRun({ text: answer.answer_text || answer.answer_value || 'No answer provided' }),
                  ],
                }),
                new Paragraph({ text: "" }),
              ];
            }).flat(),
          ] : []),
          
          // Screenshots
          ...(screenshots && screenshots.length > 0 ? [
            new Paragraph({
              text: "CHART SCREENSHOTS",
              heading: HeadingLevel.HEADING_2,
            }),
            ...screenshots.map(screenshot => 
              new Paragraph({
                children: [
                  new TextRun({ text: "- ", bold: true }),
                  new TextRun({ text: screenshot.file_name }),
                  new TextRun({ text: ` (${screenshot.timeframe} timeframe)` }),
                ],
              })
            ),
            new Paragraph({ text: "" }),
          ] : []),
          
          // Disclaimer
          new Paragraph({
            text: "DISCLAIMER",
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            text: `This report is generated for ${analystName} based on their Top Down Analysis of ${analysis.currency_pair}. The AI analysis provided is for informational purposes only and should not be considered as trading advice. Always rely on your own analysis and risk management. Trading forex involves substantial risk of loss.`,
          }),
          new Paragraph({ text: "" }),
          
          // Footer
          new Paragraph({
            text: `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} | Trader's Journal - Top Down Analysis Report`,
            alignment: AlignmentType.CENTER,
          }),
        ],
      }],
    });

    console.log('Document created, packing...');
    
    // Pack the document
    const buffer = await Packer.toBuffer(doc);
    
    console.log('Document packed, size:', buffer.length);

    // Return the document as a .docx file
    const fileName = `TDA_${analysis.currency_pair}_${new Date(analysis.analysis_date).toISOString().split('T')[0]}.docx`;
    
    console.log('Sending response with filename:', fileName);
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': buffer.length.toString()
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
