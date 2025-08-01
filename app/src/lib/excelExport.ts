import ExcelJS from 'exceljs';
import { Trade } from '@/types/trade';
import { format } from 'date-fns';

interface AnalysisData {
  totalTrades: number;
  positiveTrades: number;
  negativeTrades: number;
  winRate: number;
  avgPositivePips: number;
  avgNegativePips: number;
  avgDuration: number;
  netPips: number;
}

export function calculateAnalysisData(trades: Trade[]): AnalysisData {
  if (!trades || trades.length === 0) {
    return {
      totalTrades: 0,
      positiveTrades: 0,
      negativeTrades: 0,
      winRate: 0,
      avgPositivePips: 0,
      avgNegativePips: 0,
      avgDuration: 0,
      netPips: 0,
    };
  }

  const positiveTrades = trades.filter(trade => (trade.pips ?? 0) > 0);
  const negativeTrades = trades.filter(trade => (trade.pips ?? 0) < 0);
  const totalPips = trades.reduce((sum, trade) => sum + (trade.pips ?? 0), 0);
  const totalDuration = trades.reduce((sum, trade) => sum + (trade.duration ?? 0), 0);

  const avgPositivePips = positiveTrades.length > 0 
    ? positiveTrades.reduce((sum, trade) => sum + (trade.pips ?? 0), 0) / positiveTrades.length 
    : 0;

  const avgNegativePips = negativeTrades.length > 0 
    ? negativeTrades.reduce((sum, trade) => sum + (trade.pips ?? 0), 0) / negativeTrades.length 
    : 0;

  return {
    totalTrades: trades.length,
    positiveTrades: positiveTrades.length,
    negativeTrades: negativeTrades.length,
    winRate: (positiveTrades.length / trades.length) * 100,
    avgPositivePips,
    avgNegativePips,
    avgDuration: totalDuration / trades.length,
    netPips: totalPips,
  };
}

export function formatTradeData(trades: Trade[]) {
  return trades.map((trade, index) => ({
    '#': index + 1,
    'Date': format(new Date(trade.date), 'MMM dd, yyyy'),
    'Currency Pair': trade.currency_pair || '-',
    'Trade Type': trade.trade_type || '-',
    'Entry Time': trade.entry_time ? format(new Date(trade.entry_time), 'HH:mm') : '-',
    'Exit Time': trade.exit_time ? format(new Date(trade.exit_time), 'HH:mm') : '-',
    'Duration (m)': trade.duration || '-',
    'Entry Price': trade.entry_price ? 
      (trade.currency_pair === 'USDJPY' ? trade.entry_price.toFixed(3) : trade.entry_price.toFixed(5)) : '-',
    'Exit Price': trade.exit_price ? 
      (trade.currency_pair === 'USDJPY' ? trade.exit_price.toFixed(3) : trade.exit_price.toFixed(5)) : '-',
    'Net Pips': trade.pips !== null && trade.pips !== undefined ? 
      `${trade.pips > 0 ? '+' : ''}${trade.pips}` : '-',
    'Lot Size': trade.lot_size ? trade.lot_size.toFixed(2) : '-',
    'P/L': trade.profit_loss !== null && trade.profit_loss !== undefined ? 
      `${trade.profit_loss > 0 ? '+' : ''}${trade.profit_loss.toFixed(2)}` : '-',
    'Currency': trade.currency || 'AUD',
    'Tags': Array.isArray(trade.tags) ? trade.tags.join(', ') : trade.tags || '-',
    'Notes': trade.notes || '-',
  }));
}

export function formatAnalysisData(analysis: AnalysisData) {
  return [
    { 'Metric': 'Number of Trades', 'Value': analysis.totalTrades },
    { 'Metric': 'Number of Positive Trades', 'Value': analysis.positiveTrades },
    { 'Metric': 'Number of Negative Trades', 'Value': analysis.negativeTrades },
    { 'Metric': 'Average Positive Pips', 'Value': analysis.avgPositivePips.toFixed(1) },
    { 'Metric': 'Average Negative Pips', 'Value': analysis.avgNegativePips.toFixed(1) },
    { 'Metric': 'Average Time (Duration)', 'Value': `${analysis.avgDuration.toFixed(1)} minutes` },
    { 'Metric': 'Net Pips', 'Value': `${analysis.netPips > 0 ? '+' : ''}${analysis.netPips.toFixed(1)}` },
    { 'Metric': 'Percentage of Positive (Win Rate)', 'Value': `${analysis.winRate.toFixed(1)}%` },
  ];
}

export function exportTradesToExcel(trades: Trade[], fileName: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      // Calculate analysis data
      const analysis = calculateAnalysisData(trades);
      
      // Format trade data
      const tradeData = formatTradeData(trades);
      
      // Format analysis data
      const analysisData = formatAnalysisData(analysis);
      
      // Create workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Trade Data');
      
      // Define columns with proper widths - KEEP ORIGINAL WIDTHS
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
      
      // Style the header row with LEFT ALIGNMENT for most headers
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell, colNumber) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2E75B6' } // Dark blue
        };
        cell.font = {
          bold: true,
          color: { argb: 'FFFFFFFF' }, // White
          size: 12
        };
        
        // Set alignment based on column
        if (colNumber === 7 || colNumber === 11 || colNumber === 13) { // Duration (m), Lot Size, Tags
          cell.alignment = {
            horizontal: 'center',
            vertical: 'middle'
          };
        } else {
          cell.alignment = {
            horizontal: 'left',
            vertical: 'middle'
          };
        }
        
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        
        // PROTECT the header row
        cell.protection = {
          locked: true
        };
      });
      
      // Add trade data
      tradeData.forEach((trade, index) => {
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
        
        // Right align and color P/L column
        const plCell = row.getCell('pl');
        plCell.alignment = { horizontal: 'right' };
        if (trade['P/L'] !== '-') {
          const plValue = parseFloat(trade['P/L'].replace(/[+$,]/g, ''));
          plCell.font = {
            color: { argb: plValue >= 0 ? 'FF008000' : 'FFFF0000' } // Green for positive, red for negative
          };
        }
        
        // Color Net Pips based on value
        const pipsCell = row.getCell('netPips');
        if (trade['Net Pips'] !== '-') {
          const pipsValue = parseFloat(trade['Net Pips'].replace(/[+]/g, ''));
          pipsCell.font = {
            color: { argb: pipsValue >= 0 ? 'FF008000' : 'FFFF0000' } // Green for positive, red for negative
          };
        }
      });
      
      // Add empty rows for separation
      worksheet.addRow({});
      worksheet.addRow({});
      
      // Add analysis section header with MERGED CELLS
      const analysisHeaderRow = worksheet.addRow({});
      const analysisHeaderCell = analysisHeaderRow.getCell('number');
      analysisHeaderCell.value = 'ANALYSIS';
      analysisHeaderCell.font = { bold: true, size: 14 };
      analysisHeaderCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6E6E6' } // Light gray
      };
      
      // Merge cells for analysis header to span all columns
      worksheet.mergeCells(`A${analysisHeaderRow.number}:N${analysisHeaderRow.number}`);
      
      // Add empty row
      worksheet.addRow({});
      
      // Add analysis data - SIMPLE APPROACH without merging
      analysisData.slice(0, 7).forEach((item, index) => {
        const row = worksheet.addRow({});
        
        // Set metric name in column A (left-aligned)
        const metricCell = row.getCell('number');
        metricCell.value = item.Metric;
        metricCell.alignment = { horizontal: 'left', vertical: 'middle' };
        metricCell.protection = { locked: true }; // PROTECT analysis cells
        
        // Set value in column D (right-aligned)
        const valueCell = row.getCell('currencyPair'); // Column D
        valueCell.value = item.Value;
        valueCell.alignment = { horizontal: 'right', vertical: 'middle' };
        valueCell.protection = { locked: true }; // PROTECT analysis cells
        
        // Color Net Pips based on value
        if (item.Metric === 'Net Pips' && item.Value !== '0.0') {
          const netPipsValue = parseFloat(String(item.Value).replace(/[+]/g, ''));
          valueCell.font = {
            color: { argb: netPipsValue >= 0 ? 'FF008000' : 'FFFF0000' } // Green for positive, red for negative
          };
        }
      });
      
      // Add empty row before win rate
      worksheet.addRow({});
      
      // Add Win Rate at the bottom (highlighted in yellow) - SIMPLE APPROACH
      const winRateRow = worksheet.addRow({});
      
      // Set win rate metric name in column A (left-aligned, yellow background)
      const winRateMetricCell = winRateRow.getCell('number');
      winRateMetricCell.value = 'Win Rate %';
      winRateMetricCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFF00' } // Yellow
      };
      winRateMetricCell.font = { bold: true };
      winRateMetricCell.alignment = { horizontal: 'left', vertical: 'middle' };
      winRateMetricCell.protection = { locked: true }; // PROTECT analysis cells
      
      // Also highlight column B to fill the gap
      const winRateCellB = winRateRow.getCell('date'); // Column B
      winRateCellB.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFF00' } // Yellow
      };
      winRateCellB.protection = { locked: true };
      
      // Add win rate value in column C (right-aligned, yellow background)
      const winRateValueCell = winRateRow.getCell('currencyPair'); // Column C
      winRateValueCell.value = `${analysis.winRate.toFixed(1)}%`;
      winRateValueCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFF00' } // Yellow
      };
      winRateValueCell.font = { bold: true };
      winRateValueCell.alignment = { horizontal: 'right', vertical: 'middle' };
      winRateValueCell.protection = { locked: true }; // PROTECT analysis cells
      
      // Enable worksheet protection with password (empty string = no password)
      // This protects only the locked cells (headers and analysis section)
      worksheet.protect('', {
        selectLockedCells: true,  // Allow selecting locked cells
        selectUnlockedCells: true,
        formatCells: true,        // Allow formatting unlocked cells
        formatColumns: true,      // Allow column formatting
        formatRows: true,         // Allow row formatting
        insertColumns: true,      // Allow inserting columns
        insertRows: true,         // Allow inserting rows
        insertHyperlinks: true,   // Allow hyperlinks
        deleteColumns: true,      // Allow deleting columns
        deleteRows: true,         // Allow deleting rows
        sort: true,               // Allow sorting
        autoFilter: true,         // Allow filtering
        pivotTables: true         // Allow pivot tables
      });
      
      // Generate Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      
      // Create blob and download
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      resolve();
    } catch (error) {
      console.error('Excel export error:', error);
      reject(new Error('Failed to generate Excel file. Please try again.'));
    }
  });
}

// Helper function to validate trades data
export function validateTradesData(trades: Trade[]): { isValid: boolean; error?: string } {
  if (!trades || !Array.isArray(trades)) {
    return { isValid: false, error: 'Invalid trades data' };
  }
  
  if (trades.length === 0) {
    return { isValid: false, error: 'No trades to export' };
  }
  
  // Check if all required fields are present
  const requiredFields = ['id', 'date', 'currency_pair'];
  for (const trade of trades) {
    for (const field of requiredFields) {
      if (!trade[field as keyof Trade]) {
        return { isValid: false, error: `Missing required field: ${field}` };
      }
    }
  }
  
  return { isValid: true };
} 