# Trade Reports Implementation

## Overview
This implementation provides periodic trade reports (weekly, monthly, quarterly, yearly) that are automatically sent to users via email with Excel attachments containing their trade data for the specified period.

## Features

### Report Types
1. **Weekly Reports**: Sent every Monday for the previous week (Monday 00:00 to Sunday 23:59)
2. **Monthly Reports**: Sent on the 1st of each month for the previous month
3. **Quarterly Reports**: Sent on the 1st day of each quarter (Jan 1, Apr 1, Jul 1, Oct 1)
4. **Yearly Reports**: Sent on January 1st for the previous year

### Key Features
- Excel file generation with trade data only (no analysis section)
- Professional email templates with unsubscribe links
- Proper error handling and logging
- User preference management in settings
- Automatic scheduling via cron jobs

## File Structure

```
app/
├── src/lib/tradeReports.ts          # Core Excel generation and date utilities
├── api/reports/
│   ├── weekly/route.ts              # Weekly reports endpoint
│   ├── monthly/route.ts             # Monthly reports endpoint
│   ├── quarterly/route.ts           # Quarterly reports endpoint
│   ├── yearly/route.ts              # Yearly reports endpoint
│   └── test/route.ts                # Test endpoint for development
└── api/cron/
    └── trade-reports/route.ts       # Main cron job scheduler
```

## API Endpoints

### Report Generation Endpoints
- `POST /api/reports/weekly` - Generate and send weekly reports
- `POST /api/reports/monthly` - Generate and send monthly reports
- `POST /api/reports/quarterly` - Generate and send quarterly reports
- `POST /api/reports/yearly` - Generate and send yearly reports

### Cron Job Endpoint
- `POST /api/cron/trade-reports` - Main scheduler (runs daily)

### Test Endpoint
- `POST /api/reports/test` - Manual testing endpoint

## Database Requirements

The system uses the existing `user_settings` table with these columns:
- `weekly_reports` (boolean)
- `monthly_reports` (boolean)
- `quarterly_reports` (boolean)
- `yearly_reports` (boolean)

## Cron Job Setup

### Option 1: External Cron Service (Recommended)
Set up a daily cron job to call the endpoint:

```bash
# Daily at 6:00 AM UTC
0 6 * * * curl -X POST https://yourdomain.com/api/cron/trade-reports
```

### Option 2: Vercel Cron Jobs
Add to `vercel.json`:

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

### Option 3: Supabase Edge Functions
Create a scheduled function in Supabase:

```typescript
// supabase/functions/scheduled-trade-reports/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const response = await fetch('https://yourdomain.com/api/cron/trade-reports', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  })
})
```

## Testing

### Manual Testing
Use the test endpoint to manually trigger reports:

```bash
# Test weekly reports for all users
curl -X POST https://yourdomain.com/api/reports/test \
  -H "Content-Type: application/json" \
  -d '{"reportType": "weekly"}'

# Test monthly reports for specific user
curl -X POST https://yourdomain.com/api/reports/test \
  -H "Content-Type: application/json" \
  -d '{"reportType": "monthly", "userId": "user-uuid"}'
```

### Development Testing
1. Enable a report type in your user settings
2. Use the test endpoint to trigger the report
3. Check your email for the report with Excel attachment

## Email Templates

All reports use consistent email templates with:
- Trader's Journal branding
- Report summary (if trades exist)
- "No trades" message (if no trades in period)
- Link to trade records
- Unsubscribe link to settings
- Professional styling

## Excel File Format

The Excel files contain:
- Trade data only (no analysis section)
- Proper formatting and styling
- Color-coded P&L and pips
- Report metadata at the bottom
- Professional column headers

## Error Handling

The system includes comprehensive error handling:
- Database connection errors
- Email sending failures
- Missing user data
- Invalid date ranges
- Excel generation errors

All errors are logged and reported back to the calling system.

## Security

- All endpoints require proper authentication
- User data is filtered by user_id
- Email addresses are validated
- File attachments are properly encoded

## Monitoring

The system logs all executions to the `audit_logs` table with:
- Execution timestamp
- Reports sent count
- Any errors encountered
- Execution date details

## User Experience

Users can:
1. Enable/disable each report type in settings
2. Receive professional emails with Excel attachments
3. Unsubscribe via email links
4. View their trade data in organized Excel format
5. Access reports even when they have no trades (with appropriate messaging)

## Future Enhancements

Potential improvements:
- Custom report periods
- Additional export formats (PDF, CSV)
- Report templates customization
- Performance analytics in reports
- Batch processing optimizations
- Advanced scheduling options 