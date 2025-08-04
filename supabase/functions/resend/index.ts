// Supabase Edge Function: resend
// This function handles email sending for password resets and notifications
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Define types for email requests
interface EmailRequest {
  to: string;
  subject: string;
  html?: string;
  type?: 'default' | 'passwordReset' | 'verification';
  resetLink?: string;
  verificationLink?: string;
}

// Email template types
const emailTemplates = {
  default: (subject, html)=>`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .logo {
          max-width: 150px;
          margin-bottom: 20px;
        }
        .content {
          margin-top: 20px;
        }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          color: #777;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <img 
          src="https://oweimywvzmqoizsyotrt.supabase.co/storage/v1/object/public/tj.images/logo.png" 
          alt="Trader's Journal Logo" 
          class="logo"
        />
        <div class="content">
          ${html}
        </div>
        <div class="footer">
          ${new Date().getFullYear()} Trader's Journal. All rights reserved.
          <br>
          If you did not expect this email, please ignore it.
        </div>
      </div>
    </body>
    </html>
  `,
  passwordReset: (subject, resetLink)=>`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .logo {
          max-width: 150px;
          margin-bottom: 20px;
        }
        .content {
          margin-top: 20px;
        }
        .reset-button {
          display: inline-block;
          background-color: #007bff;
          color: white;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          color: #777;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <img 
          src="https://oweimywvzmqoizsyotrt.supabase.co/storage/v1/object/public/tj.images/logo.png" 
          alt="Trader's Journal Logo" 
          class="logo"
        />
        <div class="content">
          <h2>Password Reset Request</h2>
          <p>You have requested to reset your password. Click the button below to proceed:</p>
          <a href="${resetLink}" class="reset-button">Reset Password</a>
          <p>If you did not request a password reset, please ignore this email or contact support.</p>
          <p>This link will expire in 24 hours.</p>
        </div>
        <div class="footer">
          ${new Date().getFullYear()} Trader's Journal. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `,
  verification: (subject, verificationLink)=>`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .logo {
          max-width: 150px;
          margin-bottom: 20px;
        }
        .content {
          margin-top: 20px;
        }
        .verify-button {
          display: inline-block;
          background-color: #28a745;
          color: white;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          color: #777;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <img 
          src="https://oweimywvzmqoizsyotrt.supabase.co/storage/v1/object/public/tj.images/logo.png" 
          alt="Trader's Journal Logo" 
          class="logo"
        />
        <div class="content">
          <h2>Verify Your Email Address</h2>
          <p>Thank you for signing up for Trader's Journal! Please verify your email address by clicking the button below:</p>
          <a href="${verificationLink}" class="verify-button">Verify Email</a>
          <p>If you did not create an account with us, please ignore this email.</p>
          <p>This link will expire in 24 hours.</p>
        </div>
        <div class="footer">
          ${new Date().getFullYear()} Trader's Journal. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `
};

// Main handler function
serve(async (req)=>{
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers
    });
  }

  try {
    // Get the request body
    const body = await req.json();
    const { to, subject, html, type = 'default', resetLink, verificationLink } = body;

    // Validate required fields
    if (!to || !subject) {
      return new Response(JSON.stringify({
        error: "Missing required fields"
      }), {
        headers,
        status: 400
      });
    }

    // Choose email template based on type
    let emailHtml;
    switch(type){
      case 'passwordReset':
        if (!resetLink) {
          return new Response(JSON.stringify({
            error: "Missing resetLink for password reset email"
          }), {
            headers,
            status: 400
          });
        }
        emailHtml = emailTemplates.passwordReset(subject, resetLink);
        break;
      case 'verification':
        if (!verificationLink) {
          return new Response(JSON.stringify({
            error: "Missing verificationLink for verification email"
          }), {
            headers,
            status: 400
          });
        }
        emailHtml = emailTemplates.verification(subject, verificationLink);
        break;
      default:
        emailHtml = emailTemplates.default(subject, html || '');
    }

    // Get Resend API key from environment
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return new Response(JSON.stringify({
        error: "Resend API key not configured"
      }), {
        headers,
        status: 500
      });
    }

    // Send the email using Resend API
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: "Trader's Journal <onboarding@resend.dev>",
        to,
        subject,
        html: emailHtml
      })
    });

    const data = await res.json();

    // Check if Resend API returned an error
    if (!res.ok) {
      return new Response(JSON.stringify({
        error: "Failed to send email",
        details: data
      }), {
        headers,
        status: res.status
      });
    }

    // Return success response
    return new Response(JSON.stringify({
      message: "Email sent successfully",
      data
    }), {
      headers
    });

  } catch (error) {
    // Handle any unexpected errors
    return new Response(JSON.stringify({
      error: "Failed to process email request",
      details: error instanceof Error ? error.message : "Unknown error"
    }), {
      headers,
      status: 500
    });
  }
});
