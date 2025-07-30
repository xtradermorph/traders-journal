import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY || 're_Qm1eUGAE_2LnRhafhUFRmSQJaV1Ko1Xm3');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://oweimywvzmqoizsyotrt.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZWlteXd2em1xb2l6c3lvdHJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTI4NDU3NCwiZXhwIjoyMDY0ODYwNTc0fQ.5sC0t0GshmS2_vy3X-w82jcRCFvvxjILGgb6phOWXwE';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(request: Request) {
  try {
    // Get auth session from request cookies
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get request body
    const { requestId, to, subject, message } = await request.json();

    if (!requestId || !to || !subject || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get support request details to verify it exists
    const { data: supportRequest, error: requestError } = await supabase
      .from('support_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !supportRequest) {
      return NextResponse.json({ error: 'Support request not found' }, { status: 404 });
    }

    // Check if support_replies table exists, if not create it
    const { error: tableCheckError } = await supabase
      .from('support_replies')
      .select('id')
      .limit(1);
    
    if (tableCheckError && tableCheckError.message.includes('does not exist')) {
      // We need to create the table, but we'll return an error for now
      // as we should create this table in Supabase directly
      return NextResponse.json({ 
        error: 'Support replies table does not exist. Please create it in Supabase first.' 
      }, { status: 500 });
    }

    // Update support request with reply information
    const { error: updateError } = await supabase
      .from('support_requests')
      .update({
        last_replied_at: new Date().toISOString(),
        last_replied_by: session.user.id,
        status: supportRequest.status === 'new' ? 'in_progress' : supportRequest.status
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error updating support request:', updateError);
      // Continue with sending email even if update fails
    }

    // Store the reply in the database
    const { error: replyError } = await supabase
      .from('support_replies')
      .insert({
        support_request_id: requestId,
        admin_id: session.user.id,
        subject,
        message,
        created_at: new Date().toISOString()
      });

    if (replyError) {
      console.error('Error storing reply:', replyError);
      // Continue with sending email even if storing fails
    }

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Trader\'s Journal Support <support@traders-journal.com>',
      to: [to],
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center;">
            <h1 style="color: #333;">Trader's Journal Support</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
            <p style="margin-bottom: 20px;">Dear ${supportRequest.name},</p>
            <div style="white-space: pre-wrap; margin-bottom: 20px;">${message}</div>
            <p style="margin-bottom: 20px;">If you have any further questions, please don't hesitate to reply to this email or submit another support request.</p>
            <p style="margin-bottom: 10px;">Best regards,</p>
            <p style="margin-bottom: 20px;">Trader's Journal Support Team</p>
          </div>
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            <p>This is an automated response from Trader's Journal Support.</p>
            <p>© ${new Date().getFullYear()} Trader's Journal. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Reply sent successfully',
      data: emailData
    });
  } catch (error) {
    console.error('Error in support reply API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
