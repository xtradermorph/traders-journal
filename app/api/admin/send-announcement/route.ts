import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { subject, message, selectedUserIds, sendToAll } = await req.json();

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
  if (!profile || profile.role?.toLowerCase() !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  // 2. Determine which users to send to
  let userIds: string[] = [];

  if (sendToAll) {
    // Send to all users with project updates enabled
    const { data: users, error } = await supabase
      .from("user_settings")
      .select("user_id")
      .eq("email_project_updates", true);

    if (error) {
      return NextResponse.json({ message: "Failed to fetch users" }, { status: 500 });
    }
    
    userIds = users?.map(u => u.user_id) || [];
  } else {
    // Send to selected users only
    if (!selectedUserIds || selectedUserIds.length === 0) {
      return NextResponse.json({ message: "No users selected for notification." }, { status: 400 });
    }
    userIds = selectedUserIds;
  }

  if (userIds.length === 0) {
    return NextResponse.json({ message: "No users to notify." }, { status: 200 });
  }
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("email")
    .in("id", userIds);

  if (profileError) {
    return NextResponse.json({ message: "Failed to fetch emails" }, { status: 500 });
  }

  const emails = profiles.map((p: any) => p.email).filter(Boolean);

  // 4. Send the email using Resend (batch or loop)
  try {
    // Advanced: send in batches of 50 to avoid rate limits
    const batchSize = 50;
    let sentCount = 0;
    
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      await Promise.all(
        batch.map(email =>
          resend.emails.send({
            to: email,
            from: "Trader's Journal <noreply@tradersjournal.pro>",
            subject,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #f5f5f5; padding: 20px; text-align: center;">
                  <h1 style="color: #333; margin: 0;">Trader's Journal</h1>
                  <p style="color: #666; margin: 5px 0 0 0;">Project Update</p>
                </div>
                <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
                  <h2 style="color: #333; margin-top: 0;">${subject}</h2>
                  <div style="white-space: pre-wrap; line-height: 1.6; color: #333;">${message}</div>
                  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                  <p style="color: #666; font-size: 14px;">
                    You're receiving this email because you have project updates enabled in your notification settings.
                    <br>
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://tradersjournal.pro'}/settings" style="color: #007bff;">Manage your notification preferences</a>
                  </p>
                </div>
                <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
                  <p>© ${new Date().getFullYear()} Trader's Journal. All rights reserved.</p>
                  <p>If you no longer wish to receive these updates, you can disable them in your settings.</p>
                </div>
              </div>
            `,
          })
        )
      );
      sentCount += batch.length;
    }
    
    return NextResponse.json({ 
      message: `Announcement sent successfully to ${sentCount} users!`,
      sentCount 
    });
  } catch (err) {
    console.error('Error sending announcement emails:', err);
    return NextResponse.json({ message: "Failed to send emails." }, { status: 500 });
  }
} 