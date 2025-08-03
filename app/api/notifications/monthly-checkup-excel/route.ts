import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { calculateAnalysisData, formatTradeData, formatAnalysisData } from "@/lib/excelExport";
import { Trade } from "@/types/trade";
import ExcelJS from 'exceljs';

// Create server-side Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId, month, year } = await req.json();
    
    if (!userId || !month || !year) {
      return NextResponse.json({ 
        error: "Missing required parameters: userId, month, year" 
      }, { status: 400 });
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('email, username')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ 
        error: "User not found" 
      }, { status: 404 });
    }

    // Calculate date range for the specified month
    const startDate = new Date(year, month - 1, 1); // First day of month
    const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of month

    // Get trades for the specified month
    const { data: monthlyTrades, error: tradesError } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .order('date', { ascending: false });

    if (tradesError) {
      console.error('Error fetching trades:', tradesError);
      return NextResponse.json({ 
        error: "Failed to fetch trades" 
      }, { status: 500 });
    }

    // If no trades found, return early with no-trades flag
    if (!monthlyTrades || monthlyTrades.length === 0) {
      return NextResponse.json({ 
        hasTrades: false,
        message: "No trades found for the specified month"
      });
    }

    // Generate Excel file using the existing export function
    const fileName = `monthly_report_${year}_${month.toString().padStart(2, '0')}_${userProfile.username || userId}.xlsx`;
    
    // Create Excel buffer using the existing function
    const workbook = await generateMonthlyExcelReport(monthlyTrades);
    const buffer = await workbook.xlsx.writeBuffer();

    // Return the Excel file as base64 encoded string
    const base64Data = Buffer.from(buffer).toString('base64');

    return NextResponse.json({
      hasTrades: true,
      fileName,
      excelData: base64Data,
      tradeCount: monthlyTrades.length,
      month: month,
      year: year
    });

  } catch (error) {
    console.error('Error generating monthly Excel report:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to generate Excel report using existing functions
async function generateMonthlyExcelReport(trades: Trade[]) {
  // Calculate analysis data using existing function
  const analysis = calculateAnalysisData(trades);
  
  // Format trade data using existing function
  const tradeData = formatTradeData(trades);
  
  // Format analysis data using existing function
  const analysisData = formatAnalysisData(analysis);
  
  // Create workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Monthly Trade Report');
  
  // Define columns with proper widths
  worksheet.columns = [
    { header: '#', key: 'number', width: 10 },
    { header: 'Date', key: 'date', width: 18 },
    { header: 'Currency Pair', key: 'currencyPair', width: 20 },
    { header: 'Trade Type', key: 'tradeType', width: 18 },
    { header: 'Entry Time', key: 'entryTime', width: 15 },
    { header: 'Exit Time', key: 'exitTime', width: 15 },
    { header: 'Duration (m)', key: 'duration', width: 18 },
    { header: 'Entry Price', key: 'entryPrice', width: 18 },
    { header: 'Exit Price', key: 'exitPrice', width: 18 },
    { header: 'Net Pips', key: 'netPips', width: 15 },
    { header: 'Lot Size', key: 'lotSize', width: 15 },
    { header: 'P/L', key: 'pl', width: 18 },
    { header: 'Currency', key: 'currency', width: 15 },
    { header: 'Tags', key: 'tags', width: 30 },
    { header: 'Notes', key: 'notes', width: 50 },
  ];
  
  // Style the header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2E75B6' }
  };
  
  // Align headers - specific alignment for different columns
  headerRow.eachCell((cell: ExcelJS.Cell, colNumber: number) => {
    if (colNumber === 7) { // Duration (m) column
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    } else if (colNumber === 11) { // Lot Size column
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    } else if (colNumber === 10) { // Net Pips column
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
            } else if (colNumber === 12) { // P/L column
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    } else if (colNumber === 13) { // Tags column
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    } else {
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    }
  });
  
  // Add trade data
  tradeData.forEach((trade) => {
    const row = worksheet.addRow({
      number: trade['#'],
      date: trade['Date'],
      currencyPair: trade['Currency Pair'],
      tradeType: trade['Trade Type'],
      entryTime: trade['Entry Time'],
      exitTime: trade['Exit Time'],
      duration: trade['Duration (m)'],
      entryPrice: trade['Entry Price'],
      exitPrice: trade['Exit Price'],
      netPips: trade['Net Pips'],
      lotSize: trade['Lot Size'],
              pl: trade['P/L'],
        currency: trade['Currency'],
      tags: trade['Tags'],
      notes: trade['Notes']
    });
    
    // Left align the # column
    row.getCell('number').alignment = { horizontal: 'left' };
    
    // Middle align Duration (m), Lot Size, and Tags
    row.getCell('duration').alignment = { horizontal: 'center' };
    row.getCell('lotSize').alignment = { horizontal: 'center' };
    row.getCell('tags').alignment = { horizontal: 'center' };
    
    // Right align Net Pips column
    row.getCell('netPips').alignment = { horizontal: 'right' };
    
          // Right align and color P/L column
      const plCell = row.getCell('pl');
      plCell.alignment = { horizontal: 'right' };
      if (trade['P/L'] !== '-') {
        const plValue = parseFloat(trade['P/L'].replace(/[+$,]/g, ''));
      plCell.font = {
        color: { argb: plValue >= 0 ? 'FF008000' : 'FFFF0000' }
      };
    }
    
    // Color Net Pips based on value
    const pipsCell = row.getCell('netPips');
    if (trade['Net Pips'] !== '-') {
      const pipsValue = parseFloat(trade['Net Pips'].replace(/[+]/g, ''));
      pipsCell.font = {
        color: { argb: pipsValue >= 0 ? 'FF008000' : 'FFFF0000' }
      };
    }
  });
  
  // Add empty rows for separation
  worksheet.addRow({});
  worksheet.addRow({});
  
  // Add analysis section header
  const analysisHeaderRow = worksheet.addRow({});
  const analysisHeaderCell = analysisHeaderRow.getCell('number');
  analysisHeaderCell.value = 'MONTHLY ANALYSIS';
  analysisHeaderCell.font = { bold: true, size: 14 };
  analysisHeaderCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE6E6E6' }
  };
  
  // Merge cells for analysis header
  worksheet.mergeCells(`A${analysisHeaderRow.number}:N${analysisHeaderRow.number}`);
  
  // Add empty row
  worksheet.addRow({});
  
  // Add analysis data
  analysisData.slice(0, 7).forEach((item) => {
    const row = worksheet.addRow({});
    
    const metricCell = row.getCell('number');
    metricCell.value = item.Metric;
    metricCell.alignment = { horizontal: 'left', vertical: 'middle' };
    
    const valueCell = row.getCell('currencyPair');
    valueCell.value = item.Value;
    valueCell.alignment = { horizontal: 'right', vertical: 'middle' };
    
    // Highlight Net Pips in yellow - full row (A to C columns)
    if (item.Metric === 'Net Pips' && item.Value !== '0.0') {
      const netPipsValue = parseFloat(String(item.Value).replace(/[+]/g, ''));
      
      // Highlight the entire row from A to C columns
      for (let col = 1; col <= 3; col++) {
        const cell = row.getCell(col);
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFF00' } // Yellow background
        };
      }
      
      // Add color coding to value cell
      valueCell.font = {
        color: { argb: netPipsValue >= 0 ? 'FF008000' : 'FFFF0000' }
      };
    }
  });
  
  // Add empty row before win rate
  worksheet.addRow({});
  
  // Add win rate breakdown on same row with yellow highlight - full row (A to C columns)
  const winRateRow = worksheet.addRow({});
  const winRateCell = winRateRow.getCell('number');
  winRateCell.value = 'Win Rate Breakdown';
  winRateCell.font = { bold: true };
  
  const winRateValueCell = winRateRow.getCell('currencyPair');
  winRateValueCell.value = `${analysis.winRate.toFixed(1)}% (${analysis.positiveTrades}/${analysis.totalTrades})`;
  winRateValueCell.alignment = { horizontal: 'right', vertical: 'middle' };
  
  // Highlight the entire win rate row from A to C columns
  for (let col = 1; col <= 3; col++) {
    const cell = winRateRow.getCell(col);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFF00' } // Yellow background
    };
  }
  
  // Only protect the analysis section (not the entire worksheet)
  // Protect analysis section (rows with analysis data)
  const analysisStartRow = analysisHeaderRow.number + 2; // Start after header and empty row
  const analysisEndRow = winRateRow.number;
  
  for (let rowNum = analysisStartRow; rowNum <= analysisEndRow; rowNum++) {
    const row = worksheet.getRow(rowNum);
    row.eachCell((cell: ExcelJS.Cell) => {
      cell.protection = { locked: true };
    });
  }
  
  // Enable worksheet protection only for the protected sections
  worksheet.protect('', {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: true,
    formatColumns: true,
    formatRows: true,
    insertColumns: true,
    insertRows: true,
    insertHyperlinks: true,
    deleteColumns: true,
    deleteRows: true,
    sort: true,
    autoFilter: true,
    pivotTables: true
  });
  
  return workbook;
} 