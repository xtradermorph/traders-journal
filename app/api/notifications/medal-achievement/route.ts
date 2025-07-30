import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { userId, medalType } = await req.json();

  // Authenticate the user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user has medal achievement emails enabled
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('email_medal_achievement')
      .eq('user_id', userId)
      .single();

    if (!userSettings?.email_medal_achievement) {
      return NextResponse.json({ success: false, reason: 'Notifications disabled' });
    }

    // Get user email
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('email, username')
      .eq('id', userId)
      .single();

    if (!userProfile?.email) {
      return NextResponse.json({ success: false, reason: 'User email not found' });
    }

    const medalNames = {
      'bronze': 'Bronze',
      'silver': 'Silver', 
      'gold': 'Gold',
      'platinum': 'Platinum',
      'diamond': 'Diamond'
    };

    const medalName = medalNames[medalType as keyof typeof medalNames] || medalType;

    // Personalized congratulatory messages for each medal type
    const getMedalMessage = (medalType: string) => {
      switch (medalType.toLowerCase()) {
        case 'bronze':
          return {
            title: "Your First Step to Trading Excellence!",
            message: "Congratulations on earning your Bronze Medal! This is the beginning of your trading journey. You've shown the dedication to start tracking your trades and learning from each experience. Keep building on this foundation - every great trader started exactly where you are now."
          };
        case 'silver':
          return {
            title: "Rising Above the Basics!",
            message: "Excellent work earning your Silver Medal! You're demonstrating consistent effort and improving your trading discipline. Your commitment to journaling and analyzing your trades is setting you apart from casual traders. You're on the right path to becoming a serious trader."
          };
        case 'gold':
          return {
            title: "Achieving Trading Consistency!",
            message: "Outstanding! Your Gold Medal represents a significant milestone in your trading journey. You've shown the discipline and consistency that separates successful traders from the rest. Your dedication to maintaining detailed records and learning from every trade is truly commendable."
          };
        case 'platinum':
          return {
            title: "Professional Trading Excellence Achieved!",
            message: "Incredible achievement! Your Platinum Medal places you among the elite group of consistently profitable traders. You've mastered the fundamentals and demonstrated the discipline, patience, and analytical skills that define professional trading success. This level of performance is what all serious traders aspire to reach. You're not just trading - you're building a sustainable, profitable career. Keep maintaining this exceptional standard!"
          };
        case 'diamond':
          return {
            title: "Trading Mastery - The Immortal Level!",
            message: "Legendary achievement! Your Diamond Medal represents the pinnacle of trading excellence - a level that few ever reach. You've achieved what many consider almost impossible: consistent, sustainable, and exceptional trading performance. You're not just a trader; you're a master of the markets. Your dedication, discipline, and skill have placed you among the trading immortals. This is the level where legends are made. Congratulations on reaching the summit of trading excellence!"
          };
        default:
          return {
            title: "Congratulations on Your Achievement!",
            message: "You've earned a new medal for your outstanding trading performance. Your dedication to excellence and continuous improvement is truly inspiring."
          };
      }
    };

    const medalMessage = getMedalMessage(medalType);

    // Send email
    await resend.emails.send({
      to: userProfile.email,
      from: "Trader's Journal <noreply@tradersjournal.pro>",
      subject: `🎖️ Congratulations! You've earned the ${medalName} Medal!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">Trader's Journal</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Medal Achievement</p>
          </div>
          <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
            <div style="text-align: center; margin: 20px 0;">
              <h1 style="color: #333; margin: 0;">🎖️ Congratulations!</h1>
              <h2 style="color: #333; margin: 10px 0;">You've earned the ${medalName} Medal!</h2>
            </div>
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center;">
              <h3 style="margin: 0 0 15px 0; color: #333;">🏆 ${medalMessage.title}</h3>
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0;">
                ${medalMessage.message}
              </p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://tradersjournal.pro'}/profile" 
                 style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Your Profile
              </a>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <div style="background-color: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
              <p style="color: #333; font-size: 14px; margin: 0; font-style: italic;">
                <strong>From the Trader's Journal Team:</strong><br>
                Thank you for using our journal to track your trading journey. Your dedication to excellence inspires us all. 
                Keep pushing forward - your success story is being written with every trade you record.
              </p>
            </div>
            <p style="color: #666; font-size: 14px;">
              You're receiving this email because you have medal achievement notifications enabled.
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
    console.error('Error sending medal achievement email:', error);
    return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 });
  }
} 