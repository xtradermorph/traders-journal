import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Trade {
  id: string;
  user_id: string;
  date: string;
  currency_pair: string;
  trade_type: string;
  entry_time?: string;
  exit_time?: string;
  duration?: number;
  entry_price?: number;
  exit_price?: number;
  pips?: number;
  lot_size?: number;
  profit_loss?: number;
  tags?: string[];
  notes?: string;
}

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the request body
    const { userId, month, year, isTest = false } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user profile and settings
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('email, username')
      .eq('id', userId)
      .single()

    if (profileError || !userProfile) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if monthly checkup is enabled (skip for test)
    if (!isTest) {
      const { data: userSettings, error: settingsError } = await supabase
        .from('user_settings')
        .select('monthly_trade_checkup')
        .eq('user_id', userId)
        .single()

      if (settingsError || !userSettings?.monthly_trade_checkup) {
        return new Response(
          JSON.stringify({ error: 'Monthly trade checkup not enabled for this user' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Calculate date range
    const reportMonth = month || new Date().getMonth() // 0-based
    const reportYear = year || new Date().getFullYear()
    
    const startDate = new Date(reportYear, reportMonth, 1)
    const endDate = new Date(reportYear, reportMonth + 1, 0, 23, 59, 59)

    // Get trades for the month
    const { data: monthlyTrades, error: tradesError } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .order('date', { ascending: false })

    if (tradesError) {
      console.error('Error fetching trades:', tradesError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch trades' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If no trades, send email without attachment
    if (!monthlyTrades || monthlyTrades.length === 0) {
      const emailContent = generateNoTradesEmail(userProfile.username || 'Trader', reportMonth, reportYear)
      
      const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
      await resend.emails.send({
        from: 'Traders Journal <noreply@tradersjournal.pro>',
        to: userProfile.email,
        subject: `📊 Your Monthly Trade Check Up Report - ${getMonthName(reportMonth)} ${reportYear}`,
        html: emailContent
      })

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Monthly trade checkup email sent (no trades)',
          email: userProfile.email,
          hasTrades: false,
          totalTrades: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate Excel file
    const excelBuffer = await generateExcelReport(monthlyTrades, userProfile.username || userId, reportMonth, reportYear)
    
    // Send email with attachment
    const emailContent = generateTradesEmail(userProfile.username || 'Trader', monthlyTrades.length, reportMonth, reportYear)
    
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
    const emailResult = await resend.emails.send({
      from: 'Traders Journal <noreply@tradersjournal.pro>',
      to: userProfile.email,
      subject: `📊 Your Monthly Trade Check Up Report - ${getMonthName(reportMonth)} ${reportYear}`,
      html: emailContent,
      attachments: [{
        filename: `monthly_report_${reportYear}_${String(reportMonth + 1).padStart(2, '0')}_${userProfile.username || userId}.xlsx`,
        content: excelBuffer
      }]
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Monthly trade checkup email sent successfully',
        email: userProfile.email,
        hasTrades: true,
        totalTrades: monthlyTrades.length,
        attachments: 1
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in monthly trade checkup:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function getMonthName(month: number): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return months[month]
}

function calculateAnalysisData(trades: Trade[]): AnalysisData {
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
    }
  }

  const positiveTrades = trades.filter(trade => (trade.pips ?? 0) > 0)
  const negativeTrades = trades.filter(trade => (trade.pips ?? 0) < 0)
  const totalPips = trades.reduce((sum, trade) => sum + (trade.pips ?? 0), 0)
  const totalDuration = trades.reduce((sum, trade) => sum + (trade.duration ?? 0), 0)

  const avgPositivePips = positiveTrades.length > 0 
    ? positiveTrades.reduce((sum, trade) => sum + (trade.pips ?? 0), 0) / positiveTrades.length 
    : 0

  const avgNegativePips = negativeTrades.length > 0 
    ? negativeTrades.reduce((sum, trade) => sum + (trade.pips ?? 0), 0) / negativeTrades.length 
    : 0

  return {
    totalTrades: trades.length,
    positiveTrades: positiveTrades.length,
    negativeTrades: negativeTrades.length,
    winRate: (positiveTrades.length / trades.length) * 100,
    avgPositivePips,
    avgNegativePips,
    avgDuration: totalDuration / trades.length,
    netPips: totalPips,
  }
}

function formatTradeData(trades: Trade[]) {
  return trades.map((trade, index) => ({
    '#': index + 1,
    'Date': new Date(trade.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    'Currency Pair': trade.currency_pair || '-',
    'Trade Type': trade.trade_type || '-',
    'Entry Time': trade.entry_time ? new Date(trade.entry_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-',
    'Exit Time': trade.exit_time ? new Date(trade.exit_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-',
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
  }))
}

async function generateExcelReport(trades: Trade[], username: string, month: number, year: number): Promise<Uint8Array> {
  // Import ExcelJS dynamically
  const ExcelJS = await import('https://esm.sh/exceljs@4.4.0')
  
  const analysis = calculateAnalysisData(trades)
  const tradeData = formatTradeData(trades)
  
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Monthly Trade Report')
  
  // Define columns
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
  ]
  
  // Style header row
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2E75B6' }
  }
  
  headerRow.eachCell((cell, colNumber) => {
    cell.alignment = { horizontal: 'left', vertical: 'middle' }
    
    // Center the Tags column header (column 13)
    if (colNumber === 13) {
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    }
  })
  
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
    })
    
    // Left align the # column
    row.getCell('number').alignment = { horizontal: 'left' }
    
    // Middle align Duration (m), Lot Size, and Tags
    row.getCell('duration').alignment = { horizontal: 'center' }
    row.getCell('lotSize').alignment = { horizontal: 'center' }
    row.getCell('tags').alignment = { horizontal: 'center' }
    
    // Right align and color P/L column
    const plCell = row.getCell('pl')
    plCell.alignment = { horizontal: 'right' }
    if (trade['P/L'] !== '-') {
      const plValue = parseFloat(trade['P/L'].replace(/[+$,]/g, ''))
      plCell.font = {
        color: { argb: plValue >= 0 ? 'FF008000' : 'FFFF0000' }
      }
    }
    
    // Color Net Pips based on value
    const pipsCell = row.getCell('netPips')
    if (trade['Net Pips'] !== '-') {
      const pipsValue = parseFloat(trade['Net Pips'].replace(/[+]/g, ''))
      pipsCell.font = {
        color: { argb: pipsValue >= 0 ? 'FF008000' : 'FFFF0000' }
      }
    }
  })
  
  // Add empty rows for separation
  worksheet.addRow({})
  worksheet.addRow({})
  
  // Add analysis section header
  const analysisHeaderRow = worksheet.addRow({})
  const analysisHeaderCell = analysisHeaderRow.getCell('number')
  analysisHeaderCell.value = 'MONTHLY ANALYSIS'
  analysisHeaderCell.font = { bold: true, size: 14 }
  analysisHeaderCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE6E6E6' }
  }
  
  // Merge cells for analysis header
  worksheet.mergeCells(`A${analysisHeaderRow.number}:N${analysisHeaderRow.number}`)
  
  // Add empty row
  worksheet.addRow({})
  
  // Add analysis data
  const analysisData = [
    { 'Metric': 'Number of Trades', 'Value': analysis.totalTrades },
    { 'Metric': 'Number of Positive Trades', 'Value': analysis.positiveTrades },
    { 'Metric': 'Number of Negative Trades', 'Value': analysis.negativeTrades },
    { 'Metric': 'Average Positive Pips', 'Value': analysis.avgPositivePips.toFixed(1) },
    { 'Metric': 'Average Negative Pips', 'Value': analysis.avgNegativePips.toFixed(1) },
    { 'Metric': 'Average Time (Duration)', 'Value': `${analysis.avgDuration.toFixed(1)} minutes` },
    { 'Metric': 'Net Pips', 'Value': `${analysis.netPips > 0 ? '+' : ''}${analysis.netPips.toFixed(1)}` },
    { 'Metric': 'Percentage of Positive (Win Rate)', 'Value': `${analysis.winRate.toFixed(1)}%` },
  ]
  
  analysisData.slice(0, 7).forEach((item, index) => {
    const row = worksheet.addRow({})
    
    const metricCell = row.getCell('number')
    metricCell.value = item.Metric
    metricCell.alignment = { horizontal: 'left', vertical: 'middle' }
    
    const valueCell = row.getCell('currencyPair')
    valueCell.value = item.Value
    valueCell.alignment = { horizontal: 'right', vertical: 'middle' }
    
    // Highlight Net Pips in yellow - full row (A to C columns)
    if (item.Metric === 'Net Pips' && item.Value !== '0.0') {
      const netPipsValue = parseFloat(String(item.Value).replace(/[+]/g, ''))
      
      // Highlight the entire row from A to C columns
      for (let col = 1; col <= 3; col++) {
        const cell = row.getCell(col)
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFF00' } // Yellow background
        }
      }
      
      // Add color coding to value cell
      valueCell.font = {
        color: { argb: netPipsValue >= 0 ? 'FF008000' : 'FFFF0000' }
      }
    }
  })
  
  // Add empty row before win rate
  worksheet.addRow({})
  
  // Add win rate breakdown on same row with yellow highlight - full row (A to C columns)
  const winRateRow = worksheet.addRow({})
  const winRateCell = winRateRow.getCell('number')
  winRateCell.value = 'Win Rate Breakdown'
  winRateCell.font = { bold: true }
  
  const winRateValueCell = winRateRow.getCell('currencyPair')
  winRateValueCell.value = `${analysis.winRate.toFixed(1)}% (${analysis.positiveTrades}/${analysis.totalTrades})`
  winRateValueCell.alignment = { horizontal: 'right', vertical: 'middle' }
  
  // Highlight the entire win rate row from A to C columns
  for (let col = 1; col <= 3; col++) {
    const cell = winRateRow.getCell(col)
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFF00' } // Yellow background
    }
  }
  
  // Only protect the analysis section
  const analysisStartRow = analysisHeaderRow.number + 2
  const analysisEndRow = winRateRow.number
  
  for (let rowNum = analysisStartRow; rowNum <= analysisEndRow; rowNum++) {
    const row = worksheet.getRow(rowNum)
    row.eachCell((cell) => {
      cell.protection = { locked: true }
    })
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
  })
  
  return await workbook.xlsx.writeBuffer()
}

function generateTradesEmail(username: string, tradeCount: number, month: number, year: number): string {
  const monthName = getMonthName(month)
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Monthly Trade Check Up Report</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .highlight { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat { background: white; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stat-value { font-size: 24px; font-weight: bold; color: #2196f3; }
        .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        .button { display: inline-block; background: #2196f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📊 Monthly Trade Check Up Report</h1>
        <p>${monthName} ${year}</p>
      </div>
      
      <div class="content">
        <h2>Hello ${username}!</h2>
        
        <p>Your monthly trade checkup report for <strong>${monthName} ${year}</strong> is ready! 📈</p>
        
        <div class="highlight">
          <h3>📋 Report Summary</h3>
          <div class="stats">
            <div class="stat">
              <div class="stat-value">${tradeCount}</div>
              <div class="stat-label">Total Trades</div>
            </div>
            <div class="stat">
              <div class="stat-value">${monthName}</div>
              <div class="stat-label">Period</div>
            </div>
          </div>
        </div>
        
        <h3>📎 What's Included</h3>
        <ul>
          <li><strong>Complete Trade Data:</strong> All your ${monthName} trades with detailed information</li>
          <li><strong>Performance Analysis:</strong> Win rate, average pips, and duration metrics</li>
          <li><strong>Visual Highlights:</strong> Key metrics highlighted for quick review</li>
          <li><strong>Professional Formatting:</strong> Clean, organized Excel spreadsheet</li>
        </ul>
        
        <p><strong>📊 Excel Attachment:</strong> Your detailed report is attached to this email as an Excel file.</p>
        
        <div class="highlight">
          <h3>💡 How to Use This Report</h3>
          <ul>
            <li>Review your trading patterns and identify areas for improvement</li>
            <li>Analyze your win rate and risk management</li>
            <li>Track your progress over time</li>
            <li>Share insights with your trading community</li>
          </ul>
        </div>
        
        <p>Keep up the great work! Your dedication to tracking and analyzing your trades is what sets successful traders apart. 🚀</p>
        
        <p>Best regards,<br>
        <strong>The Traders Journal Team</strong></p>
      </div>
      
      <div class="footer">
        <p>This report was automatically generated by Traders Journal.<br>
        You can manage your email preferences in your account settings.</p>
      </div>
    </body>
    </html>
  `
}

function generateNoTradesEmail(username: string, month: number, year: number): string {
  const monthName = getMonthName(month)
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Monthly Trade Check Up Report</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .highlight { background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📊 Monthly Trade Check Up Report</h1>
        <p>${monthName} ${year}</p>
      </div>
      
      <div class="content">
        <h2>Hello ${username}!</h2>
        
        <p>Your monthly trade checkup report for <strong>${monthName} ${year}</strong> is ready! 📈</p>
        
        <div class="highlight">
          <h3>📋 Report Summary</h3>
          <p><strong>No trades recorded for ${monthName} ${year}</strong></p>
          <p>This could mean:</p>
          <ul>
            <li>You took a break from trading this month</li>
            <li>You focused on analysis and planning</li>
            <li>Market conditions weren't favorable</li>
            <li>You're building up your strategy</li>
          </ul>
        </div>
        
        <h3>💡 What's Next?</h3>
        <ul>
          <li><strong>Review Your Strategy:</strong> Use this time to analyze your trading plan</li>
          <li><strong>Market Research:</strong> Study market conditions and prepare for future opportunities</li>
          <li><strong>Risk Management:</strong> Refine your risk management rules</li>
          <li><strong>Stay Disciplined:</strong> Remember, quality over quantity in trading</li>
        </ul>
        
        <p>Every successful trader goes through periods of inactivity. It's often a sign of discipline and patience! 🎯</p>
        
        <p>We'll continue to send you monthly reports. When you start trading again, you'll receive detailed analysis with your trade data.</p>
        
        <p>Best regards,<br>
        <strong>The Traders Journal Team</strong></p>
      </div>
      
      <div class="footer">
        <p>This report was automatically generated by Traders Journal.<br>
        You can manage your email preferences in your account settings.</p>
      </div>
    </body>
    </html>
  `
} 