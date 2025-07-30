import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });

  // 1. Authenticate and check admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
    
  if (!profile || profile.role?.toUpperCase() !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    // 2. Get total number of users
    const { count: totalUsers, error: totalError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    if (totalError) {
      console.error('Error fetching total users:', totalError);
      return NextResponse.json({ message: "Failed to fetch total users" }, { status: 500 });
    }

    // 3. Get users with project updates enabled
    const { count: subscribedUsers, error: subscribedError } = await supabase
      .from("user_settings")
      .select("*", { count: "exact", head: true })
      .eq("email_project_updates", true);

    if (subscribedError) {
      console.error('Error fetching subscribed users:', subscribedError);
      return NextResponse.json({ message: "Failed to fetch subscribed users" }, { status: 500 });
    }

    // 4. Get the last announcement sent (if we want to track this)
    // For now, we'll just return the basic stats

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      subscribedUsers: subscribedUsers || 0,
      lastSent: null // We can implement this later if needed
    });

  } catch (error) {
    console.error('Error in project update stats:', error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
} 