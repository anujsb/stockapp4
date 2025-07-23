import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stocks, stockRealTimePrice, stockIntraDayPrice } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    // Get all stocks with their latest update times
    const stocksWithTimes = await db
      .select({
        id: stocks.id,
        symbol: stocks.symbol,
        name: stocks.name,
        lastRefreshedAt: stocks.lastRefreshedAt,
      })
      .from(stocks)
      .orderBy(desc(stocks.lastRefreshedAt))
      .limit(10);

    // Get latest real-time price updates
    const latestRealTimePrices = await db
      .select({
        stockId: stockRealTimePrice.stockId,
        price: stockRealTimePrice.price,
        updatedAt: stockRealTimePrice.updatedAt,
      })
      .from(stockRealTimePrice)
      .orderBy(desc(stockRealTimePrice.updatedAt))
      .limit(10);

    // Get latest intraday price updates
    const latestIntradayPrices = await db
      .select({
        stockId: stockIntraDayPrice.stockId,
        previousClose: stockIntraDayPrice.previousClose,
        updatedAt: stockIntraDayPrice.updatedAt,
      })
      .from(stockIntraDayPrice)
      .orderBy(desc(stockIntraDayPrice.updatedAt))
      .limit(10);

    // Calculate time differences
    const now = new Date();
    const formatTimeDiff = (date: Date) => {
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      
      if (days > 0) return `${days} days ago`;
      if (hours > 0) return `${hours} hours ago`;
      if (minutes > 0) return `${minutes} minutes ago`;
      return 'Just now';
    };

    const diagnosticData = {
      currentTime: now.toISOString(),
      istTime: new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).toISOString(),
      stocks: stocksWithTimes.map(stock => ({
        ...stock,
        lastRefreshedAt: stock.lastRefreshedAt?.toISOString(),
        timeSinceUpdate: stock.lastRefreshedAt ? formatTimeDiff(stock.lastRefreshedAt) : 'Never'
      })),
      realTimePrices: latestRealTimePrices.map(price => ({
        ...price,
        updatedAt: price.updatedAt.toISOString(),
        timeSinceUpdate: formatTimeDiff(price.updatedAt)
      })),
      intradayPrices: latestIntradayPrices.map(price => ({
        ...price,
        updatedAt: price.updatedAt.toISOString(),
        timeSinceUpdate: formatTimeDiff(price.updatedAt)
      })),
      summary: {
        totalStocks: stocksWithTimes.length,
        oldestStockUpdate: stocksWithTimes.length > 0 ? 
          stocksWithTimes[stocksWithTimes.length - 1].lastRefreshedAt?.toISOString() : null,
        newestStockUpdate: stocksWithTimes.length > 0 ? 
          stocksWithTimes[0].lastRefreshedAt?.toISOString() : null,
        oldestRealtimeUpdate: latestRealTimePrices.length > 0 ? 
          latestRealTimePrices[latestRealTimePrices.length - 1].updatedAt.toISOString() : null,
        newestRealtimeUpdate: latestRealTimePrices.length > 0 ? 
          latestRealTimePrices[0].updatedAt.toISOString() : null,
      }
    };

    return NextResponse.json({
      success: true,
      data: diagnosticData
    });

  } catch (error) {
    console.error('Error in debug update status:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
