import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// Create server-side Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // Verify the request is from the cron job
  const authHeader = req.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET_KEY;
    
    if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ 
        error: "Unauthorized" 
      }, { status: 401 });
    }

    // Get all users with monthly trade checkup enabled
    const { data: usersWithCheckup, error: usersError } = await supabase
      .from('user_settings')
      .select(`
        user_id,
        profiles!inner(
          email,
          username
        )
      `)
      .eq('monthly_trade_checkup', true);

    if (usersError) {
      console.error('Error fetching users with monthly checkup enabled:', usersError);
      return NextResponse.json({ 
        error: "Failed to fetch users" 
      }, { status: 500 });
    }

    if (!usersWithCheckup || usersWithCheckup.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No users with monthly trade checkup enabled",
        processedUsers: 0
      });
    }

    // Calculate the previous month
    const now = new Date();
    const previousMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1; // 0-based month
    const previousYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    console.log(`Processing monthly checkup for ${usersWithCheckup.length} users for ${previousMonth + 1}/${previousYear}`);

    // Process each user
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const userSetting of usersWithCheckup) {
      try {
        // Call the Supabase Edge Function for each user
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/monthly-trade-checkup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            userId: userSetting.user_id,
            month: previousMonth,
            year: previousYear,
            isTest: false
          }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          successCount++;
          results.push({
            userId: userSetting.user_id,
            email: userSetting.profiles[0]?.email || 'Unknown',
            status: 'success',
            hasTrades: result.hasTrades,
            totalTrades: result.totalTrades
          });
          console.log(`✅ Monthly checkup sent to ${userSetting.profiles[0]?.email || 'Unknown'}`);
        } else {
          errorCount++;
          results.push({
            userId: userSetting.user_id,
            email: userSetting.profiles[0]?.email || 'Unknown',
            status: 'error',
            error: result.error || 'Unknown error'
          });
          console.error(`❌ Failed to send monthly checkup to ${userSetting.profiles[0]?.email || 'Unknown'}:`, result.error);
        }
      } catch (error) {
        errorCount++;
        results.push({
          userId: userSetting.user_id,
          email: userSetting.profiles[0]?.email || 'Unknown',
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error(`❌ Error processing monthly checkup for ${userSetting.profiles[0]?.email || 'Unknown'}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Monthly trade checkup processed for ${usersWithCheckup.length} users`,
      processedUsers: usersWithCheckup.length,
      successCount,
      errorCount,
      month: previousMonth + 1,
      year: previousYear,
      results
    });

  } catch (error) {
    console.error('Error in monthly checkup cron job:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 