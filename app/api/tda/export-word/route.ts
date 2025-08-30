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
  WidthType,
  BorderStyle,
  ImageRun
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
      .eq('analysis_id', finalAnalysisId);

    if (answersError) {
      console.log('Answers error:', answersError);
      return NextResponse.json({ error: 'Failed to fetch answers' }, { status: 500 });
    }

    // Fetch screenshots for the analysis
    const { data: screenshots, error: screenshotsError } = await supabase
      .from('tda_screenshots')
      .select('*')
      .eq('analysis_id', finalAnalysisId);

    if (screenshotsError) {
      console.log('Screenshots error:', screenshotsError);
      return NextResponse.json({ error: 'Failed to fetch screenshots' }, { status: 500 });
    }

    // Helper function to download image and convert to buffer
    const downloadImage = async (url: string): Promise<Buffer | null> => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.log(`Failed to download image from ${url}: ${response.status}`);
          return null;
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } catch (error) {
        console.log(`Error downloading image from ${url}:`, error);
        return null;
      }
    };

    // Download all screenshots
    const screenshotBuffers: { [timeframe: string]: Buffer } = {};
    if (screenshots && screenshots.length > 0) {
      for (const screenshot of screenshots) {
        const buffer = await downloadImage(screenshot.file_url);
        if (buffer) {
          screenshotBuffers[screenshot.timeframe] = buffer;
        }
      }
    }

         // Get unique timeframes from answers and sort from higher to lower timeframes
     // Using only the timeframes that are actually used in the Top Down Analysis Setup dialog
     const timeframeOrder = ['MN1', 'W1', 'DAILY', 'H8', 'H4', 'H2', 'H1', 'M30', 'M15', 'M10'];
     const selectedTimeframes = answers ? 
       Array.from(new Set(answers.map(a => a.tda_questions?.timeframe).filter(Boolean)))
         .sort((a, b) => {
           const aIndex = timeframeOrder.indexOf(a);
           const bIndex = timeframeOrder.indexOf(b);
           return aIndex - bIndex; // Sort from higher to lower timeframes
         }) : [];

    // Special timeframes that use the detailed table format
    const specialTimeframes: TimeframeType[] = ['DAILY', 'H1', 'M15'];

         // Helper function to get timeframe display name
     const getTimeframeDisplayName = (timeframe: string) => {
       const mapping: Record<string, string> = {
         'MN1': 'Monthly Chart',
         'W1': 'Weekly Chart',
         'DAILY': 'Daily Candle Chart',
         'H8': '8-Hour Chart',
         'H4': '4-Hour Chart',
         'H2': '2-Hour Chart',
         'H1': '1-Hour Candle Chart', 
         'M30': '30-Minute Chart',
         'M15': '15-Minute Chart',
         'M10': '10-Minute Chart'
       };
       return mapping[timeframe] || timeframe;
     };

         // Helper function to get trader type
     const getTraderType = (timeframe: string) => {
       const mapping: Record<string, string> = {
         'MN1': 'Long-term Position Trader Sentiment',
         'W1': 'Position Trader Sentiment',
         'DAILY': 'Position Trader Sentiment',
         'H8': 'Swing Trader Sentiment',
         'H4': 'Swing Trader Sentiment',
         'H2': 'Swing / Day Trader Sentiment',
         'H1': 'Swing / Day Trader Sentiment',
         'M30': 'Day Trader Sentiment',
         'M15': 'Intraday Trader Sentiment',
         'M10': 'Intraday Trader Sentiment'
       };
       return mapping[timeframe] || 'Trader Sentiment';
     };

    // Helper function to create table cell with color coding
    const createCell = (text: string, bold: boolean = false, alignment: typeof AlignmentType[keyof typeof AlignmentType] = AlignmentType.LEFT, width: number = 20, color?: string) => {
      return new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text, bold, color })
            ],
            alignment
          })
        ],
        width: { size: width, type: WidthType.PERCENTAGE },
        margins: {
          top: 100,
          bottom: 100,
          left: 100,
          right: 100
        }
      });
    };

    // Helper function to create cell with mixed colored text
    const createMixedColorCell = (text: string, bold: boolean = false, alignment: typeof AlignmentType[keyof typeof AlignmentType] = AlignmentType.LEFT, width: number = 20, isAnalysis: boolean = false) => {
      const textRuns: TextRun[] = [];
      
      // Split text into question and answer parts
      const colonIndex = text.indexOf(':');
      if (colonIndex === -1) {
        // No colon found, treat as regular text
        const words = text.split(' ');
        for (let i = 0; i < words.length; i++) {
          const word = words[i];
          const lowerWord = word.toLowerCase();
          let color: string | undefined;
          
          if (lowerWord === 'bullish' || lowerWord === 'long' || lowerWord === 'oversold' || lowerWord === 'green') {
            color = "008000";
          } else if (lowerWord === 'bearish' || lowerWord === 'short' || lowerWord === 'overbought' || lowerWord === 'red') {
            color = "ff0000";
          } else if (lowerWord === 'nz' && i + 2 < words.length && words[i + 1].toLowerCase() === 'from' && words[i + 2].toLowerCase() === 'oversold') {
            textRuns.push(new TextRun({ 
              text: word + ' ' + words[i + 1] + ' ' + words[i + 2] + (i + 2 < words.length - 1 ? ' ' : ''), 
              bold, 
              color: "008000"
            }));
            i += 2;
            continue;
          } else if (lowerWord === 'nz' && i + 2 < words.length && words[i + 1].toLowerCase() === 'from' && words[i + 2].toLowerCase() === 'overbought') {
            textRuns.push(new TextRun({ 
              text: word + ' ' + words[i + 1] + ' ' + words[i + 2] + (i + 2 < words.length - 1 ? ' ' : ''), 
              bold, 
              color: "ff0000"
            }));
            i += 2;
            continue;
          }
          
          textRuns.push(new TextRun({ 
            text: word + (i < words.length - 1 ? ' ' : ''), 
            bold, 
            color: color || "000000"
          }));
        }
      } else {
        // Split into question and answer
        const question = text.substring(0, colonIndex + 1); // Include the colon
        const answer = text.substring(colonIndex + 1).trim();
        
        // Add question (always bold)
        textRuns.push(new TextRun({ 
          text: question, 
          bold: true,
          color: "000000"
        }));
        
        // Add line break
        textRuns.push(new TextRun({ 
          text: "\n", 
          break: 1
        }));
        
        // Add answer with color coding
        if (answer) {
          const answerWords = answer.split(' ');
          for (let i = 0; i < answerWords.length; i++) {
            const word = answerWords[i];
            const lowerWord = word.toLowerCase();
            let color: string | undefined;
            
            if (lowerWord === 'bullish' || lowerWord === 'long' || lowerWord === 'oversold' || lowerWord === 'green') {
              color = "008000";
            } else if (lowerWord === 'bearish' || lowerWord === 'short' || lowerWord === 'overbought' || lowerWord === 'red') {
              color = "ff0000";
            } else if (lowerWord === 'nz' && i + 2 < answerWords.length && answerWords[i + 1].toLowerCase() === 'from' && answerWords[i + 2].toLowerCase() === 'oversold') {
              textRuns.push(new TextRun({ 
                text: word + ' ' + answerWords[i + 1] + ' ' + answerWords[i + 2] + (i + 2 < answerWords.length - 1 ? ' ' : ''), 
                bold: false, 
                color: "008000"
              }));
              i += 2;
              continue;
            } else if (lowerWord === 'nz' && i + 2 < answerWords.length && answerWords[i + 1].toLowerCase() === 'from' && answerWords[i + 2].toLowerCase() === 'overbought') {
              textRuns.push(new TextRun({ 
                text: word + ' ' + answerWords[i + 1] + ' ' + answerWords[i + 2] + (i + 2 < answerWords.length - 1 ? ' ' : ''), 
                bold: false, 
                color: "ff0000"
              }));
              i += 2;
              continue;
            }
            
            textRuns.push(new TextRun({ 
              text: word + (i < answerWords.length - 1 ? ' ' : ''), 
              bold: false, 
              color: color || "000000"
            }));
          }
        }
      }
      
      return new TableCell({
        children: [
          new Paragraph({
            children: textRuns,
            alignment,
            spacing: {
              before: isAnalysis ? 80 : 40,
              after: isAnalysis ? 80 : 40
            }
          })
        ],
        width: { size: width, type: WidthType.PERCENTAGE },
        margins: {
          top: isAnalysis ? 120 : 60,
          bottom: isAnalysis ? 120 : 60,
          left: 60,
          right: 60
        }
      });
    };

    // Helper function to create empty cell
    const createEmptyCell = (width: number = 20) => {
      return new TableCell({
        children: [new Paragraph({ text: "" })],
        width: { size: width, type: WidthType.PERCENTAGE },
        margins: {
          top: 100,
          bottom: 100,
          left: 100,
          right: 100
        }
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

    // Helper function to get color for text based on specific keywords
    const getTextColor = (text: string): string | undefined => {
      if (!text || typeof text !== 'string') return undefined;
      
      const lowerText = text.toLowerCase();
      
      // Only color exact matches, not partial matches
      if (lowerText === 'bullish' || lowerText === 'long' || lowerText === 'oversold' || lowerText === 'nz from oversold' || lowerText === 'green') {
        return "008000"; // Green
      }
      
      if (lowerText === 'bearish' || lowerText === 'short' || lowerText === 'overbought' || lowerText === 'nz from overbought' || lowerText === 'red') {
        return "ff0000"; // Red
      }
      
      return undefined; // Default color (black)
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
        const row2Questions = [
          timeframeQuestions.find(a => a.tda_questions?.question_text === 'Current Daily Trend'),
          timeframeQuestions.find(a => a.tda_questions?.question_text === "Today's Key Support / Resistance Levels"),
          timeframeQuestions.find(a => a.tda_questions?.question_text === 'Cycle Pressure')
        ].filter(Boolean);
        const row2Notes = timeframeQuestions.find(a => a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 5);
        const row2 = row2Notes ? [...row2Questions, row2Notes] : row2Questions;
        
        // Row 3: Previous Candle Colour, Today's Pivot Point Range, Notes
        const row3Questions = [
          timeframeQuestions.find(a => a.tda_questions?.question_text === 'Previous Candle Colour'),
          timeframeQuestions.find(a => a.tda_questions?.question_text === "Today's Pivot Point Range")
        ].filter(Boolean);
        const row3Notes = timeframeQuestions.find(a => a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 8);
        const row3 = row3Notes ? [...row3Questions, row3Notes] : row3Questions;
        
        // Row 4: Candle / Chart Patterns, Fibonacci: Swing Low, Fibonacci: Swing High
        const row4 = [
          timeframeQuestions.find(a => a.tda_questions?.question_text === 'Candle / Chart Patterns'),
          timeframeQuestions.find(a => a.tda_questions?.question_text === 'Fibonacci: Swing Low'),
          timeframeQuestions.find(a => a.tda_questions?.question_text === 'Fibonacci: Swing High')
        ].filter(Boolean);
        
        // Row 5: MACD Lines group + Notes
        const macdLinesQuestions = timeframeQuestions.filter(a => a.tda_questions?.question_text.includes('MACD Lines'));
        const row5Notes = timeframeQuestions.find(a => a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 16);
        const row5 = row5Notes ? [...macdLinesQuestions, row5Notes] : macdLinesQuestions;
        
        // Row 6: MACD Histogram group + Notes
        const macdHistogramQuestions = timeframeQuestions.filter(a => a.tda_questions?.question_text.includes('MACD Histogram'));
        const row6Notes = timeframeQuestions.find(a => a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 20);
        const row6 = row6Notes ? [...macdHistogramQuestions, row6Notes] : macdHistogramQuestions;
        
        // Row 7: RSI group + Notes
        const rsiQuestions = timeframeQuestions.filter(a => a.tda_questions?.question_text.includes('RSI'));
        const row7Notes = timeframeQuestions.find(a => a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 25);
        const row7 = row7Notes ? [...rsiQuestions, row7Notes] : rsiQuestions;
        
        // Row 8: REI group + Notes
        const reiQuestions = timeframeQuestions.filter(a => a.tda_questions?.question_text.includes('REI'));
        const row8Notes = timeframeQuestions.find(a => a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 29);
        const row8 = row8Notes ? [...reiQuestions, row8Notes] : reiQuestions;
        
        // Row 9: Analysis
        const row9 = analysis;
        
        return [row1, row2, row3, row4, row5, row6, row7, row8, row9].filter(row => row.length > 0);
        
      } else if (timeframe === 'H1') {
        // H1 layout: exact grouping as specified in TDA dialog
        const analysis = timeframeQuestions.filter(a => a.tda_questions?.question_text === 'Analysis');
        
        // Row 1: Current 1 Hour Trend, Session's Key Support / Resistance Levels, Cycle Pressure, Notes
        const row1Questions = [
          timeframeQuestions.find(a => a.tda_questions?.question_text === 'Current 1 Hour Trend'),
          timeframeQuestions.find(a => a.tda_questions?.question_text === "Session's Key Support / Resistance Levels"),
          timeframeQuestions.find(a => a.tda_questions?.question_text === 'Cycle Pressure')
        ].filter(Boolean);
        const row1Notes = timeframeQuestions.find(a => a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 4);
        const row1 = row1Notes ? [...row1Questions, row1Notes] : row1Questions;
        
        // Row 2: MACD Lines group + Notes
        const macdLinesQuestions = timeframeQuestions.filter(a => a.tda_questions?.question_text.includes('MACD Lines'));
        const row2Notes = timeframeQuestions.find(a => a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 9);
        const row2 = row2Notes ? [...macdLinesQuestions, row2Notes] : macdLinesQuestions;
        
        // Row 3: MACD Histogram group + Notes
        const macdHistogramQuestions = timeframeQuestions.filter(a => a.tda_questions?.question_text.includes('MACD Histogram'));
        const row3Notes = timeframeQuestions.find(a => a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 13);
        const row3 = row3Notes ? [...macdHistogramQuestions, row3Notes] : macdHistogramQuestions;
        
        // Row 4: RSI group + Notes
        const rsiQuestions = timeframeQuestions.filter(a => a.tda_questions?.question_text.includes('RSI'));
        const row4Notes = timeframeQuestions.find(a => a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 18);
        const row4 = row4Notes ? [...rsiQuestions, row4Notes] : rsiQuestions;
        
        // Row 5: REI group + Notes
        const reiQuestions = timeframeQuestions.filter(a => a.tda_questions?.question_text.includes('REI'));
        const row5Notes = timeframeQuestions.find(a => a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 22);
        const row5 = row5Notes ? [...reiQuestions, row5Notes] : reiQuestions;
        
        // Row 6: Analysis
        const row6 = analysis;
        
        return [row1, row2, row3, row4, row5, row6].filter(row => row.length > 0);
        
      } else if (timeframe === 'M15') {
        // M15 layout: exact grouping as specified in TDA dialog
        const analysis = timeframeQuestions.filter(a => a.tda_questions?.question_text === 'Analysis');
        
        // Row 1: Current 15 Minutes Trend, Today's Key Support / Resistance Levels, Cycle Pressure, Notes
        const row1Questions = [
          timeframeQuestions.find(a => a.tda_questions?.question_text === 'Current 15 Minutes Trend'),
          timeframeQuestions.find(a => a.tda_questions?.question_text === "Today's Key Support / Resistance Levels"),
          timeframeQuestions.find(a => a.tda_questions?.question_text === 'Cycle Pressure')
        ].filter(Boolean);
        const row1Notes = timeframeQuestions.find(a => a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 4);
        const row1 = row1Notes ? [...row1Questions, row1Notes] : row1Questions;
        
        // Row 2: Most Relevant Trend Line, Price Location in Pivot Range, Drive or Exhaustion
        const row2 = [
          timeframeQuestions.find(a => a.tda_questions?.question_text === 'Most Relevant Trend Line'),
          timeframeQuestions.find(a => a.tda_questions?.question_text === 'Price Location in Pivot Range'),
          timeframeQuestions.find(a => a.tda_questions?.question_text === 'Drive or Exhaustion')
        ].filter(Boolean);
        
        // Row 3: Candle / Chart Patterns, Fibonacci: Swing Low, Fibonacci: Swing High
        const row3 = [
          timeframeQuestions.find(a => a.tda_questions?.question_text === 'Candle / Chart Patterns'),
          timeframeQuestions.find(a => a.tda_questions?.question_text === 'Fibonacci: Swing Low'),
          timeframeQuestions.find(a => a.tda_questions?.question_text === 'Fibonacci: Swing High')
        ].filter(Boolean);
        
        // Row 4: MACD Lines group + Notes
        const macdLinesQuestions = timeframeQuestions.filter(a => a.tda_questions?.question_text.includes('MACD Lines'));
        const row4Notes = timeframeQuestions.find(a => a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 15);
        const row4 = row4Notes ? [...macdLinesQuestions, row4Notes] : macdLinesQuestions;
        
        // Row 5: MACD Histogram group + Notes
        const macdHistogramQuestions = timeframeQuestions.filter(a => a.tda_questions?.question_text.includes('MACD Histogram'));
        const row5Notes = timeframeQuestions.find(a => a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 19);
        const row5 = row5Notes ? [...macdHistogramQuestions, row5Notes] : macdHistogramQuestions;
        
        // Row 6: RSI group + Notes
        const rsiQuestions = timeframeQuestions.filter(a => a.tda_questions?.question_text.includes('RSI'));
        const row6Notes = timeframeQuestions.find(a => a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 24);
        const row6 = row6Notes ? [...rsiQuestions, row6Notes] : rsiQuestions;
        
        // Row 7: REI group + Notes
        const reiQuestions = timeframeQuestions.filter(a => a.tda_questions?.question_text.includes('REI'));
        const row7Notes = timeframeQuestions.find(a => a.tda_questions?.question_text === 'Notes' && a.tda_questions?.order_index === 28);
        const row7 = row7Notes ? [...reiQuestions, row7Notes] : reiQuestions;
        
        // Row 8: Analysis
        const row8 = analysis;
        
        return [row1, row2, row3, row4, row5, row6, row7, row8].filter(row => row.length > 0);
      }
      
      return [];
    };

    // Helper function to create flexible timeframe section (no table constraints)
    const createFlexibleTimeframeSection = (timeframe: string, timeframeDisplay: string, traderType: string) => {
      const organizedRows = getOrganizedQuestions(timeframe);
      
      const elements: any[] = [];
      
      // Header - timeframe display (centered, black, uppercase, larger font)
      elements.push(new Paragraph({
        children: [
          new TextRun({ 
            text: timeframeDisplay.toUpperCase(), 
            bold: true,
            color: "000000", // Black color
            size: 32 // Larger font size for main header
          })
        ],
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER
      }));
      
      // Trader type (centered, black, uppercase, smaller font)
      elements.push(new Paragraph({
        children: [
          new TextRun({ 
            text: traderType.toUpperCase(), 
            bold: true,
            color: "000000", // Black color
            size: 20 // Smaller font size for trader sentiment
          })
        ],
        heading: HeadingLevel.HEADING_3,
        alignment: AlignmentType.CENTER
      }));
      
      elements.push(new Paragraph({ text: "" }));

      // Add screenshot if available for this timeframe
      if (screenshotBuffers[timeframe]) {
        try {
          const image = new ImageRun({
            data: screenshotBuffers[timeframe],
            transformation: {
              width: 500,
              height: 300,
            },
          });
          
          elements.push(new Paragraph({
            children: [image],
            alignment: AlignmentType.CENTER,
            spacing: {
              before: 200,
              after: 200
            }
          }));
          
          elements.push(new Paragraph({ text: "" }));
        } catch (error) {
          console.log(`Error adding image for timeframe ${timeframe}:`, error);
          // Fallback to placeholder if image fails
          elements.push(new Paragraph({
            children: [
              new TextRun({ 
                text: `[Chart Screenshot for ${timeframeDisplay}]`, 
                bold: true,
                color: "1e40af",
                size: 16
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
              before: 200,
              after: 200
            }
          }));
          
          elements.push(new Paragraph({ text: "" }));
        }
      }

      // Create flexible rows with individual question positioning
      organizedRows.forEach(rowQuestions => {
        if (rowQuestions.length === 0) return;
        
        // Check if this row contains Analysis questions
        const hasAnalysis = rowQuestions.some(answer => 
          answer.tda_questions?.question_text === 'Analysis'
        );
        
        // Create a table row for this group of questions
        const cells: TableCell[] = [];
        
        rowQuestions.forEach(answer => {
          const question = answer.tda_questions;
          if (question) {
            const value = getAnswerValue(answer);
            const cellWidth = 100 / rowQuestions.length; // Dynamic width based on actual questions
            
            // Check if this is an Analysis question for special formatting
            const isAnalysis = question.question_text === 'Analysis';
            
            // Create cell with mixed color text
            cells.push(createMixedColorCell(
              `${question.question_text}: ${value || ""}`, 
              true, 
              AlignmentType.LEFT, 
              cellWidth,
              isAnalysis // Pass analysis flag for special formatting
            ));
          }
        });
        
        if (cells.length > 0) {
          // Create table row with flexible columns
          const tableRow = new TableRow({ children: cells });
          
          // Create table with this single row
          const table = new Table({
            rows: [tableRow],
            width: { size: 100, type: WidthType.PERCENTAGE },
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100
            },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE }
            }
          });
          
          elements.push(table);
          elements.push(new Paragraph({ text: "" })); // Spacing between rows
        }
      });

      return elements;
    };

         // Helper function to create simple timeframe section for other timeframes
     const createSimpleTimeframeSection = (timeframe: string, timeframeDisplay: string, answers: any[]) => {
       const timeframeAnswers = answers.filter(a => a.tda_questions?.timeframe === timeframe);
       
       const elements: any[] = [];
       
       // Header - timeframe display (centered, black, uppercase, larger font)
       elements.push(new Paragraph({
         children: [
           new TextRun({ 
             text: timeframeDisplay.toUpperCase(), 
             bold: true,
             color: "000000", // Black color
             size: 32 // Larger font size for main header
           })
         ],
         heading: HeadingLevel.HEADING_2,
         alignment: AlignmentType.CENTER
       }));
       
       // Trader type (centered, black, uppercase, smaller font)
       elements.push(new Paragraph({
         children: [
           new TextRun({ 
             text: getTraderType(timeframe).toUpperCase(), 
             bold: true,
             color: "000000", // Black color
             size: 20 // Smaller font size for trader sentiment
           })
         ],
         heading: HeadingLevel.HEADING_3,
         alignment: AlignmentType.CENTER
       }));
       
       elements.push(new Paragraph({ text: "" }));

               // Add screenshot if available for this timeframe
        if (screenshotBuffers[timeframe]) {
          try {
            const image = new ImageRun({
              data: screenshotBuffers[timeframe],
              transformation: {
                width: 500,
                height: 300,
              },
            });
            
            elements.push(new Paragraph({
              children: [image],
              alignment: AlignmentType.CENTER,
              spacing: {
                before: 200,
                after: 200
              }
            }));
            
            elements.push(new Paragraph({ text: "" }));
          } catch (error) {
            console.log(`Error adding image for timeframe ${timeframe}:`, error);
            // Fallback to placeholder if image fails
            elements.push(new Paragraph({
              children: [
                new TextRun({ 
                  text: `[Chart Screenshot for ${timeframeDisplay}]`, 
                  bold: true,
                  color: "1e40af",
                  size: 16
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: {
                before: 200,
                after: 200
              }
            }));
            
            elements.push(new Paragraph({ text: "" }));
          }
        }

               // Add questions and answers
        timeframeAnswers.forEach(answer => {
          const question = answer.tda_questions;
          if (!question) return;

          const valueText = getAnswerValue(answer);
          const color = getTextColor(valueText);
          const isAnalysis = question.question_text === 'Analysis';

          // Special formatting for Analysis sections
          if (isAnalysis) {
            elements.push(new Paragraph({
              children: [
                new TextRun({ 
                  text: "Analysis: ", 
                  bold: true,
                  size: 24, // Larger font for Analysis
                  color: "1e40af" // Blue color for Analysis
                }),
                new TextRun({ 
                  text: "\n", 
                  break: 1
                }),
                new TextRun({ 
                  text: valueText || "Not answered", 
                  color: color || "000000",
                  size: 20
                })
              ],
              spacing: {
                before: 80,
                after: 80
              }
            }));
          } else {
            // Regular question/answer formatting with line break
            elements.push(new Paragraph({
              children: [
                new TextRun({ 
                  text: `${question.question_text}: `, 
                  bold: true,
                  color: "000000"
                }),
                new TextRun({ 
                  text: "\n", 
                  break: 1
                }),
                new TextRun({ 
                  text: valueText || "Not answered", 
                  color: color || "000000"
                })
              ]
            }));
          }
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
            children: [
              new TextRun({ 
                text: "TOP DOWN ANALYSIS REPORT", 
                bold: true,
                color: "000000" // Black color
              })
            ],
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }),
          
          // Document Information (reformatted as requested)
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: "Analyst: ", bold: true }),
                          new TextRun({ text: analystName })
                        ]
                      })
                    ],
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    margins: { top: 100, bottom: 100, left: 100, right: 100 }
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: "Analysis Date and Time: ", bold: true }),
                          new TextRun({ text: new Date(analysis.analysis_date).toLocaleDateString() + " " + (analysis.analysis_time ? analysis.analysis_time.substring(0, 5) : "") })
                        ],
                        alignment: AlignmentType.RIGHT
                      })
                    ],
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    margins: { top: 100, bottom: 100, left: 100, right: 100 }
                  })
                ]
              })
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE }
            }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Currency Pair: ", bold: true }),
              new TextRun({ text: analysis.currency_pair })
            ],
            alignment: AlignmentType.RIGHT,
          }),
                     new Paragraph({ text: "" }),
           
           // Separator between top section and timeframes
           new Paragraph({
             children: [
               new TextRun({ 
                 text: "─".repeat(80), // Separator line
                 color: "ff6b35", // Orange color for main section separator
                 size: 18
               })
             ],
             alignment: AlignmentType.CENTER
           }),
           new Paragraph({ text: "" }),

           // Timeframe Analysis Sections
           ...selectedTimeframes.flatMap((timeframe, index) => {
             const timeframeDisplay = getTimeframeDisplayName(timeframe);
             
             // Add separator line before each timeframe (except the first one)
             const separatorElements = index > 0 ? [
               new Paragraph({ text: "" }),
               new Paragraph({
                 children: [
                   new TextRun({ 
                     text: "─".repeat(80), // Separator line
                     color: "1e40af", // Blue color
                     size: 16
                   })
                 ],
                 alignment: AlignmentType.CENTER
               }),
               new Paragraph({ text: "" })
             ] : [];
             
             if (specialTimeframes.includes(timeframe as TimeframeType)) {
               // Use flexible format for special timeframes
               const traderType = getTraderType(timeframe);
               
               return [
                 ...separatorElements,
                 ...createFlexibleTimeframeSection(timeframe, timeframeDisplay, traderType)
               ];
             } else {
               // Use simple format for other timeframes
               return [
                 ...separatorElements,
                 ...createSimpleTimeframeSection(timeframe, timeframeDisplay, answers || [])
               ];
             }
           }),

          // AI Analysis Section (only if AI analysis exists and was selected)
          ...(analysis.ai_analysis ? [
            new Paragraph({ text: "" }),
            new Paragraph({
              text: "AI Analysis",
              heading: HeadingLevel.HEADING_2,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              text: analysis.ai_analysis,
              alignment: AlignmentType.JUSTIFIED,
            }),
            new Paragraph({ text: "" })
          ] : []),

          // Footer and Disclaimer
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ 
                text: "Disclaimer", 
                bold: true,
                color: "ff0000" // Red color
              })
            ],
            heading: HeadingLevel.HEADING_3,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({ 
                text: "This analysis is for educational and informational purposes only. It does not constitute financial advice, investment recommendations, or trading advice. Trading foreign exchange carries a high level of risk and may not be suitable for all investors. The high degree of leverage can work against you as well as for you. Before deciding to trade foreign exchange, you should carefully consider your investment objectives, level of experience, and risk appetite. You could sustain a loss of some or all of your initial investment and therefore you should not invest money that you cannot afford to lose.",
                color: "000000" // Black color
              })
            ],
            alignment: AlignmentType.JUSTIFIED,
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ 
                text: "Risk Warning: Past performance is not indicative of future results. The value of investments can go down as well as up, and you may get back less than you invested.",
                color: "000000" // Black color
              })
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ 
                text: `Report Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}`,
                color: "000000" // Black color
              })
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({ 
                text: "Trader's Journal - Your Ultimate Market Companion",
                bold: true,
                color: "000000" // Black color
              })
            ],
            alignment: AlignmentType.CENTER,
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
