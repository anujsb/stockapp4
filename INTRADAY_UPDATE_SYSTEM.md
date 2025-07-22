# Intraday Data Update System

## Overview

The intraday data update system is designed to automatically refresh the `stock_intraday_price` table at key market times (9:00 AM and 3:45 PM IST) whenever users log into the application. This ensures that users always have up-to-date market data without requiring manual intervention.

## How It Works

### 1. Automatic Updates on User Login

Every time a user logs into the application:
1. The `UserService.createOrGetUser()` method is called
2. This triggers a background check using `StockDataService.updateAllIntradayDataIfNeeded()`
3. The system determines if an update is needed based on IST market times
4. If needed, it updates data for all active stocks asynchronously

### 2. Market Time Logic

The system checks for updates at two key times each day (IST):
- **9:00 AM**: Market opening (gets pre-market and opening data)
- **3:45 PM**: Near market close (gets end-of-day data)

The `isIntradayUpdateNeeded()` function determines if an update is required by:
- Converting timestamps to IST timezone
- Comparing the last update time with the scheduled update times
- Returning `true` if the current time is past a scheduled update time and data hasn't been updated yet

### 3. Background Processing

Updates run in the background to avoid blocking user login:
- Updates are triggered asynchronously using Promise-based execution
- Results are logged but don't affect the user experience
- Failed updates are logged for debugging but don't cause user-facing errors

## Key Components

### StockDataService Methods

```typescript
// Check if update is needed based on market times
static isIntradayUpdateNeeded(lastUpdated: Date): boolean

// Get the oldest update timestamp across all stocks
static async getOldestIntradayUpdateTime(): Promise<Date | null>

// Update all active stocks if needed
static async updateAllIntradayDataIfNeeded(): Promise<{
  updated: boolean;
  message: string;
  count?: number;
}>
```

### UserService Integration

The `createOrGetUser()` method now includes:
```typescript
// Background intraday data update on user login
StockDataService.updateAllIntradayDataIfNeeded()
  .then(result => {
    if (result.updated && result.count) {
      console.log(`Background update: ${result.message}`);
    }
  })
  .catch(error => {
    console.error('Background intraday data update failed:', error);
  });
```

### API Endpoints

#### GET /api/stocks/update-intraday
Check if intraday data needs updating without triggering an update.

**Response:**
```json
{
  "success": true,
  "data": {
    "needsUpdate": boolean,
    "oldestUpdate": "ISO timestamp",
    "currentTime": "ISO timestamp"
  }
}
```

#### POST /api/stocks/update-intraday
Manually trigger an intraday data update.

**Response:**
```json
{
  "success": true,
  "data": {
    "updated": boolean,
    "message": "Update status message",
    "count": number_of_updated_stocks
  }
}
```

## Frontend Integration

### React Hook: useIntradayUpdates

A custom hook provides easy access to intraday update functionality:

```typescript
import { useIntradayUpdates } from '@/lib/hooks/useIntradayUpdates';

const {
  status,        // Current update status
  isLoading,     // Loading state
  error,         // Error state
  checkUpdateStatus,  // Function to check status
  triggerUpdate  // Function to manually trigger update
} = useIntradayUpdates();
```

## Database Schema

The system uses the existing `stock_intraday_price` table with the `updated_at` timestamp to track when data was last refreshed:

```sql
stock_intraday_price (
  id SERIAL PRIMARY KEY,
  stock_id INTEGER REFERENCES stocks(id),
  previous_close DECIMAL(18,4),
  open DECIMAL(18,4),
  day_high DECIMAL(18,4),
  day_low DECIMAL(18,4),
  fifty_two_week_high DECIMAL(18,4),
  fifty_two_week_low DECIMAL(18,4),
  fifty_day_moving_average DECIMAL(18,4),
  two_hundred_day_moving_average DECIMAL(18,4),
  average_daily_volume_3month BIGINT,
  average_daily_volume_10day BIGINT,
  market_cap BIGINT,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Performance Considerations

### 1. Asynchronous Processing
- Updates run in the background to prevent blocking user login
- Promise-based execution ensures non-blocking operation

### 2. Batch Processing
- Multiple stocks are updated in parallel
- Error handling ensures individual stock failures don't stop the entire process

### 3. Efficient Checking
- Only checks the oldest timestamp to determine if any update is needed
- Avoids unnecessary API calls when data is current

### 4. Rate Limiting
- Uses existing Yahoo Finance API rate limiting from the `updateRealTimePriceOnly` method
- Respects API quotas and prevents excessive requests

## Monitoring and Debugging

### Logging
All update activities are logged with appropriate levels:
- Successful updates: `console.log`
- Failed updates: `console.error`
- API errors: `console.error`

### Error Handling
- Network failures are gracefully handled
- Individual stock update failures don't stop the entire process
- User login is never blocked by update failures

## Configuration

### Market Hours
Currently hardcoded to IST (Asia/Kolkata timezone):
- Morning update: 9:00 AM IST
- Afternoon update: 3:45 PM IST

### Active Stocks
Only stocks with `is_active = true` are updated to optimize performance.

## Testing

### Manual Testing
1. Use the API endpoints to manually trigger updates
2. Check logs for successful background updates on user login
3. Verify timestamps in the database

### Automated Testing
The system can be tested by:
1. Calling the GET endpoint to check update status
2. Calling the POST endpoint to trigger updates
3. Monitoring database timestamps

## Future Enhancements

1. **Configurable Market Hours**: Allow customization of update times
2. **Multiple Exchanges**: Support different market hours for different exchanges
3. **Weekday/Weekend Logic**: Skip updates on non-trading days
4. **Retry Logic**: Implement retry mechanisms for failed updates
5. **Performance Metrics**: Track update performance and success rates
