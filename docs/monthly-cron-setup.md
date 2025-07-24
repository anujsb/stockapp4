# Monthly Stock Data Updates - Cron Job Setup

This document explains how to set up monthly cron jobs using [cron-job.org](https://cron-job.org/) to automatically update stock data in your application.

## Overview

The application provides 4 separate API endpoints for monthly data updates:
- **Fundamental Data**: EPS, PE ratios, book value, etc.
- **Financial Data**: Revenue, debt ratios, margins, growth rates
- **Statistics Data**: Institutional holdings, dividend history, earnings dates
- **Analyst Ratings**: Analyst recommendations and target prices

## API Endpoints

### 1. Fundamental Data Update
- **URL**: `POST https://yourdomain.com/api/stocks/update-fundamental-data`
- **Purpose**: Updates fundamental metrics like EPS, PE ratios, book value
- **Frequency**: Monthly
- **Data Source**: Yahoo Finance `quote()` API

### 2. Financial Data Update
- **URL**: `POST https://yourdomain.com/api/stocks/update-financial-data`
- **Purpose**: Updates financial metrics like revenue, debt, margins
- **Frequency**: Monthly
- **Data Source**: Yahoo Finance `quoteSummary()` with financialData module

### 3. Statistics Data Update
- **URL**: `POST https://yourdomain.com/api/stocks/update-statistics`
- **Purpose**: Updates statistics like institutional holdings, dividend info
- **Frequency**: Monthly
- **Data Source**: Yahoo Finance `quoteSummary()` with defaultKeyStatistics and calendarEvents modules

### 4. Analyst Ratings Update
- **URL**: `POST https://yourdomain.com/api/stocks/update-analyst-ratings`
- **Purpose**: Updates analyst recommendations and target prices
- **Frequency**: Monthly
- **Data Source**: Yahoo Finance `quoteSummary()` with financialData module

## Setting Up Cron Jobs on cron-job.org

### Step 1: Create Account
1. Go to [cron-job.org](https://cron-job.org/)
2. Sign up for a free account
3. Verify your email address

### Step 2: Create Cron Jobs

For each of the 4 endpoints, create a separate cron job:

#### Job 1: Fundamental Data
- **Title**: "Stock Fundamental Data Update"
- **URL**: `https://yourdomain.com/api/stocks/update-fundamental-data`
- **Request Method**: POST
- **Schedule**: Monthly (1st day at 2:00 AM)
- **Cron Expression**: `0 2 1 * *`

#### Job 2: Financial Data  
- **Title**: "Stock Financial Data Update"
- **URL**: `https://yourdomain.com/api/stocks/update-financial-data`
- **Request Method**: POST
- **Schedule**: Monthly (1st day at 2:30 AM)
- **Cron Expression**: `30 2 1 * *`

#### Job 3: Statistics Data
- **Title**: "Stock Statistics Data Update"
- **URL**: `https://yourdomain.com/api/stocks/update-statistics`
- **Request Method**: POST
- **Schedule**: Monthly (1st day at 3:00 AM)
- **Cron Expression**: `0 3 1 * *`

#### Job 4: Analyst Ratings
- **Title**: "Stock Analyst Ratings Update"
- **URL**: `https://yourdomain.com/api/stocks/update-analyst-ratings`
- **Request Method**: POST
- **Schedule**: Monthly (1st day at 3:30 AM)
- **Cron Expression**: `30 3 1 * *`

### Step 3: Configuration Details

For each cron job, configure:

**Request Settings:**
- **Method**: POST
- **Headers**: None required
- **Body**: Empty (no request body needed)
- **Timeout**: 300 seconds (5 minutes)
- **Follow Redirects**: Yes

**Schedule Settings:**
- **Timezone**: UTC (or your preferred timezone)
- **Start Date**: Set to current date
- **End Date**: Leave empty (indefinite)

**Notification Settings:**
- **On Failure**: Enable email notifications
- **On Success**: Optional (recommended for first month to verify)

## Expected Response Format

Each endpoint returns a JSON response:

```json
{
  "success": true,
  "message": "Financial data updated successfully",
  "result": {
    "total": 25,
    "successful": 23,
    "failed": 2,
    "results": [
      {
        "symbol": "RELIANCE.NS",
        "success": true,
        "message": "Financial data updated successfully"
      },
      {
        "symbol": "TCS.NS",
        "success": false,
        "message": "No financial data received"
      }
    ]
  }
}
```

## Monitoring and Troubleshooting

### Success Indicators
- **HTTP Status**: 200 OK
- **Response**: `"success": true`
- **Log Messages**: Check your application logs for update details

### Common Issues

1. **Rate Limiting**
   - **Symptom**: Multiple failures across stocks
   - **Solution**: Increase delay between cron jobs (45-60 minutes apart)

2. **API Timeout**
   - **Symptom**: HTTP 500 errors or timeouts
   - **Solution**: Increase timeout to 600 seconds, reduce batch size

3. **Invalid Stock Symbols**
   - **Symptom**: Individual stock failures
   - **Solution**: Check stock symbols in database, clean up inactive stocks

4. **Yahoo Finance API Changes**
   - **Symptom**: "No data received" errors
   - **Solution**: Check Yahoo Finance API status, update service if needed

### Monitoring Dashboard

Use the Monthly Updates Panel in your application:
- Navigate to `/debug` or admin panel
- View real-time status of each update type
- Check success/failure statistics
- View detailed error messages for failed updates

## Best Practices

1. **Stagger Execution**: Space cron jobs 30 minutes apart to avoid API rate limits

2. **Error Handling**: Each endpoint handles errors gracefully and continues processing other stocks

3. **Batch Processing**: Updates process stocks in batches of 3 with 1-second delays

4. **Monitoring**: Set up failure notifications to catch issues early

5. **Backup Schedule**: Consider running jobs on both 1st and 15th of month for redundancy

## Testing

Before setting up monthly cron jobs:

1. **Manual Testing**: Use the Monthly Updates Panel to test each endpoint
2. **API Testing**: Test endpoints directly with curl:
   ```bash
   curl -X POST https://yourdomain.com/api/stocks/update-fundamental-data
   ```
3. **Log Monitoring**: Check application logs during test runs
4. **Database Verification**: Verify data is being updated in database tables

## Security Considerations

- Endpoints are public (no authentication required for cron access)
- Consider adding API key authentication if needed
- Monitor for unusual traffic patterns
- Rate limiting is handled at application level

## Cost Considerations

- **cron-job.org**: Free for up to 60 executions per hour
- **Yahoo Finance**: Free API with rate limits
- **Server Resources**: Each update processes all active stocks (~5-10 minutes runtime)

This setup ensures your stock data stays current with monthly updates while respecting API rate limits and providing comprehensive monitoring capabilities.
