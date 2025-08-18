import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';
import { TimeframeType } from '@/types/tda';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType
} from 'docx';

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

    const { analysisId, analysis_id } = await request.json();
    
    const finalAnalysisId = analysisId || analysis_id;
    
    if (!finalAnalysisId) {
      return NextResponse.json({ error: 'Analysis ID is required' }, { status: 400 });
    }

    // Fetch analysis data
    const { data: analysis, error: analysisError } = await supabase
      .from('top_down_analyses')
      .select('*')
      .eq('id', finalAnalysisId)
      .eq('user_id', user.id)
      .single();

    if (analysisError || !analysis) {
      console.log('Analysis error:', analysisError);
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Fetch user profile for analyst name
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    const analystName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user.email : user.email;

    // Fetch answers for the analysis
    const { data: answers, error: answersError } = await supabase
      .from('tda_answers')
      .select(`
        *,
        tda_questions (
          id,
          timeframe,
          question_text,
          question_type,
          options,
          order_index
        )
      `)
      .eq('analysis_id', finalAnalysisId)
      .order('tda_questions.order_index');

    if (answersError) {
      console.log('Answers error:', answersError);
      return NextResponse.json({ error: 'Failed to fetch answers' }, { status: 500 });
    }

    // Get unique timeframes from answers (only show selected timeframes)
    const selectedTimeframes = answers ? 
      Array.from(new Set(answers.map(a => a.tda_questions?.timeframe).filter(Boolean))) : [];

    // Special timeframes that use the detailed table format
    const specialTimeframes: TimeframeType[] = ['DAILY', 'H1', 'M15'];

    // Helper function to get timeframe display name
    const getTimeframeDisplayName = (timeframe: string) => {
      const mapping: Record<string, string> = {
        'DAILY': 'Daily Candle Chart',
        'H1': '1-Hour Candle Chart', 
        'M15': '15-Minute Chart',
        'H4': '4-Hour Chart',
        'M30': '30-Minute Chart',
        'M5': '5-Minute Chart',
        'M1': '1-Minute Chart'
      };
      return mapping[timeframe] || timeframe;
    };

    // Helper function to get trader type
    const getTraderType = (timeframe: string) => {
      const mapping: Record<string, string> = {
        'DAILY': 'Position Trader Sentiment',
        'H1': 'Swing / Day Trader Sentiment',
        'M15': 'Intraday Trader Sentiment',
        'H4': 'Swing Trader Sentiment',
        'M30': 'Day Trader Sentiment',
        'M5': 'Scalper Sentiment',
        'M1': 'Scalper Sentiment'
      };
      return mapping[timeframe] || 'Trader Sentiment';
    };

    // Helper function to create table cell
    const createCell = (text: string, bold: boolean = false, alignment: typeof AlignmentType[keyof typeof AlignmentType] = AlignmentType.LEFT, width: number = 20) => {
      return new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text, bold })
            ],
            alignment
          })
        ],
        width: { size: width, type: WidthType.PERCENTAGE }
      });
    };

    // Helper function to create empty cell
    const createEmptyCell = (width: number = 20) => {
      return new TableCell({
        children: [new Paragraph({ text: "" })],
        width: { size: width, type: WidthType.PERCENTAGE }
      });
    };

    // Helper function to get answer value
    const getAnswerValue = (answer: any) => {
      if (answer.answer_text) {
        return answer.answer_text;
      } else if (answer.answer_value && typeof answer.answer_value === 'object') {
        if (Array.isArray(answer.answer_value)) {
          return answer.answer_value.join(', ');
        } else {
          return JSON.stringify(answer.answer_value);
        }
      }
      return "";
    };

    // Helper function to get organized questions for a timeframe (matching TDA dialog structure)
    const getOrganizedQuestions = (timeframe: string) => {
      const timeframeQuestions = answers?.filter(a => a.tda_questions?.timeframe === timeframe) || [];
      
      if (timeframe === 'DAILY') {
        // DAILY layout: exact grouping as specified in TDA dialog
        const announcements = timeframeQuestions.filter(a => a.tda_questions?.question_text === 'Announcements');
        const analysis = timeframeQuestions.filter(a => a.tda_questions?.question_text === 'Analysis');
        
        // Row 1: Announcements
        const row1 = announcements;
        
        // Row 2: Current Daily Trend, Today's Key Support / Resistance Levels, Cycle Pressure, Notes
        const row2 = timeframeQuestions.filter(a => 
          a.tda_questions?.question_text === 'Current Daily Trend' ||
          a.tda_questions?.question_text === "Today's Key Support / Resistance Levels" ||
          a.tda_questions?.question_text === 'Cycle Pressure' ||
          (a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 5)
        );
        
        // Row 3: Previous Candle Colour, Today's Pivot Point Range, Notes
        const row3 = timeframeQuestions.filter(a => 
          a.tda_questions?.question_text === 'Previous Candle Colour' ||
          a.tda_questions?.question_text === "Today's Pivot Point Range" ||
          (a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 8)
        );
        
        // Row 4: Candle / Chart Patterns, Fibonacci: Swing Low, Fibonacci: Swing High
        const row4 = timeframeQuestions.filter(a => 
          a.tda_questions?.question_text === 'Candle / Chart Patterns' ||
          a.tda_questions?.question_text === 'Fibonacci: Swing Low' ||
          a.tda_questions?.question_text === 'Fibonacci: Swing High'
        );
        
        // Row 5: MACD Lines group
        const row5 = timeframeQuestions.filter(a => 
          a.tda_questions?.question_text.includes('MACD Lines') ||
          (a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 16)
        );
        
        // Row 6: MACD Histogram group
        const row6 = timeframeQuestions.filter(a => 
          a.tda_questions?.question_text.includes('MACD Histogram') ||
          (a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 20)
        );
        
        // Row 7: RSI group
        const row7 = timeframeQuestions.filter(a => 
          a.tda_questions?.question_text.includes('RSI') ||
          (a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 25)
        );
        
        // Row 8: REI group
        const row8 = timeframeQuestions.filter(a => 
          a.tda_questions?.question_text.includes('REI') ||
          (a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 29)
        );
        
        // Row 9: Analysis
        const row9 = analysis;
        
        return [row1, row2, row3, row4, row5, row6, row7, row8, row9].filter(row => row.length > 0);
        
      } else if (timeframe === 'H1') {
        // H1 layout: exact grouping as specified in TDA dialog
        const analysis = timeframeQuestions.filter(a => a.tda_questions?.question_text === 'Analysis');
        
        // Row 1: Current 1 Hour Trend, Session's Key Support / Resistance Levels, Cycle Pressure, Notes
        const row1 = timeframeQuestions.filter(a => 
          a.tda_questions?.question_text === 'Current 1 Hour Trend' ||
          a.tda_questions?.question_text === "Session's Key Support / Resistance Levels" ||
          a.tda_questions?.question_text === 'Cycle Pressure' ||
          (a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 4)
        );
        
        // Row 2: MACD Lines group
        const row2 = timeframeQuestions.filter(a => 
          a.tda_questions?.question_text.includes('MACD Lines') ||
          (a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 9)
        );
        
        // Row 3: MACD Histogram group
        const row3 = timeframeQuestions.filter(a => 
          a.tda_questions?.question_text.includes('MACD Histogram') ||
          (a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 13)
        );
        
        // Row 4: RSI group
        const row4 = timeframeQuestions.filter(a => 
          a.tda_questions?.question_text.includes('RSI') ||
          (a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 18)
        );
        
        // Row 5: REI group
        const row5 = timeframeQuestions.filter(a => 
          a.tda_questions?.question_text.includes('REI') ||
          (a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 22)
        );
        
        // Row 6: Analysis
        const row6 = analysis;
        
        return [row1, row2, row3, row4, row5, row6].filter(row => row.length > 0);
        
      } else if (timeframe === 'M15') {
        // M15 layout: exact grouping as specified in TDA dialog
        const analysis = timeframeQuestions.filter(a => a.tda_questions?.question_text === 'Analysis');
        
        // Row 1: Current 15 Minutes Trend, Today's Key Support / Resistance Levels, Cycle Pressure, Notes
        const row1 = timeframeQuestions.filter(a => 
          a.tda_questions?.question_text === 'Current 15 Minutes Trend' ||
          a.tda_questions?.question_text === "Today's Key Support / Resistance Levels" ||
          a.tda_questions?.question_text === 'Cycle Pressure' ||
          (a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 4)
        );
        
        // Row 2: Most Relevant Trend Line, Price Location in Pivot Range, Drive or Exhaustion
        const row2 = timeframeQuestions.filter(a => 
          a.tda_questions?.question_text === 'Most Relevant Trend Line' ||
          a.tda_questions?.question_text === 'Price Location in Pivot Range' ||
          a.tda_questions?.question_text === 'Drive or Exhaustion'
        );
        
        // Row 3: Candle / Chart Patterns, Fibonacci: Swing Low, Fibonacci: Swing High
        const row3 = timeframeQuestions.filter(a => 
          a.tda_questions?.question_text === 'Candle / Chart Patterns' ||
          a.tda_questions?.question_text === 'Fibonacci: Swing Low' ||
          a.tda_questions?.question_text === 'Fibonacci: Swing High'
        );
        
        // Row 4: MACD Lines group
        const row4 = timeframeQuestions.filter(a => 
          a.tda_questions?.question_text.includes('MACD Lines') ||
          (a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 15)
        );
        
        // Row 5: MACD Histogram group
        const row5 = timeframeQuestions.filter(a => 
          a.tda_questions?.question_text.includes('MACD Histogram') ||
          (a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 19)
        );
        
        // Row 6: RSI group
        const row6 = timeframeQuestions.filter(a => 
          a.tda_questions?.question_text.includes('RSI') ||
          (a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 24)
        );
        
        // Row 7: REI group
        const row7 = timeframeQuestions.filter(a => 
          a.tda_questions?.question_text.includes('REI') ||
          (a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 28)
        );
        
        // Row 8: Analysis
        const row8 = analysis;
        
        return [row1, row2, row3, row4, row5, row6, row7, row8].filter(row => row.length > 0);
      }
      
      return [];
    };

    // Helper function to create timeframe table for special timeframes (matching screenshot format)
    const createTimeframeTable = (timeframe: string, timeframeDisplay: string, traderType: string) => {
      const organizedRows = getOrganizedQuestions(timeframe);
      
      const rows: TableRow[] = [];
      
      // Header row
      rows.push(new TableRow({
        children: [
          createCell(timeframeDisplay, true, AlignmentType.CENTER, 100)
        ]
      }));
      
      // Trader type row
      rows.push(new TableRow({
        children: [
          createCell(traderType, false, AlignmentType.CENTER, 100)
        ]
      }));
      
      // Empty row for spacing
      rows.push(new TableRow({
        children: [
          createEmptyCell(100)
        ]
      }));

      // Create rows based on the organized structure
      organizedRows.forEach(rowQuestions => {
        if (rowQuestions.length === 0) return;
        
        const cells: TableCell[] = [];
        
        rowQuestions.forEach(answer => {
          const question = answer.tda_questions;
          if (!question) return;
          
          const value = getAnswerValue(answer);
          const cellWidth = 100 / rowQuestions.length;
          
          cells.push(createCell(
            `${question.question_text}: ${value || ""}`, 
            true, 
            AlignmentType.LEFT, 
            cellWidth
          ));
        });
        
        if (cells.length > 0) {
          rows.push(new TableRow({ children: cells }));
        }
      });

      return new Table({
        rows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        margins: {
          top: 200,
          bottom: 200,
          left: 200,
          right: 200
        }
      });
    };

    // Helper function to create simple timeframe section for other timeframes
    const createSimpleTimeframeSection = (timeframe: string, timeframeDisplay: string, answers: any[]) => {
      const timeframeAnswers = answers.filter(a => a.tda_questions?.timeframe === timeframe);
      
      const elements: any[] = [];
      
      // Header
      elements.push(new Paragraph({
        text: timeframeDisplay,
        heading: HeadingLevel.HEADING_3,
      }));
      
      elements.push(new Paragraph({
        text: getTraderType(timeframe),
        heading: HeadingLevel.HEADING_4,
      }));
      
      elements.push(new Paragraph({ text: "" }));

      // Add questions and answers
      timeframeAnswers.forEach(answer => {
        const question = answer.tda_questions;
        if (!question) return;

        const valueText = getAnswerValue(answer);

        elements.push(new Paragraph({
          children: [
            new TextRun({ text: `${question.question_text}: `, bold: true }),
            new TextRun({ text: valueText || "Not answered" })
          ]
        }));
      });

      return elements;
    };

    // Create document
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 360, // 0.25 inch - minimal margins
              right: 360,
              bottom: 360,
              left: 360
            }
          }
        },
        children: [
          // Watermark
          new Paragraph({
            text: "Trader's Journal",
            heading: HeadingLevel.HEADING_4,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }),
          
          // Header
          new Paragraph({
            text: "TOP DOWN ANALYSIS REPORT",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }),

          // Document Information (reformatted as requested)
          new Paragraph({
            children: [
              new TextRun({ text: "Analyst: ", bold: true }),
              new TextRun({ text: analystName }),
              new TextRun({ text: "     " }), // Spacing
              new TextRun({ text: "Analysis Date and Time: ", bold: true }),
              new TextRun({ text: new Date(analysis.analysis_date).toLocaleDateString() + " " + (analysis.analysis_time || "") })
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Currency Pair: ", bold: true }),
              new TextRun({ text: analysis.currency_pair })
            ],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({ text: "" }),

          // Announcements Section
          new Paragraph({
            text: "Medium & High Impact Announcements",
            heading: HeadingLevel.HEADING_3,
          }),
          new Paragraph({
            text: "(www.latestforexrates.com)",
            heading: HeadingLevel.HEADING_4,
          }),
          new Paragraph({ text: "" }),

          // Timeframe Analysis Sections
          ...selectedTimeframes.flatMap(timeframe => {
            const timeframeDisplay = getTimeframeDisplayName(timeframe);
            
            if (specialTimeframes.includes(timeframe as TimeframeType)) {
              // Use table format for special timeframes
              const traderType = getTraderType(timeframe);
              
              return [
                createTimeframeTable(timeframe, timeframeDisplay, traderType),
                new Paragraph({ text: "" })
              ];
            } else {
              // Use simple format for other timeframes
              return createSimpleTimeframeSection(timeframe, timeframeDisplay, answers || []);
            }
          })
        ]
      }]
    });

    // Generate document buffer
    const buffer = await Packer.toBuffer(doc);

    // Return the document
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="TDA_${analysis.currency_pair}_${analysis.analysis_date}.docx"`
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export document' }, { status: 500 });
  }
}
