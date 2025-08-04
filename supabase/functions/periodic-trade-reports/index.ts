// Supabase Edge Function: periodic-trade-reports
// This function handles periodic trade reports (weekly, monthly, quarterly, yearly)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Define types
interface Trade {
  id: string
  user_id: string
  date: string
  currency_pair: string
  trade_type: string
  entry_time: string
  exit_time: string
  duration: number
  entry_price: number
  exit_price: number
  pips: number
  lot_size: number
  profit_loss: number
  tags: string[]
  notes: string
}

interface UserSettings {
  user_id: string
  weekly_reports: boolean
  monthly_reports: boolean
  quarterly_reports: boolean
  yearly_reports: boolean
}

interface UserProfile {
  id: string
  email: string
  username: string
}

// Helper function to format dates
function formatDate(date: Date, format: string): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours()
  const minutes = date.getMinutes()
  
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]
  
  const fullMonthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  
  return format
    .replace('yyyy', year.toString())
    .replace('MMMM', fullMonthNames[month - 1])
    .replace('MMM', monthNames[month - 1])
    .replace('MM', month.toString().padStart(2, '0'))
    .replace('dd', day.toString().padStart(2, '0'))
    .replace('HH', hours.toString().padStart(2, '0'))
    .replace('mm', minutes.toString().padStart(2, '0'))
}

// Helper function to send emails directly using Resend API
async function sendEmail(to: string, subject: string, html: string, attachments: any[] = []) {
  try {
    // Get Resend API key from environment
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('Resend API key not configured')
    }

    // Prepare email payload
    const emailPayload: any = {
      from: "Trader's Journal <onboarding@resend.dev>",
      to,
      subject,
      html
    }

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      emailPayload.attachments = attachments
    }

    // Send the email directly using Resend API
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify(emailPayload)
    })

    const data = await res.json()
    console.log('Email sent directly via Resend API:', data)
    
    if (!res.ok) {
      throw new Error(`Resend API error: ${JSON.stringify(data)}`)
    }
    
    return data
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}

// Helper function to generate professional Excel file directly
async function generateProfessionalExcel(trades: Trade[], reportType: string, periodLabel: string, userId: string): Promise<{ buffer: Uint8Array, fileName: string }> {
  try {
    // Generate Excel XML content (Excel 2003+ compatible)
    const excelXml = generateExcelXML(trades, reportType, periodLabel)
    const buffer = new TextEncoder().encode(excelXml)
    const fileName = `trade_report_${reportType}_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${formatDate(new Date(), 'yyyy-MM-dd')}.xls`
    
    return { buffer, fileName }
  } catch (error) {
    console.error('Error generating professional Excel:', error)
    // Fallback to basic CSV if Excel generation fails
    const csvContent = generateBasicCSV(trades, reportType, periodLabel)
    const buffer = new TextEncoder().encode(csvContent)
    const fileName = `trade_report_${reportType}_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${formatDate(new Date(), 'yyyy-MM-dd')}.csv`
    return { buffer, fileName }
  }
}

// Generate Excel XML format with styling
function generateExcelXML(trades: Trade[], reportType: string, periodLabel: string): string {
  const headers = ['#', 'Date', 'Currency Pair', 'Trade Type', 'Entry Time', 'Exit Time', 'Duration (m)', 'Entry Price', 'Exit Price', 'Net Pips', 'Lot Size', 'P/L', 'Currency', 'Tags', 'Notes']
  
  let rows = ''
  trades.forEach((trade, index) => {
    const plValue = trade.profit_loss !== null && trade.profit_loss !== undefined ? trade.profit_loss : 0
    const pipsValue = trade.pips !== null && trade.pips !== undefined ? trade.pips : 0
    
    rows += `
      <Row>
        <Cell ss:StyleID="numberStyle"><Data ss:Type="Number">${index + 1}</Data></Cell>
        <Cell ss:StyleID="dateStyle"><Data ss:Type="String">${formatDate(new Date(trade.date), 'MMM dd, yyyy')}</Data></Cell>
        <Cell ss:StyleID="textStyle"><Data ss:Type="String">${trade.currency_pair || '-'}</Data></Cell>
        <Cell ss:StyleID="textStyle"><Data ss:Type="String">${trade.trade_type || '-'}</Data></Cell>
        <Cell ss:StyleID="timeStyle"><Data ss:Type="String">${trade.entry_time ? formatDate(new Date(trade.entry_time), 'HH:mm') : '-'}</Data></Cell>
        <Cell ss:StyleID="timeStyle"><Data ss:Type="String">${trade.exit_time ? formatDate(new Date(trade.exit_time), 'HH:mm') : '-'}</Data></Cell>
        <Cell ss:StyleID="centerStyle"><Data ss:Type="Number">${trade.duration || '-'}</Data></Cell>
        <Cell ss:StyleID="priceStyle"><Data ss:Type="Number">${trade.entry_price ? (trade.currency_pair === 'USDJPY' ? trade.entry_price.toFixed(3) : trade.entry_price.toFixed(5)) : '-'}</Data></Cell>
        <Cell ss:StyleID="priceStyle"><Data ss:Type="Number">${trade.exit_price ? (trade.currency_pair === 'USDJPY' ? trade.exit_price.toFixed(3) : trade.exit_price.toFixed(5)) : '-'}</Data></Cell>
        <Cell ss:StyleID="pipsStyle"><Data ss:Type="Number">${trade.pips !== null && trade.pips !== undefined ? trade.pips : '-'}</Data></Cell>
        <Cell ss:StyleID="centerStyle"><Data ss:Type="Number">${trade.lot_size ? trade.lot_size.toFixed(2) : '-'}</Data></Cell>
        <Cell ss:StyleID="plStyle"><Data ss:Type="Number">${trade.profit_loss !== null && trade.profit_loss !== undefined ? trade.profit_loss.toFixed(2) : '-'}</Data></Cell>
        <Cell ss:StyleID="textStyle"><Data ss:Type="String">${trade.currency || 'AUD'}</Data></Cell>
        <Cell ss:StyleID="centerStyle"><Data ss:Type="String">${Array.isArray(trade.tags) ? trade.tags.join(', ') : trade.tags || '-'}</Data></Cell>
        <Cell ss:StyleID="textStyle"><Data ss:Type="String">${trade.notes || '-'}</Data></Cell>
      </Row>`
  })
  
  // Add empty row for separation
  rows += `<Row><Cell><Data ss:Type="String"></Data></Cell></Row>`
  
  // Add report info section with merged cells
  rows += `
    <Row>
      <Cell ss:MergeAcross="13" ss:StyleID="infoHeaderStyle"><Data ss:Type="String">Report Information</Data></Cell>
    </Row>
    <Row>
      <Cell ss:MergeAcross="2" ss:StyleID="infoLabelStyle"><Data ss:Type="String">Report Type</Data></Cell>
      <Cell ss:MergeAcross="10" ss:StyleID="infoValueStyle"><Data ss:Type="String">${reportType}</Data></Cell>
    </Row>
    <Row>
      <Cell ss:MergeAcross="2" ss:StyleID="infoLabelStyle"><Data ss:Type="String">Period</Data></Cell>
      <Cell ss:MergeAcross="10" ss:StyleID="infoValueStyle"><Data ss:Type="String">${periodLabel}</Data></Cell>
    </Row>
    <Row>
      <Cell ss:MergeAcross="2" ss:StyleID="infoLabelStyle"><Data ss:Type="String">Total Trades</Data></Cell>
      <Cell ss:MergeAcross="10" ss:StyleID="infoValueStyle"><Data ss:Type="Number">${trades.length}</Data></Cell>
    </Row>
    <Row>
      <Cell ss:MergeAcross="2" ss:StyleID="infoLabelStyle"><Data ss:Type="String">Generated</Data></Cell>
      <Cell ss:MergeAcross="10" ss:StyleID="infoValueStyle"><Data ss:Type="String">${formatDate(new Date(), 'MMM dd, yyyy HH:mm')}</Data></Cell>
    </Row>`
  
  const headerRow = headers.map((header, index) => {
    const styleId = index === 12 ? 'tagsHeaderStyle' : 'headerStyle' // Tags is the 13th column (index 12)
    return `<Cell ss:StyleID="${styleId}"><Data ss:Type="String">${header}</Data></Cell>`
  }).join('')
  
  // Generate tab name based on report type and period
  const tabName = getTabName(reportType, periodLabel)
  
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>${reportType} Trade Report</Title>
  <Author>Trader's Journal</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="headerStyle">
   <Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="11"/>
   <Interior ss:Color="#2E75B6" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
  <Style ss:ID="tagsHeaderStyle">
   <Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="11"/>
   <Interior ss:Color="#2E75B6" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
  <Style ss:ID="numberStyle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:Size="10"/>
  </Style>
  <Style ss:ID="dateStyle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:Size="10"/>
  </Style>
  <Style ss:ID="textStyle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:Size="10"/>
  </Style>
  <Style ss:ID="timeStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:Size="10"/>
  </Style>
  <Style ss:ID="centerStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:Size="10"/>
  </Style>
  <Style ss:ID="priceStyle">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:Size="10"/>
  </Style>
  <Style ss:ID="plStyle">
   <Font ss:Color="#FF0000" ss:Size="10"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="pipsStyle">
   <Font ss:Color="#FF0000" ss:Size="10"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="infoHeaderStyle">
   <Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="12"/>
   <Interior ss:Color="#4472C4" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
  <Style ss:ID="infoLabelStyle">
   <Font ss:Bold="1" ss:Size="11"/>
   <Interior ss:Color="#E6E6E6" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
  <Style ss:ID="infoValueStyle">
   <Font ss:Size="11"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="${tabName}">
  <Table>
   <Column ss:Width="40"/>
   <Column ss:Width="90"/>
   <Column ss:Width="100"/>
   <Column ss:Width="80"/>
   <Column ss:Width="70"/>
   <Column ss:Width="70"/>
   <Column ss:Width="80"/>
   <Column ss:Width="90"/>
   <Column ss:Width="90"/>
   <Column ss:Width="70"/>
   <Column ss:Width="70"/>
   <Column ss:Width="90"/>
   <Column ss:Width="120"/>
   <Column ss:Width="200"/>
   <Row>
    ${headerRow}
   </Row>
   ${rows}
  </Table>
 </Worksheet>
</Workbook>`
}

// Generate appropriate tab name based on report type and period
function getTabName(reportType: string, periodLabel: string): string {
  switch (reportType) {
    case 'weekly':
      return `Week ${periodLabel}`
    case 'monthly':
      return periodLabel // e.g., "June 2025"
    case 'quarterly':
      return periodLabel // e.g., "Q2 2025"
    case 'yearly':
      return periodLabel // e.g., "2025"
    default:
      return 'Trade Report'
  }
}

// Fallback function to generate basic CSV
function generateBasicCSV(trades: Trade[], reportType: string, periodLabel: string): string {
  const headers = ['#', 'Date', 'Currency Pair', 'Trade Type', 'Entry Time', 'Exit Time', 'Duration (m)', 'Entry Price', 'Exit Price', 'Net Pips', 'Lot Size', 'P/L ($)', 'Tags', 'Notes']
  
  const rows = trades.map((trade, index) => [
    index + 1,
    formatDate(new Date(trade.date), 'MMM dd, yyyy'),
    trade.currency_pair || '-',
    trade.trade_type || '-',
    trade.entry_time ? formatDate(new Date(trade.entry_time), 'HH:mm') : '-',
    trade.exit_time ? formatDate(new Date(trade.exit_time), 'HH:mm') : '-',
    trade.duration || '-',
    trade.entry_price ? 
      (trade.currency_pair === 'USDJPY' ? trade.entry_price.toFixed(3) : trade.entry_price.toFixed(5)) : '-',
    trade.exit_price ? 
      (trade.currency_pair === 'USDJPY' ? trade.exit_price.toFixed(3) : trade.exit_price.toFixed(5)) : '-',
    trade.pips !== null && trade.pips !== undefined ? `${trade.pips > 0 ? '+' : ''}${trade.pips}` : '-',
    trade.lot_size ? trade.lot_size.toFixed(2) : '-',
    trade.profit_loss !== null && trade.profit_loss !== undefined ? `${trade.profit_loss > 0 ? '+' : ''}${trade.profit_loss.toFixed(2)}` : '-',
    Array.isArray(trade.tags) ? trade.tags.join(', ') : trade.tags || '-',
    trade.notes || '-'
  ])
  
  // Add report info
  rows.push([])
  rows.push(['Report Type', reportType])
  rows.push(['Period', periodLabel])
  rows.push(['Total Trades', trades.length.toString()])
  rows.push(['Generated', formatDate(new Date(), 'MMM dd, yyyy HH:mm')])
  
  const csvRows = [headers, ...rows]
  return csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
}

// Format trade data for Excel (same as trade records export)
function formatTradeData(trades: Trade[]) {
  return trades.map((trade, index) => ({
    '#': index + 1,
    'Date': formatDate(new Date(trade.date), 'MMM dd, yyyy'),
    'Currency Pair': trade.currency_pair || '-',
    'Trade Type': trade.trade_type || '-',
    'Entry Time': trade.entry_time ? formatDate(new Date(trade.entry_time), 'HH:mm') : '-',
    'Exit Time': trade.exit_time ? formatDate(new Date(trade.exit_time), 'HH:mm') : '-',
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

// Get date range for report
function getDateRangeForReport(reportType: 'weekly' | 'monthly' | 'quarterly' | 'yearly'): { startDate: Date; endDate: Date } {
  const now = new Date()
  
  switch (reportType) {
    case 'weekly':
      // Get the previous week (Monday 00:00 to Sunday 23:59)
      const lastMonday = new Date(now)
      lastMonday.setDate(now.getDate() - now.getDay() - 7)
      lastMonday.setHours(0, 0, 0, 0)
      
      const lastSunday = new Date(lastMonday)
      lastSunday.setDate(lastMonday.getDate() + 6)
      lastSunday.setHours(23, 59, 59, 999)
      
      return { startDate: lastMonday, endDate: lastSunday }
      
    case 'monthly':
      // Get the previous month
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      
      return { startDate: lastMonth, endDate: lastMonthEnd }
      
    case 'quarterly':
      // Get the previous quarter
      const currentQuarter = Math.floor(now.getMonth() / 3)
      const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1
      const lastQuarterYear = currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear()
      
      const quarterStartMonth = lastQuarter * 3
      const quarterEndMonth = quarterStartMonth + 2
      
      const quarterStart = new Date(lastQuarterYear, quarterStartMonth, 1)
      const quarterEnd = new Date(lastQuarterYear, quarterEndMonth + 1, 0, 23, 59, 59, 999)
      
      return { startDate: quarterStart, endDate: quarterEnd }
      
    case 'yearly':
      // Get the previous year
      const lastYear = new Date(now.getFullYear() - 1, 0, 1)
      const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
      
      return { startDate: lastYear, endDate: lastYearEnd }
      
    default:
      throw new Error('Invalid report type')
  }
}

// Get report period label
function getReportPeriodLabel(reportType: 'weekly' | 'monthly' | 'quarterly' | 'yearly'): string {
  const { startDate, endDate } = getDateRangeForReport(reportType)
  
  switch (reportType) {
    case 'weekly':
      return `${formatDate(startDate, 'MMM dd')} - ${formatDate(endDate, 'MMM dd, yyyy')}`
    case 'monthly':
      return formatDate(startDate, 'MMMM yyyy')
    case 'quarterly':
      const quarterNumber = Math.floor(startDate.getMonth() / 3) + 1
      return `Q${quarterNumber} ${startDate.getFullYear()}`
    case 'yearly':
      return startDate.getFullYear().toString()
    default:
      return ''
  }
}

// Convert Uint8Array to base64 string
function arrayToBase64(array: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < array.length; i++) {
    binary += String.fromCharCode(array[i])
  }
  return btoa(binary)
}

// Generate Excel content (simplified version for edge functions)
function generateExcelContent(tradeData: any[], reportType: string, periodLabel: string): string {
  // Create CSV content with proper formatting (Excel can open CSV files)
  const headers = ['#', 'Date', 'Currency Pair', 'Trade Type', 'Entry Time', 'Exit Time', 'Duration (m)', 'Entry Price', 'Exit Price', 'Net Pips', 'Lot Size', 'P/L', 'Currency', 'Tags', 'Notes']
  
  const rows = tradeData.map(trade => [
    trade['#'],
    trade['Date'],
    trade['Currency Pair'],
    trade['Trade Type'],
    trade['Entry Time'],
    trade['Exit Time'],
    trade['Duration (m)'],
    trade['Entry Price'],
    trade['Exit Price'],
    trade['Net Pips'],
    trade['Lot Size'],
    trade['P/L'],
    trade['Currency'],
    trade['Tags'],
    trade['Notes']
  ])
  
  // Add report info at the end
  rows.push([])
  rows.push(['Report Type', reportType])
  rows.push(['Period', periodLabel])
  rows.push(['Total Trades', tradeData.length.toString()])
  rows.push(['Generated', formatDate(new Date(), 'MMM dd, yyyy HH:mm')])
  
  const csvRows = [headers, ...rows]
  return csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
}

// Generate report for a specific user and report type
async function generateReport(userId: string, reportType: 'weekly' | 'monthly' | 'quarterly' | 'yearly') {
  try {
    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, username')
      .eq('id', userId)
      .single()
    
    if (profileError || !userProfile?.email) {
      console.error('Error fetching user profile:', profileError)
      throw new Error(`Failed to fetch user profile: ${profileError?.message}`)
    }
    
    // Get date range for report
    const { startDate, endDate } = getDateRangeForReport(reportType)
    const periodLabel = getReportPeriodLabel(reportType)
    
    // Get trades for the period
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .order('date', { ascending: false })
    
    if (tradesError) {
      console.error('Error fetching trades:', tradesError)
      throw new Error(`Failed to fetch trades: ${tradesError.message}`)
    }
    
    // Generate professional Excel file
    const { buffer: excelBuffer, fileName } = await generateProfessionalExcel(trades || [], reportType, periodLabel, userId)
    
    // Prepare email content
    const emailSubject = `Your ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Trade Report - ${periodLabel}`
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">Trader's Journal</h1>
          <p style="color: #666; margin: 5px 0 0 0;">${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Trade Report</p>
        </div>
        <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
          <h2 style="color: #333; margin-top: 0;">Your ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Trade Report</h2>
          <p style="color: #333; font-size: 16px;">
            Here's your ${reportType} trade report for <strong>${periodLabel}</strong>.
          </p>
          
          ${trades && trades.length > 0 ? `
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #333;">Report Summary:</h3>
              <p style="margin: 5px 0;"><strong>Period:</strong> ${periodLabel}</p>
              <p style="margin: 5px 0;"><strong>Total Trades:</strong> ${trades.length}</p>
              <p style="margin: 5px 0;"><strong>Report Type:</strong> ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Trade Report</p>
            </div>
          ` : `
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #ffeaa7;">
              <h3 style="margin: 0 0 10px 0; color: #856404;">No Trades This ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}</h3>
              <p style="margin: 5px 0; color: #856404;">
                You didn't record any trades during ${periodLabel}. 
                This is completely normal - every trader has quiet periods.
              </p>
              <p style="margin: 10px 0 0 0; color: #856404; font-size: 14px;">
                When you start recording trades again, you'll receive detailed ${reportType} reports with attachments.
              </p>
            </div>
          `}

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://tradersjournal.pro/trade-records" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Your Trades
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 14px;">
            You're receiving this email because you have ${reportType} trade reports enabled.
            <br>
            <a href="https://tradersjournal.pro/settings" style="color: #007bff;">Manage your notification preferences</a>
          </p>
        </div>
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p>© ${new Date().getFullYear()} Trader's Journal. All rights reserved.</p>
        </div>
      </div>
    `

    // Send email with Excel attachment if trades exist
    if (trades && trades.length > 0) {
      await sendEmail(userProfile.email, emailSubject, emailHtml, [{
        filename: fileName,
        content: arrayToBase64(excelBuffer),
        contentType: 'application/vnd.ms-excel'
      }])
    } else {
      await sendEmail(userProfile.email, emailSubject, emailHtml)
    }
    
    return {
      success: true,
      userId,
      reportType,
      tradesCount: trades?.length || 0
    }
    
  } catch (error) {
    console.error(`Error generating ${reportType} report for user ${userId}:`, error)
    throw error
  }
}

// Process reports based on type
async function processReports(reportType: 'weekly' | 'monthly' | 'quarterly' | 'yearly') {
  try {
    // Get all users with this report type enabled
    const { data: users, error: usersError } = await supabase
      .from('user_settings')
      .select('user_id')
      .eq(`${reportType}_reports`, true)
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
      throw usersError
    }
    
    if (!users || users.length === 0) {
      console.log(`No users have ${reportType} reports enabled`)
      return { success: true, processed: 0, results: [] }
    }
    
    console.log(`Processing ${reportType} reports for ${users.length} users`)
    
    const results = []
    let successCount = 0
    let errorCount = 0
    
    for (const user of users) {
      try {
        const result = await generateReport(user.user_id, reportType)
        results.push({ userId: user.user_id, success: true, ...result })
        successCount++
      } catch (error) {
        console.error(`Error processing ${reportType} report for user ${user.user_id}:`, error)
        results.push({ 
          userId: user.user_id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
        errorCount++
      }
    }
    
    return {
      success: true,
      processed: users.length,
      successCount,
      errorCount,
      results
    }
    
  } catch (error) {
    console.error(`Error processing ${reportType} reports:`, error)
    throw error
  }
}

// Main handler function
serve(async (req) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json'
  }

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }

  try {
    const body = await req.json()
    const { reportType, action } = body

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Missing action parameter" }),
        { headers, status: 400 }
      )
    }

    switch (action) {
      case 'process_reports':
        if (!reportType || !['weekly', 'monthly', 'quarterly', 'yearly'].includes(reportType)) {
          return new Response(
            JSON.stringify({ error: "Invalid report type. Must be one of: weekly, monthly, quarterly, yearly" }),
            { headers, status: 400 }
          )
        }
        
        const result = await processReports(reportType)
        return new Response(JSON.stringify(result), { headers })
        
      case 'test_report':
        if (!reportType || !['weekly', 'monthly', 'quarterly', 'yearly'].includes(reportType)) {
          return new Response(
            JSON.stringify({ error: "Invalid report type. Must be one of: weekly, monthly, quarterly, yearly" }),
            { headers, status: 400 }
          )
        }
        
        const { userId } = body
        if (!userId) {
          return new Response(
            JSON.stringify({ error: "Missing userId for test report" }),
            { headers, status: 400 }
          )
        }
        
        const testResult = await generateReport(userId, reportType)
        return new Response(JSON.stringify(testResult), { headers })
        
      default:
        return new Response(
          JSON.stringify({ error: "Invalid action. Must be one of: process_reports, test_report" }),
          { headers, status: 400 }
        )
    }
    
  } catch (error) {
    console.error('Error in periodic-trade-reports function:', error)
    return new Response(
      JSON.stringify({
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { headers, status: 500 }
    )
  }
}) 