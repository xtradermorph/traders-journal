import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';
import { TimeframeType } from '@/types/tda';

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
    const { 
      Document, 
      Packer, 
      Paragraph, 
      TextRun, 
      HeadingLevel, 
      AlignmentType,
      Table,
      TableRow,
      TableCell,
      WidthType,
      BorderStyle
    } = await import('docx');
    
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

    // Helper function to create timeframe table
    const createTimeframeTable = (timeframe: string, timeframeDisplay: string, traderType: string) => {
      const rows = [
        // Header row
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: timeframeDisplay, heading: HeadingLevel.HEADING_3 })],
              width: { size: 100, type: WidthType.PERCENTAGE }
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: traderType, heading: HeadingLevel.HEADING_4 })],
              width: { size: 100, type: WidthType.PERCENTAGE }
            })
          ]
        }),
        // Column headers
        new TableRow({
          children: [
            createCell("", false, AlignmentType.LEFT, 25),
            createCell("Details/Values", true, AlignmentType.CENTER, 25),
            createCell("Sentiment/Fibonacci", true, AlignmentType.CENTER, 25),
            createCell("Swing Levels", true, AlignmentType.CENTER, 15),
            createCell("Notes", true, AlignmentType.CENTER, 10)
          ]
        })
      ];

      // Add specific rows based on timeframe
      if (timeframe === 'DAILY') {
        const dailyRows = [
          { label: "Current Daily Trend", options: ["Long", "Short"] },
          { label: "Today's Key Support / Resistance Levels", options: [] },
          { label: "Previous Candle Colour", options: ["Red", "Green"] },
          { label: "Today's Pivot Point Range", options: ["Mid S2 to MidR1", "MidS1 to MidR2"] },
          { label: "Candle / Chart Patterns", options: [] },
          { label: "MACD Lines", options: ["Above Waterline", "Below Waterline", "Blue Below Red", "Blue Above Red"] },
          { label: "MACD Histogram", options: ["Below Waterline", "Above Waterline", "Moving Up", "Moving Down"] },
          { label: "RSI", options: ["Oversold", "NZ From Oversold", "Overbought", "NZ From Overbought", "Heading Up", "Heading Down", "Heading Sideways", "B Below Y", "B Above Y"] },
          { label: "REI", options: ["Oversold", "NZ From Oversold", "Overbought", "NZ From Overbought", "Heading Up", "Heading Down", "Heading Sideways"] },
          { label: "Analysis", options: [] }
        ];

                  dailyRows.forEach(row => {
            rows.push(new TableRow({
              children: [
                createCell(row.label, true, AlignmentType.LEFT, 25),
                createEmptyCell(25),
                createCell("Cycle Pressure: Bullish/Bearish\nFibonacci: Converging/Diverging/Parallel", false, AlignmentType.LEFT, 25),
                createEmptyCell(15),
                createEmptyCell(10)
              ]
            }));
          });
      } else if (timeframe === 'H1') {
        const h1Rows = [
          { label: "Current 1-Hour Trend", options: ["Long", "Short"] },
          { label: "Session's Key Support / Resistance Levels", options: [] },
          { label: "MACD Lines", options: ["Above Waterline", "Below Waterline", "Blue Below Red", "Blue Above Red"] },
          { label: "MACD Histogram", options: ["Below Waterline", "Above Waterline", "Moving Up", "Moving Down"] },
          { label: "RSI", options: ["Oversold", "NZ From Oversold", "Overbought", "NZ From Overbought", "Heading Up", "Heading Down", "Heading Sideways", "B Below Y", "B Above Y"] },
          { label: "REI", options: ["Oversold", "NZ From Oversold", "Overbought", "NZ From Overbought", "Heading Up", "Heading Down", "Heading Sideways"] },
          { label: "Analysis", options: [] }
        ];

        h1Rows.forEach(row => {
          rows.push(new TableRow({
            children: [
              createCell(row.label, true, AlignmentType.LEFT, 25),
              createEmptyCell(25),
              createCell("Cycle Pressure: Bullish/Bearish\nFibonacci: Converging/Diverging/Parallel", false, AlignmentType.LEFT, 25),
              createEmptyCell(15),
              createEmptyCell(10)
            ]
          }));
        });
      } else if (timeframe === 'M15') {
        const m15Rows = [
          { label: "Current 15-Minute Trend", options: ["Long", "Short", "Sideways"] },
          { label: "Session's Key Support / Resistance Levels", options: [] },
          { label: "Most Relevant Trend Line", options: ["Support", "Resistance", "Latest Swing Low", "Latest Swing High"] },
          { label: "Price Location in Pivot Range", options: ["From Low Moving Up", "Nearing Top", "From High Moving Down", "Nearing Bottom", "From Middle Sideways"] },
          { label: "Drive or Exhaustion", options: ["Long Drive Zone", "Long Exhaustion Zone", "Short Drive Zone", "Short Exhaustion Zone"] },
          { label: "Candle / Chart Patterns", options: [] },
          { label: "MACD Lines", options: ["Above Waterline", "Below Waterline", "Blue Below Red", "Blue Above Red"] },
          { label: "MACD Histogram", options: ["Below Waterline", "Above Waterline", "Moving Up", "Moving Down"] },
          { label: "RSI", options: ["Oversold", "NZ From Oversold", "Overbought", "NZ From Overbought", "Heading Up", "Heading Down", "Heading Sideways", "B Below Y", "B Above Y"] },
          { label: "REI", options: ["Oversold", "NZ From Oversold", "Overbought", "NZ From Overbought", "Heading Up", "Heading Down", "Heading Sideways"] },
          { label: "Analysis", options: [] },
          { label: "Trade Entry & Exit Details", options: [] },
          { label: "Lessons Learned", options: [] }
        ];

        m15Rows.forEach(row => {
          rows.push(new TableRow({
            children: [
              createCell(row.label, true, AlignmentType.LEFT, 25),
              createEmptyCell(25),
              createCell("Cycle Pressure: Bullish/Bearish\nFibonacci: Converging/Diverging/Parallel", false, AlignmentType.LEFT, 25),
              createEmptyCell(15),
              createEmptyCell(10)
            ]
          }));
        });
      }

      return new Table({
        rows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
          insideVertical: { style: BorderStyle.SINGLE, size: 1 }
        }
      });
    };

    // Helper function to create simple timeframe section
    const createSimpleTimeframeSection = (timeframe: string, timeframeDisplay: string, answers: any[], questions: any[]) => {
      const timeframeQuestions = questions.filter(q => q.timeframe === timeframe);
      const timeframeAnswers = answers.filter(a => 
        timeframeQuestions.some(q => q.id === a.question_id)
      );

      const sections = [
        new Paragraph({
          text: timeframeDisplay,
          heading: HeadingLevel.HEADING_3,
        }),
        new Paragraph({ text: "" })
      ];

      timeframeQuestions.forEach(question => {
        const answer = timeframeAnswers.find(a => a.question_id === question.id);
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: question.question_text, bold: true })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Answer: " }),
              new TextRun({ text: answer?.answer_text || answer?.answer_value || 'No answer provided' })
            ]
          }),
          new Paragraph({ text: "" })
        );
      });

      return sections;
    };

    // Get unique timeframes from questions
    const uniqueTimeframes = questions ? 
      Array.from(new Set(questions.map(q => q.timeframe))).sort() : [];

    // Define special timeframes that need the table format
    const specialTimeframes: TimeframeType[] = ['DAILY', 'H1', 'M15'];
    
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440
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
          ...(() => {
            const sections: any[] = [];
            
            // Separate timeframes into special and regular
            const specialTimeframesInAnalysis = uniqueTimeframes.filter(tf => 
              specialTimeframes.includes(tf as TimeframeType)
            );
            const regularTimeframesInAnalysis = uniqueTimeframes.filter(tf => 
              !specialTimeframes.includes(tf as TimeframeType)
            );

            // Add special timeframe tables if any exist
            if (specialTimeframesInAnalysis.length > 0) {
              specialTimeframesInAnalysis.forEach(timeframe => {
                const timeframeDisplay = getTimeframeDisplayName(timeframe);
                const traderType = timeframe === 'DAILY' ? 'Position Trader Sentiment' :
                                 timeframe === 'H1' ? 'Swing / Day Trader Sentiment' :
                                 'Intraday Trader Sentiment';
                
                sections.push(
                  createTimeframeTable(timeframe, timeframeDisplay, traderType),
                  new Paragraph({ text: "" })
                );
              });
            }

            // Add regular timeframe sections if any exist
            if (regularTimeframesInAnalysis.length > 0) {
              // Add separator if we have both types
              if (specialTimeframesInAnalysis.length > 0) {
                sections.push(
                  new Paragraph({
                    text: "OTHER TIMEFRAMES",
                    heading: HeadingLevel.HEADING_2,
                  }),
                  new Paragraph({ text: "" })
                );
              }

              regularTimeframesInAnalysis.forEach(timeframe => {
                const timeframeDisplay = getTimeframeDisplayName(timeframe);
                sections.push(...createSimpleTimeframeSection(timeframe, timeframeDisplay, answers || [], questions || []));
              });
            }

            return sections;
          })(),

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

// Helper function to get timeframe display name
function getTimeframeDisplayName(timeframe: string): string {
  switch (timeframe) {
    case 'DAILY': return 'Daily Candle Chart';
    case 'H1': return '1-Hour Candle Chart';
    case 'H2': return '2-Hour Candle Chart';
    case 'H4': return '4-Hour Candle Chart';
    case 'H8': return '8-Hour Candle Chart';
    case 'M15': return '15-Minute Chart';
    case 'M30': return '30-Minute Chart';
    case 'M10': return '10-Minute Chart';
    case 'W1': return 'Weekly Chart';
    case 'MN1': return 'Monthly Chart';
    default: return `${timeframe} Chart`;
  }
}
