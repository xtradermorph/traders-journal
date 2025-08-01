# Performance Reports Generator

This Supabase Edge Function automatically generates and sends performance reports to users based on their notification preferences.

## Features

- **Weekly Reports**: Sent every Monday at 8:00 AM, covering the previous week's trading activity
- **Monthly Reports**: Sent on the 1st day of each month at 8:00 AM, covering the previous month
- **Quarterly Reports**: Sent on the 1st day of each quarter (Jan, Apr, Jul, Oct) at 8:00 AM
- **Yearly Reports**: Sent on January 1st at 8:00 AM, covering the previous year

## Implementation Details

The function:

1. Checks user settings to determine who should receive reports
2. Retrieves trade data for the relevant time period
3. Calculates performance metrics (win rate, profit/loss, etc.)
4. Generates HTML email with performance statistics
5. Sends the email using Resend API

## Required Environment Variables

- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key for database access
- `RESEND_API_KEY`: API key for the Resend email service

## Deployment

To deploy this function:

```bash
supabase functions deploy generate-reports --project-ref ynyzwdddwkzakptenhuy
supabase functions deploy-schedule generate-reports --project-ref ynyzwdddwkzakptenhuy
```

## Testing

You can manually trigger report generation for testing:

```bash
curl -X POST 'https://ynyzwdddwkzakptenhuy.supabase.co/functions/v1/generate-reports?type=weekly' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'
```

## Report Metrics

Each report includes:
- Total number of trades
- Win rate percentage
- Total profit/loss
- Average profit/loss per trade
- Largest win and loss
- Profit factor
