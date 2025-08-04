import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);



/**
 * Send friend request notification email
 */
export async function sendFriendRequestEmail(recipientId: string, senderId: string) {
  try {
    // Check if user has friend request emails enabled
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('email_friend_requests')
      .eq('user_id', recipientId)
      .single();

    if (!userSettings?.email_friend_requests) {
      return { success: false, reason: 'Notifications disabled' };
    }

    // Get recipient email
    const { data: recipient } = await supabase
      .from('profiles')
      .select('email, username')
      .eq('id', recipientId)
      .single();

    if (!recipient?.email) {
      return { success: false, reason: 'Recipient email not found' };
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

    return { success: true };
  } catch (error) {
    console.error('Error sending friend request email:', error);
    return { success: false, error };
  }
}

/**
 * Send trade shared notification email
 */
export async function sendTradeSharedEmail(recipientId: string, senderId: string, tradeId: string) {
  try {
    // Check if user has trade shared emails enabled
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('email_trade_shared')
      .eq('user_id', recipientId)
      .single();

    if (!userSettings?.email_trade_shared) {
      return { success: false, reason: 'Notifications disabled' };
    }

    // Get recipient email
    const { data: recipient } = await supabase
      .from('profiles')
      .select('email, username')
      .eq('id', recipientId)
      .single();

    if (!recipient?.email) {
      return { success: false, reason: 'Recipient email not found' };
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

    return { success: true };
  } catch (error) {
    console.error('Error sending trade shared email:', error);
    return { success: false, error };
  }
}

/**
 * Send medal achievement notification email
 */
export async function sendMedalAchievementEmail(userId: string, medalType: string) {
  try {
    // Check if user has medal achievement emails enabled
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('email_medal_achievement')
      .eq('user_id', userId)
      .single();

    if (!userSettings?.email_medal_achievement) {
      return { success: false, reason: 'Notifications disabled' };
    }

    // Get user email
    const { data: user } = await supabase
      .from('profiles')
      .select('email, username')
      .eq('id', userId)
      .single();

    if (!user?.email) {
      return { success: false, reason: 'User email not found' };
    }

    const medalNames = {
      'bronze': 'Bronze',
      'silver': 'Silver', 
      'gold': 'Gold',
      'platinum': 'Platinum',
      'diamond': 'Diamond'
    };

    const medalName = medalNames[medalType as keyof typeof medalNames] || medalType;

    // Send email
    await resend.emails.send({
      to: user.email,
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
            <p style="color: #333; font-size: 16px; text-align: center;">
              Your dedication to trading excellence has been recognized! 
              You've achieved the ${medalName} medal for your outstanding performance.
            </p>
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center;">
              <h3 style="margin: 0 0 15px 0; color: #333;">🏆 ${medalName} Medal</h3>
              <p style="color: #666; margin: 0;">
                This achievement represents your commitment to improving your trading skills and maintaining consistent performance.
              </p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://tradersjournal.pro'}/profile" 
                 style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Your Profile
              </a>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
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

    return { success: true };
  } catch (error) {
    console.error('Error sending medal achievement email:', error);
    return { success: false, error };
  }
}

/**
 * Send monthly trade checkup email
 */
export async function sendMonthlyTradeCheckupEmail(userId: string) {
  try {
    // Check if user has monthly checkup emails enabled
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('monthly_trade_checkup')
      .eq('user_id', userId)
      .single();

    if (!userSettings?.monthly_trade_checkup) {
      return { success: false, reason: 'Notifications disabled' };
    }

    // Get user email
    const { data: user } = await supabase
      .from('profiles')
      .select('email, username')
      .eq('id', userId)
      .single();

    if (!user?.email) {
      return { success: false, reason: 'User email not found' };
    }

    // Get monthly trading statistics
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const { data: monthlyTrades } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .gte('date', firstDayOfMonth.toISOString())
      .lte('date', lastDayOfMonth.toISOString());

    const totalTrades = monthlyTrades?.length || 0;
    const winningTrades = monthlyTrades?.filter(trade => trade.profit_loss > 0).length || 0;
    const totalProfit = monthlyTrades?.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0) || 0;
    const winRate = totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 100) : 0;

    // Send email
    await resend.emails.send({
      to: user.email,
      from: "Trader's Journal <noreply@tradersjournal.pro>",
      subject: `📊 Your Monthly Trading Report - ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">Trader's Journal</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Monthly Trading Report</p>
          </div>
          <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
            <h2 style="color: #333; margin-top: 0;">📊 Monthly Trading Summary</h2>
            <p style="color: #333; font-size: 16px;">
              Here's your trading performance for ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}:
            </p>
            
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div style="text-align: center;">
                  <h3 style="margin: 0; color: #333;">Total Trades</h3>
                  <p style="font-size: 24px; font-weight: bold; margin: 5px 0; color: #007bff;">${totalTrades}</p>
                </div>
                <div style="text-align: center;">
                  <h3 style="margin: 0; color: #333;">Win Rate</h3>
                  <p style="font-size: 24px; font-weight: bold; margin: 5px 0; color: #28a745;">${winRate}%</p>
                </div>
                <div style="text-align: center;">
                  <h3 style="margin: 0; color: #333;">Winning Trades</h3>
                  <p style="font-size: 24px; font-weight: bold; margin: 5px 0; color: #28a745;">${winningTrades}</p>
                </div>
                <div style="text-align: center;">
                  <h3 style="margin: 0; color: #333;">Total P&L</h3>
                  <p style="font-size: 24px; font-weight: bold; margin: 5px 0; color: ${totalProfit >= 0 ? '#28a745' : '#dc3545'}">
                    ${totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://tradersjournal.pro'}/trade-records" 
                 style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Detailed Report
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 14px;">
              You're receiving this email because you have monthly trade checkup notifications enabled.
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

    return { success: true };
  } catch (error) {
    console.error('Error sending monthly trade checkup email:', error);
    return { success: false, error };
  }
} 