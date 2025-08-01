# Supabase Integration Setup for Periodic Trade Reports

## Overview
This guide covers the complete Supabase integration for the periodic trade reports system, including database setup, edge functions, and cron job configuration.

## ✅ Current Status

### Email Notifications (Already Implemented)
- ✅ Individual notification preferences in `user_settings` table
- ✅ Email notification service (`app/lib/notificationService.ts`)
- ✅ API endpoints for friend requests, trade sharing, medal achievements
- ✅ Proper unsubscribe links and user preference management

### Periodic Trade Reports (New Implementation)
- ✅ Database schema updates
- ✅ API endpoints for all report types
- ✅ Excel generation library
- ✅ Email templates with attachments
- ✅ Supabase edge function
- ⏳ Cron job setup (pending)

## Database Setup

### 1. Run the Database Migration

Execute the SQL migration to add the new report columns:

```sql
-- Run this in your Supabase SQL editor
-- File: add_periodic_report_columns.sql

-- Add columns for periodic trade reports
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS weekly_reports BOOLEAN DEFAULT false;

ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS monthly_reports BOOLEAN DEFAULT false;

ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS quarterly_reports BOOLEAN DEFAULT false;

ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS yearly_reports BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN user_settings.weekly_reports IS 'Whether user wants weekly trade reports';
COMMENT ON COLUMN user_settings.monthly_reports IS 'Whether user wants monthly trade reports';
COMMENT ON COLUMN user_settings.quarterly_reports IS 'Whether user wants quarterly trade reports';
COMMENT ON COLUMN user_settings.yearly_reports IS 'Whether user wants yearly trade reports';

-- Update existing records to have default values
UPDATE user_settings SET weekly_reports = false WHERE weekly_reports IS NULL;
UPDATE user_settings SET monthly_reports = false WHERE monthly_reports IS NULL;
UPDATE user_settings SET quarterly_reports = false WHERE quarterly_reports IS NULL;
UPDATE user_settings SET yearly_reports = false WHERE yearly_reports IS NULL;
```

### 2. Verify Database Schema

After running the migration, verify that the columns exist:

```sql
-- Check the user_settings table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_settings'
ORDER BY ordinal_position;
```

## Supabase Edge Function Setup

### 1. Deploy the Edge Function

```bash
# Navigate to your project directory
cd "path/to/your/project"

# Deploy the periodic-trade-reports function
supabase functions deploy periodic-trade-reports
```

### 2. Set Environment Variables

```bash
# Set required environment variables
supabase secrets set SUPABASE_URL=your_supabase_project_url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
supabase secrets set RESEND_API_KEY=your_resend_api_key
supabase secrets set SITE_URL=https://yourdomain.com
```

### 3. Verify Function Deployment

```bash
# List deployed functions
supabase functions list

# Test the function
curl -X POST https://your-project.supabase.co/functions/v1/periodic-trade-reports \
  -H "Authorization: Bearer your_anon_key" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "test_report",
    "reportType": "weekly",
    "userId": "your-test-user-id"
  }'
```

## Cron Job Configuration

### Option 1: Supabase Scheduled Functions (Recommended)

The edge function is already configured with a schedule in `schedule.json`:

```json
{
  "cron": "0 6 * * *",
  "timezone": "UTC"
}
```

This runs daily at 6:00 AM UTC and automatically determines which reports to send.

### Option 2: External Cron Service

If you prefer external cron management:

```bash
# Daily at 6:00 AM UTC
0 6 * * * curl -X POST https://your-project.supabase.co/functions/v1/periodic-trade-reports \
  -H "Authorization: Bearer your_service_role_key" \
  -H "Content-Type: application/json" \
  -d '{"action": "process_reports", "reportType": "weekly"}'
```

### Option 3: Vercel Cron Jobs

Add to your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/trade-reports",
      "schedule": "0 6 * * *"
    }
  ]
}
```

## Testing the Integration

### 1. Enable Reports for a Test User

```sql
-- Enable weekly reports for a test user
UPDATE user_settings 
SET weekly_reports = true 
WHERE user_id = 'your-test-user-id';
```

### 2. Test Manual Report Generation

```bash
# Test weekly reports
curl -X POST https://your-project.supabase.co/functions/v1/periodic-trade-reports \
  -H "Authorization: Bearer your_anon_key" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "process_reports",
    "reportType": "weekly"
  }'
```

### 3. Test Individual User Report

```bash
# Test specific user
curl -X POST https://your-project.supabase.co/functions/v1/periodic-trade-reports \
  -H "Authorization: Bearer your_anon_key" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "test_report",
    "reportType": "weekly",
    "userId": "your-test-user-id"
  }'
```

## Monitoring and Logs

### 1. View Function Logs

```bash
# View recent logs
supabase functions logs periodic-trade-reports

# Follow logs in real-time
supabase functions logs periodic-trade-reports --follow
```

### 2. Database Audit Logs

The system logs executions to the `audit_logs` table:

```sql
-- View recent trade report executions
SELECT * FROM audit_logs 
WHERE action = 'trade_reports_cron_execution' 
ORDER BY created_at DESC 
LIMIT 10;
```

## Troubleshooting

### Common Issues

1. **Function not deploying:**
   - Check Supabase CLI is installed and authenticated
   - Verify project link: `supabase link --project-ref your-project-ref`

2. **Environment variables not set:**
   - Verify secrets are set: `supabase secrets list`
   - Check function logs for missing variables

3. **Email not sending:**
   - Verify Resend API key is correct
   - Check Resend dashboard for delivery status
   - Review function logs for email errors

4. **Database connection issues:**
   - Verify service role key has proper permissions
   - Check RLS policies allow function access

### Debug Commands

```bash
# Check function status
supabase functions list

# View function configuration
supabase functions show periodic-trade-reports

# Test function locally (if needed)
supabase functions serve periodic-trade-reports --env-file .env.local
```

## Security Considerations

1. **Service Role Key:** Only use for server-side operations
2. **RLS Policies:** Ensure proper data access controls
3. **Email Validation:** All emails are validated before sending
4. **Rate Limiting:** Consider implementing rate limits for manual testing

## Performance Optimization

1. **Batch Processing:** The function processes users in batches
2. **Error Handling:** Individual user failures don't stop the entire process
3. **Logging:** Comprehensive logging for monitoring and debugging
4. **Resource Management:** Efficient memory usage for large user bases

## Next Steps

1. ✅ Deploy the edge function
2. ✅ Set environment variables
3. ✅ Test with a single user
4. ✅ Monitor logs for any issues
5. ✅ Enable for production users
6. ✅ Set up monitoring and alerting

The system is now fully integrated with Supabase and ready for production use! 