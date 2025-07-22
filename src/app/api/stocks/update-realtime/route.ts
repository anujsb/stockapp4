import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { stocks } from '@/lib/db/schema';
import { StockDataService } from '@/lib/services/stockDataService';

// Helper to process stocks in batches to avoid overwhelming the API
async function processStockBatch(stockBatch: any[], batchSize: number = 5) {
  const results: { symbol: string; success: boolean; message: string }[] = [];
  
  for (let i = 0; i < stockBatch.length; i += batchSize) {
    const batch = stockBatch.slice(i, i + batchSize);
    
    // Process batch in parallel with error handling for individual stocks
    const batchPromises = batch.map(async (stock) => {
      try {
        // Use optimized method for real-time updates (only updates price data)
        const result = await StockDataService.updateRealTimePriceOnly(stock.symbol);
        return { 
          symbol: stock.symbol, 
          success: result.success, 
          message: result.message 
        };
      } catch (error) {
        console.error(`Error updating ${stock.symbol}:`, error);
        return { 
          symbol: stock.symbol, 
          success: false, 
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
        };
      }
    });
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    // Extract results from settled promises
    batchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({ 
          symbol: 'unknown', 
          success: false, 
          message: `Promise rejected: ${result.reason}` 
        });
      }
    });
    
    // Add delay between batches to respect API limits (500ms)
    if (i + batchSize < stockBatch.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

export async function POST() {
  try {
    // Optional: Check if user is authenticated (comment out if you want public access)
    // const { userId } = await auth();
    // if (!userId) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    console.log('Starting real-time stock price update...');
    
    // Get all stocks from database
    const allStocks = await db.select().from(stocks);
    
    if (allStocks.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No stocks found to update',
        results: [] 
      });
    }
    
    console.log(`Found ${allStocks.length} stocks to update`);
    
    // Process stocks in batches to avoid overwhelming the Yahoo Finance API
    const results = await processStockBatch(allStocks, 5);
    
    // Calculate success/failure stats
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    
    console.log(`Update complete: ${successCount} successful, ${failureCount} failed`);
    
    return NextResponse.json({ 
      success: true, 
      message: `Updated ${successCount}/${results.length} stocks successfully`,
      stats: {
        total: results.length,
        successful: successCount,
        failed: failureCount
      },
      results 
    });
    
  } catch (error) {
    console.error('Error updating real-time prices for all stocks:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to update stock prices'
    }, { status: 500 });
  }
}
