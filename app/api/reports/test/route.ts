import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// Force dynamic rendering to prevent static generation issues
export const dynamic = "force-dynamic";


export async function POST(req: NextRequest) {
  try {
    const { reportType, userId } = await req.json();
    
    if (!reportType || !['weekly', 'monthly', 'quarterly', 'yearly'].includes(reportType)) {
      return NextResponse.json({ 
        error: "Invalid report type. Must be one of: weekly, monthly, quarterly, yearly" 
      }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });
    
    // If userId is provided, test for that specific user, otherwise test for all users
    let users: { user_id: string }[] = [];
    
    if (userId) {
      // Test for specific user
      const { data: userSettings, error: userError } = await supabase
        .from('user_settings')
        .select('user_id')
        .eq('user_id', userId)
        .eq(`${reportType}_reports`, true)
        .single();

      if (userError || !userSettings) {
        return NextResponse.json({ 
          error: `User ${userId} not found or doesn't have ${reportType} reports enabled` 
        }, { status: 404 });
      }
      
      users = [userSettings];
    } else {
      // Test for all users with this report type enabled
      const { data: allUsers, error: usersError } = await supabase
        .from('user_settings')
        .select('user_id')
        .eq(`${reportType}_reports`, true);

      if (usersError) {
        return NextResponse.json({ 
          error: "Failed to fetch users" 
        }, { status: 500 });
      }

      if (!allUsers || allUsers.length === 0) {
        return NextResponse.json({ 
          message: `No users have ${reportType} reports enabled` 
        });
      }
      
      users = allUsers;
    }

    // Call the appropriate report endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://tradersjournal.pro'}/api/reports/${reportType}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      message: `Test ${reportType} reports executed`,
      report_type: reportType,
      users_tested: users.length,
      result: result
    });

  } catch (error) {
    console.error('Error in test reports endpoint:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 