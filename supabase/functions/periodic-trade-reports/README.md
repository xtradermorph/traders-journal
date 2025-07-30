# Periodic Trade Reports Edge Function

This Supabase Edge Function handles periodic trade reports (weekly, monthly, quarterly, yearly) for the Trader's Journal application.

## Features

- **Weekly Reports**: Sent every Monday for the previous week
- **Monthly Reports**: Sent on the 1st of each month for the previous month
- **Quarterly Reports**: Sent on the 1st day of each quarter
- **Yearly Reports**: Sent on January 1st for the previous year

## Schedule

The function runs daily at 6:00 AM UTC and automatically determines which reports to send based on the current date.

## API Endpoints

### Process Reports
```bash
POST /functions/v1/periodic-trade-reports
{
  "action": "process_reports",
  "reportType": "weekly" | "monthly" | "quarterly" | "yearly"
}
```

### Test Report
```bash
POST /functions/v1/periodic-trade-reports
{
  "action": "test_report",
  "reportType": "weekly" | "monthly" | "quarterly" | "yearly",
  "userId": "user-uuid"
}
```

## Environment Variables

Required environment variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `RESEND_API_KEY`: Your Resend API key for sending emails
- `SITE_URL`: Your application's base URL (optional, defaults to https://tradersjournal.pro)

## Database Requirements

The function requires the following columns in the `user_settings` table:
- `weekly_reports` (boolean)
- `monthly_reports` (boolean)
- `quarterly_reports` (boolean)
- `yearly_reports` (boolean)

## Deployment

1. Deploy the function to Supabase:
   ```bash
   supabase functions deploy periodic-trade-reports
   ```

2. Set the required environment variables:
   ```bash
   supabase secrets set SUPABASE_URL=your_supabase_url
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   supabase secrets set RESEND_API_KEY=your_resend_api_key
   supabase secrets set SITE_URL=your_site_url
   ```

3. The function will automatically run on the schedule defined in `schedule.json`

## Testing

You can test the function manually using the test endpoint:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/periodic-trade-reports \
  -H "Authorization: Bearer your_anon_key" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "test_report",
    "reportType": "weekly",
    "userId": "your-user-id"
  }'
```

## Error Handling

The function includes comprehensive error handling:
- Database connection errors
- Email sending failures
- Missing user data
- Invalid parameters

All errors are logged and reported back to the calling system. 