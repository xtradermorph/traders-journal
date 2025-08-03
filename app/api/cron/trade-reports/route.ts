import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current date to determine which reports to send
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentDate = now.getDate(); // Day of month
    const currentMonth = now.getMonth(); // 0-11
    const currentYear = now.getFullYear();
    
    const reportsSent = {
      weekly: 0,
      monthly: 0,
      quarterly: 0,
      yearly: 0
    };
    
    const errors: string[] = [];

    // Check if it's Monday (weekly reports)
    if (currentDay === 1) {
      try {
        console.log('Sending weekly trade reports...');
        const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://tradersjournal.pro'}/api/reports/weekly`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        const result = await response.json();
        if (result.success) {
          reportsSent.weekly = result.successCount;
          console.log(`Weekly reports sent: ${result.successCount}`);
        } else {
          errors.push(`Weekly reports failed: ${result.error}`);
        }
      } catch (error) {
        errors.push(`Weekly reports error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Check if it's the first day of the month (monthly reports)
    if (currentDate === 1) {
      try {
        console.log('Sending monthly trade reports...');
        const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://tradersjournal.pro'}/api/reports/monthly`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        const result = await response.json();
        if (result.success) {
          reportsSent.monthly = result.successCount;
          console.log(`Monthly reports sent: ${result.successCount}`);
        } else {
          errors.push(`Monthly reports failed: ${result.error}`);
        }
      } catch (error) {
        errors.push(`Monthly reports error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Check if it's the first day of a new quarter (quarterly reports)
    // Quarters start: Jan 1, Apr 1, Jul 1, Oct 1
    const isQuarterStart = currentDate === 1 && (currentMonth === 0 || currentMonth === 3 || currentMonth === 6 || currentMonth === 9);
    
    if (isQuarterStart) {
      try {
        console.log('Sending quarterly trade reports...');
        const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://tradersjournal.pro'}/api/reports/quarterly`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        const result = await response.json();
        if (result.success) {
          reportsSent.quarterly = result.successCount;
          console.log(`Quarterly reports sent: ${result.successCount}`);
        } else {
          errors.push(`Quarterly reports failed: ${result.error}`);
        }
      } catch (error) {
        errors.push(`Quarterly reports error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Check if it's January 1st (yearly reports)
    if (currentDate === 1 && currentMonth === 0) {
      try {
        console.log('Sending yearly trade reports...');
        const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://tradersjournal.pro'}/api/reports/yearly`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        const result = await response.json();
        if (result.success) {
          reportsSent.yearly = result.successCount;
          console.log(`Yearly reports sent: ${result.successCount}`);
        } else {
          errors.push(`Yearly reports failed: ${result.error}`);
        }
      } catch (error) {
        errors.push(`Yearly reports error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Log the execution
    const logData = {
      timestamp: new Date().toISOString(),
      reports_sent: reportsSent,
      errors: errors.length > 0 ? errors : null,
      execution_date: {
        day: currentDay,
        date: currentDate,
        month: currentMonth,
        year: currentYear
      }
    };

    // Store execution log in database (optional)
    try {
      await supabase
        .from('audit_logs')
        .insert({
          action: 'trade_reports_cron_execution',
          entity_type: 'cron',
          entity_id: null,
          new_values: logData,
          event_type: 'system',
          table_name: 'trade_reports_cron',
          record_id: null
        });
    } catch (logError) {
      console.error('Failed to log cron execution:', logError);
    }

    const totalReportsSent = reportsSent.weekly + reportsSent.monthly + reportsSent.quarterly + reportsSent.yearly;
    
    return NextResponse.json({
      success: true,
      message: `Trade reports cron executed successfully`,
      reports_sent: reportsSent,
      total_reports_sent: totalReportsSent,
      errors: errors.length > 0 ? errors : null,
      execution_date: {
        day: currentDay,
        date: currentDate,
        month: currentMonth,
        year: currentYear
      }
    });

  } catch (error) {
    console.error('Error in trade reports cron:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 