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
    // 2. Get all users with their basic info
    const { data: users, error } = await supabase
      .from("profiles")
      .select("id, email, username, first_name, last_name, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ message: "Failed to fetch users" }, { status: 500 });
    }

    // 3. Get user settings to check project updates preference
    const { data: userSettings, error: settingsError } = await supabase
      .from("user_settings")
      .select("user_id, email_project_updates");

    if (settingsError) {
      console.error('Error fetching user settings:', error);
      return NextResponse.json({ message: "Failed to fetch user settings" }, { status: 500 });
    }

    // 4. Create a map of user settings
    const settingsMap = new Map();
    userSettings?.forEach(setting => {
      settingsMap.set(setting.user_id, setting.email_project_updates);
    });

    // 5. Combine user data with settings
    const usersWithSettings = users?.map(user => ({
      id: user.id,
      email: user.email,
      username: user.username,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || user.email,
      hasProjectUpdates: settingsMap.get(user.id) || false,
      created_at: user.created_at
    })) || [];

    return NextResponse.json({
      users: usersWithSettings,
      totalUsers: usersWithSettings.length,
      subscribedUsers: usersWithSettings.filter(u => u.hasProjectUpdates).length
    });

  } catch (error) {
    console.error('Error in users list:', error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
} 