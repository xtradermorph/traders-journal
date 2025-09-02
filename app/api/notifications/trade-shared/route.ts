import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Resend } from "resend";

// Force dynamic rendering to prevent static generation issues
export const dynamic = "force-dynamic";


const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { recipientId, senderId, tradeId } = await req.json();

  // Authenticate the sender
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== senderId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user has trade shared emails enabled
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('email_trade_shared')
      .eq('user_id', recipientId)
      .single();

    if (!userSettings?.email_trade_shared) {
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
      .select('username')
      .eq('id', senderId)
      .single();

    // Get trade info
    const { data: trade } = await supabase
      .from('trades')
      .select('currency_pair, trade_type, entry_price, exit_price, profit_loss, date')
      .eq('id', tradeId)
      .single();

    const senderName = sender?.username || 'A trader';
    const tradeInfo = trade ? `${trade.currency_pair} ${trade.trade_type}` : 'a trade';

    // Send email
    await resend.emails.send({
      to: recipient.email,
      from: "Trader's Journal <noreply@tradersjournal.pro>",
      subject: `${senderName} shared ${tradeInfo} with you`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">Trader's Journal</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Trade Shared</p>
          </div>
          <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
            <h2 style="color: #333; margin-top: 0;">A trade has been shared with you!</h2>
            <p style="color: #333; font-size: 16px;">
              <strong>${senderName}</strong> has shared ${tradeInfo} with you on Trader's Journal.
            </p>
            ${trade ? `
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #333;">Trade Details:</h3>
              <p style="margin: 5px 0;"><strong>Pair:</strong> ${trade.currency_pair}</p>
              <p style="margin: 5px 0;"><strong>Type:</strong> ${trade.trade_type}</p>
              <p style="margin: 5px 0;"><strong>Entry:</strong> ${trade.entry_price}</p>
              ${trade.exit_price ? `<p style="margin: 5px 0;"><strong>Exit:</strong> ${trade.exit_price}</p>` : ''}
              ${trade.profit_loss ? `<p style="margin: 5px 0;"><strong>P&L:</strong> ${trade.profit_loss > 0 ? '+' : ''}${trade.profit_loss}</p>` : ''}
            </div>
            ` : ''}
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://tradersjournal.pro'}/shared-trades" 
                 style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Shared Trade
              </a>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 14px;">
              You're receiving this email because you have trade shared notifications enabled.
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
    console.error('Error sending trade shared email:', error);
    return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 });
  }
} 