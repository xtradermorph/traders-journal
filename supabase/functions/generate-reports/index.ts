// Supabase Edge Function: generate-reports
// This function generates and sends performance reports to users based on their preferences
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { format, subDays, subMonths, subQuarters, subYears, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'https://esm.sh/date-fns'

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Initialize Resend client
const resendApiKey = Deno.env.get('RESEND_API_KEY') || ''

// Define types
interface Trade {
  id: string
  user_id: string
  symbol: string
  entry_price: number
  exit_price: number
  quantity: number
  entry_date: string
  exit_date: string
  trade_type: 'BUY' | 'SELL'
  profit_loss: number
  profit_loss_percentage: number
  notes: string
}

interface UserSettings {
  user_id: string
  theme: string
  notification_preferences: {
    email: boolean
    push: boolean
    reports: {
      daily: boolean
      weekly: boolean
      monthly: boolean
    }
  }
  default_currency: string
}

interface UserProfile {
  id: string
  email: string
  full_name: string
  username: string
}

// Helper function to send emails using the resend edge function
async function sendEmail(to: string, subject: string, html: string, attachments: any[] = []) {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'Trader\'s Journal <reports@tradersjournal.pro>',
        to,
        subject,
        html,
        attachments
      })
    })
    
    const data = await res.json()
    console.log('Email sent:', data)
    return data
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}

// Calculate performance metrics from trades
function calculatePerformanceMetrics(trades: Trade[], period: string) {
  // Skip if no trades
  if (!trades || trades.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalProfit: 0,
      totalLoss: 0,
      totalProfitLoss: 0,
      averageProfitLoss: 0,
      averageDuration: 0,
      profitFactor: 0
    }
  }

  // Calculate metrics
  const winningTrades = trades.filter(trade => trade.profit_loss > 0)
  const losingTrades = trades.filter(trade => trade.profit_loss < 0)
  
  // Calculate profit/loss metrics
  const totalProfit = winningTrades.reduce((sum, trade) => sum + trade.profit_loss, 0)
  const totalLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.profit_loss, 0))
  const totalProfitLoss = totalProfit - totalLoss
  
  // Calculate duration metrics
  const tradeDurations = trades.map(trade => {
    const entryDate = new Date(trade.entry_date)
    const exitDate = new Date(trade.exit_date)
    return (exitDate.getTime() - entryDate.getTime()) / (1000 * 60) // Duration in minutes
  })
  
  const totalDuration = tradeDurations.reduce((sum, duration) => sum + duration, 0)
  
  // Calculate profit factor
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0
  
  return {
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
    totalProfit,
    totalLoss,
    totalProfitLoss,
    averageProfitLoss: trades.length > 0 ? totalProfitLoss / trades.length : 0,
    averageDuration: trades.length > 0 ? totalDuration / trades.length : 0,
    profitFactor
  }
}

// Generate HTML for weekly report
function generateReportHTML(user: UserProfile, metrics: any, period: string, dateRange: string, currency: string) {
  return `
    <h2>Trading Performance Report: ${period}</h2>
    <p>Hello ${user.full_name || user.username},</p>
    <p>Here is your ${period.toLowerCase()} trading performance report for ${dateRange}.</p>
    
    <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3>Summary</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Total Trades:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${metrics.totalTrades}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Winning Trades:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${metrics.winningTrades} (${metrics.winRate.toFixed(2)}%)</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Losing Trades:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${metrics.losingTrades}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Total Profit:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; color: green;">${currency} ${metrics.totalProfit.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Total Loss:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; color: red;">${currency} ${metrics.totalLoss.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Net Profit/Loss:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; color: ${metrics.totalProfitLoss >= 0 ? 'green' : 'red'};">${currency} ${metrics.totalProfitLoss.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Profit Factor:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 8px;"><strong>Average Trade Duration:</strong></td>
          <td style="padding: 8px; text-align: right;">${(metrics.averageDuration / 60).toFixed(2)} hours</td>
        </tr>
      </table>
    </div>
    
    <p>Keep up the good work and continue to refine your trading strategy based on these insights.</p>
    
    <p>You can view more detailed analytics by logging into your Trader's Journal dashboard.</p>
    
    <p>Happy trading!</p>
  `
}

// Generate weekly report for a user
async function generateWeeklyReport(userId: string) {
  // Get user profile
  const { data: userProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, username')
    .eq('id', userId)
    .single()
  
  if (profileError || !userProfile) {
    console.error('Error fetching user profile:', profileError)
    throw new Error(`Failed to fetch user profile: ${profileError?.message}`)
  }
  
  // Get user settings
  const { data: userSettings, error: settingsError } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (settingsError || !userSettings) {
    console.error('Error fetching user settings:', settingsError)
    throw new Error(`Failed to fetch user settings: ${settingsError?.message}`)
  }
  
  // Calculate date range for the past week
  const endDate = new Date()
  const startDate = subDays(endDate, 7)
  const dateRange = `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`
  
  // Get trades for the past week
  const { data: trades, error: tradesError } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .gte('exit_date', startDate.toISOString())
    .lte('exit_date', endDate.toISOString())
  
  if (tradesError) {
    console.error('Error fetching trades:', tradesError)
    throw new Error(`Failed to fetch trades: ${tradesError.message}`)
  }
  
  // Calculate performance metrics
  const metrics = calculatePerformanceMetrics(trades || [], 'Weekly')
  
  // Generate HTML report
  const html = generateReportHTML(
    userProfile,
    metrics,
    'Weekly',
    dateRange,
    userSettings.default_currency || 'USD'
  )
  
  return {
    to: userProfile.email,
    subject: `Weekly Trading Performance Report: ${dateRange}`,
    html
  }
}

// Generate monthly report for a user
async function generateMonthlyReport(userId: string) {
  // Get user profile
  const { data: userProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, username')
    .eq('id', userId)
    .single()
  
  if (profileError || !userProfile) {
    console.error('Error fetching user profile:', profileError)
    throw new Error(`Failed to fetch user profile: ${profileError?.message}`)
  }
  
  // Get user settings
  const { data: userSettings, error: settingsError } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (settingsError || !userSettings) {
    console.error('Error fetching user settings:', settingsError)
    throw new Error(`Failed to fetch user settings: ${settingsError?.message}`)
  }
  
  // Calculate date range for the past month
  const endDate = new Date()
  const startDate = subMonths(endDate, 1)
  const dateRange = `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`
  
  // Get trades for the past month
  const { data: trades, error: tradesError } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .gte('exit_date', startDate.toISOString())
    .lte('exit_date', endDate.toISOString())
  
  if (tradesError) {
    console.error('Error fetching trades:', tradesError)
    throw new Error(`Failed to fetch trades: ${tradesError.message}`)
  }
  
  // Calculate performance metrics
  const metrics = calculatePerformanceMetrics(trades || [], 'Monthly')
  
  // Generate HTML report
  const html = generateReportHTML(
    userProfile,
    metrics,
    'Monthly',
    dateRange,
    userSettings.default_currency || 'USD'
  )
  
  return {
    to: userProfile.email,
    subject: `Monthly Trading Performance Report: ${dateRange}`,
    html
  }
}

// Process reports based on type
async function processReports(reportType: 'daily' | 'weekly' | 'monthly') {
  // Get all users with email notifications and performance reports enabled
  const { data: userSettings, error } = await supabase
    .from('user_settings')
    .select('user_id, notification_preferences, default_currency')
  
  if (error || !userSettings) {
    console.error('Error fetching user settings:', error)
    return { success: false, error }
  }
  
  // Filter users based on report type and notification preferences
  const eligibleUsers = userSettings.filter((settings: any) => {
    if (!settings.notification_preferences?.email) {
      return false
    }

    switch (reportType) {
      case 'daily':
        return settings.notification_preferences?.reports?.daily
      case 'weekly':
        return settings.notification_preferences?.reports?.weekly
      case 'monthly':
        return settings.notification_preferences?.reports?.monthly
      default:
        return false
    }
  }).map((settings: any) => ({ 
    userId: settings.user_id, 
    currency: settings.default_currency || 'USD' 
  }))
  
  console.log(`Processing ${reportType} reports for ${eligibleUsers.length} users`)
  
  const results = []
  
  for (const { userId, currency } of eligibleUsers) {
    try {
      let reportData = null
      
      if (reportType === 'weekly') {
        reportData = await generateWeeklyReport(userId)
      } else if (reportType === 'monthly') {
        reportData = await generateMonthlyReport(userId)
      }
      
      if (reportData) {
        await sendEmail(reportData.to, reportData.subject, reportData.html)
        results.push({ userId, success: true })
      }
    } catch (error) {
      console.error(`Error generating ${reportType} report for user ${userId}:`, error)
      results.push({ userId, success: false, error })
    }
  }

  return { success: true, processed: results.length, results }
}

// Main handler function
serve(async (req) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers })
  }

  // Handle GET request
  if (req.method === 'GET') {
    try {
      // Get report type from URL query parameter
      const url = new URL(req.url || 'http://localhost')
      const reportType = url.searchParams.get('type') || 'daily'
      
      // Validate report type
      const validReportTypes = ['daily', 'weekly', 'monthly']
      if (!reportType || !validReportTypes.includes(reportType)) {
        return new Response(
          JSON.stringify({
            error: `Invalid report type. Must be one of: ${validReportTypes.join(', ')}`,
            received: reportType
          }),
          { headers, status: 400 }
        )
      }
      
      // Process the report
      const result = await processReports(reportType as 'daily' | 'weekly' | 'monthly')
      
      return new Response(
        JSON.stringify(result),
        { headers }
      )
    } catch (error: any) {
      console.error('Error generating reports:', error)
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' }
      })
    }
  }

  return new Response('Method not allowed', { status: 405, headers })
})
