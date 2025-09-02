import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Resend } from "resend";

// Force dynamic rendering to prevent static generation issues
export const dynamic = "force-dynamic";


const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { recipientId, senderId } = await req.json();

  // Authenticate the sender
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== senderId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user has friend request emails enabled
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('email_friend_requests')
      .eq('user_id', recipientId)
      .single();

    if (!userSettings?.email_friend_requests) {
      return NextResponse.json({ success: false, reason: 'Notifications disabled' });
    }

    // Get recipient email
    const { data: recipient } = await supabase
      .from('profiles')
      .select('email, username')
      .eq('id', recipientId)
      .single();

    if (!recipient?.email) {
      return NextResponse.json({ success: false, reason: 'Recipient email not found' });
    }

    // Get sender info
    const { data: sender } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', senderId)
      .single();

    const senderName = sender?.username || 'A trader';

    // Send email
    await resend.emails.send({
      to: recipient.email,
      from: "Trader's Journal <noreply@tradersjournal.pro>",
      subject: `New Friend Request from ${senderName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">Trader's Journal</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Friend Request</p>
          </div>
          <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
            <h2 style="color: #333; margin-top: 0;">You have a new friend request!</h2>
            <p style="color: #333; font-size: 16px;">
              <strong>${senderName}</strong> has sent you a friend request on Trader's Journal.
            </p>
            <p style="color: #666;">
              Connect with other traders to share insights, discuss strategies, and grow your trading network.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://tradersjournal.pro'}/friends" 
                 style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Friend Request
              </a>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 14px;">
              You're receiving this email because you have friend request notifications enabled.
              <br>
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://tradersjournal.pro'}/settings" style="color: #007bff;">Manage your notification preferences</a>
            </p>
          </div>
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            <p>© ${new Date().getFullYear()} Trader's Journal. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending friend request email:', error);
    return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 });
  }
} 