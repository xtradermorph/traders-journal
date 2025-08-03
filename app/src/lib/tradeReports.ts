import ExcelJS from 'exceljs';
import { Trade } from '@/types/trade';
import { format } from 'date-fns';

export function formatTradeDataForReports(trades: Trade[]) {
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

export async function generateTradeReportExcel(trades: Trade[], reportType: string, periodLabel: string): Promise<Uint8Array> {
  try {
    // Format trade data
    const tradeData = formatTradeDataForReports(trades);
    
    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Trade Report');
    
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
    
    // Add report info at the bottom
    worksheet.addRow({});
    worksheet.addRow({});
    
    const infoRow = worksheet.addRow({});
    const infoCell = infoRow.getCell('number');
    infoCell.value = `Report Type: ${reportType}`;
    infoCell.font = { bold: true, size: 12 };
    infoCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6E6' } // Light gray
    };
    
    const periodRow = worksheet.addRow({});
    const periodCell = periodRow.getCell('number');
    periodCell.value = `Period: ${periodLabel}`;
    periodCell.font = { size: 12 };
    periodCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6E6' } // Light gray
    };
    
    const countRow = worksheet.addRow({});
    const countCell = countRow.getCell('number');
    countCell.value = `Total Trades: ${trades.length}`;
    countCell.font = { size: 12 };
    countCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6E6' } // Light gray
    };
    
    const dateRow = worksheet.addRow({});
    const dateCell = dateRow.getCell('number');
    dateCell.value = `Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`;
    dateCell.font = { size: 12 };
    dateCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6E6' } // Light gray
    };
    
    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as Uint8Array;
    
  } catch (error) {
    console.error('Excel generation error:', error);
    throw new Error('Failed to generate Excel file');
  }
}

export function getDateRangeForReport(reportType: 'weekly' | 'monthly' | 'quarterly' | 'yearly'): { startDate: Date; endDate: Date } {
  const now = new Date();
  
  switch (reportType) {
    case 'weekly':
      // Get the previous week (Monday 00:00 to Sunday 23:59)
      const lastMonday = new Date(now);
      lastMonday.setDate(now.getDate() - now.getDay() - 7); // Go back to last Monday
      lastMonday.setHours(0, 0, 0, 0);
      
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6); // Add 6 days to get Sunday
      lastSunday.setHours(23, 59, 59, 999);
      
      return { startDate: lastMonday, endDate: lastSunday };
      
    case 'monthly':
      // Get the previous month (1st day 00:00 to last day 23:59)
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      
      return { startDate: lastMonth, endDate: lastMonthEnd };
      
    case 'quarterly':
      // Get the previous quarter
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
      const lastQuarterYear = currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
      
      const quarterStartMonth = lastQuarter * 3;
      const quarterEndMonth = quarterStartMonth + 2;
      
      const quarterStart = new Date(lastQuarterYear, quarterStartMonth, 1);
      const quarterEnd = new Date(lastQuarterYear, quarterEndMonth + 1, 0, 23, 59, 59, 999);
      
      return { startDate: quarterStart, endDate: quarterEnd };
      
    case 'yearly':
      // Get the previous year (Jan 1st 00:00 to Dec 31st 23:59)
      const lastYear = new Date(now.getFullYear() - 1, 0, 1);
      const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      
      return { startDate: lastYear, endDate: lastYearEnd };
      
    default:
      throw new Error('Invalid report type');
  }
}

export function getReportPeriodLabel(reportType: 'weekly' | 'monthly' | 'quarterly' | 'yearly'): string {
  const { startDate, endDate } = getDateRangeForReport(reportType);
  
  switch (reportType) {
    case 'weekly':
      return `${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd, yyyy')}`;
    case 'monthly':
      return format(startDate, 'MMMM yyyy');
    case 'quarterly':
      const quarterNumber = Math.floor(startDate.getMonth() / 3) + 1;
      return `Q${quarterNumber} ${startDate.getFullYear()}`;
    case 'yearly':
      return startDate.getFullYear().toString();
    default:
      return '';
  }
}

export function getReportFileName(reportType: 'weekly' | 'monthly' | 'quarterly' | 'yearly', username: string): string {
  const periodLabel = getReportPeriodLabel(reportType);
  const timestamp = format(new Date(), 'yyyy-MM-dd');
  
  return `trade_report_${reportType}_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${username}_${timestamp}.xlsx`;
} 