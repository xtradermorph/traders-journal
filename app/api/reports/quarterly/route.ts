import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Resend } from "resend";
import { generateTradeReportExcel, getDateRangeForReport, getReportPeriodLabel, getReportFileName } from "@/lib/tradeReports";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get all users with quarterly reports enabled
    const { data: users, error: usersError } = await supabase
      .from('user_settings')
      .select('user_id, quarterly_reports')
      .eq('quarterly_reports', true);

    if (usersError) {
      console.error('Error fetching users with quarterly reports enabled:', usersError);
      return NextResponse.json({ 
        error: "Failed to fetch users" 
      }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ 
        message: "No users have quarterly reports enabled" 
      });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Get date range for quarterly report
    const { startDate, endDate } = getDateRangeForReport('quarterly');
    const periodLabel = getReportPeriodLabel('quarterly');

    // Process each user
    for (const user of users) {
      try {
        // Get user profile
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('email, username')
          .eq('id', user.user_id)
          .single();

        if (profileError || !userProfile?.email) {
          errorCount++;
          errors.push(`User ${user.user_id}: Email not found`);
          continue;
        }

        // Get trades for the quarter
        const { data: quarterlyTrades, error: tradesError } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.user_id)
          .gte('date', startDate.toISOString())
          .lte('date', endDate.toISOString())
          .order('date', { ascending: false });

        if (tradesError) {
          errorCount++;
          errors.push(`User ${user.user_id}: Failed to fetch trades`);
          continue;
        }

        // Generate Excel file
        const excelBuffer = await generateTradeReportExcel(
          quarterlyTrades || [], 
          'Quarterly Trade Report', 
          periodLabel
        );

        // Generate filename
        const fileName = getReportFileName('quarterly', userProfile.username || user.user_id);

        // Prepare email content
        const emailSubject = `Your Quarterly Trade Report - ${periodLabel}`;
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center;">
              <h1 style="color: #333; margin: 0;">Trader's Journal</h1>
              <p style="color: #666; margin: 5px 0 0 0;">Quarterly Trade Report</p>
            </div>
            <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
              <h2 style="color: #333; margin-top: 0;">Your Quarterly Trade Report</h2>
              <p style="color: #333; font-size: 16px;">
                Here's your quarterly trade report for <strong>${periodLabel}</strong>.
              </p>
              
              ${quarterlyTrades && quarterlyTrades.length > 0 ? `
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <h3 style="margin: 0 0 10px 0; color: #333;">Report Summary:</h3>
                  <p style="margin: 5px 0;"><strong>Period:</strong> ${periodLabel}</p>
                  <p style="margin: 5px 0;"><strong>Total Trades:</strong> ${quarterlyTrades.length}</p>
                  <p style="margin: 5px 0;"><strong>Report Type:</strong> Quarterly Trade Report</p>
                </div>
              ` : `
                <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #ffeaa7;">
                  <h3 style="margin: 0 0 10px 0; color: #856404;">No Trades This Quarter</h3>
                  <p style="margin: 5px 0; color: #856404;">
                    You didn't record any trades during ${periodLabel}. 
                    This is completely normal - every trader has quiet quarters.
                  </p>
                  <p style="margin: 10px 0 0 0; color: #856404; font-size: 14px;">
                    When you start recording trades again, you'll receive detailed quarterly reports with Excel attachments.
                  </p>
                </div>
              `}

              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://tradersjournal.pro'}/trade-records" 
                   style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  View Your Trades
                </a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #666; font-size: 14px;">
                You're receiving this email because you have quarterly trade reports enabled.
                <br>
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://tradersjournal.pro'}/settings" style="color: #007bff;">Manage your notification preferences</a>
              </p>
            </div>
            <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
              <p>© ${new Date().getFullYear()} Trader's Journal. All rights reserved.</p>
            </div>
          </div>
        `;

        // Send email with attachment if there are trades
        const emailData: {
          to: string;
          from: string;
          subject: string;
          html: string;
          attachments?: Array<{
            filename: string;
            content: string;
            contentType: string;
          }>;
        } = {
          to: userProfile.email,
          from: "Trader's Journal <noreply@tradersjournal.pro>",
          subject: emailSubject,
          html: emailHtml,
        };

        if (quarterlyTrades && quarterlyTrades.length > 0) {
          emailData.attachments = [{
            filename: fileName,
            content: Buffer.from(excelBuffer).toString('base64'),
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          }];
        }

        await resend.emails.send(emailData);
        successCount++;

      } catch (error) {
        console.error(`Error processing quarterly report for user ${user.user_id}:`, error);
        errorCount++;
        errors.push(`User ${user.user_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      processed: users.length,
      successCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error in quarterly reports endpoint:', error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
} 