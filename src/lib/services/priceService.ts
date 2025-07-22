// src/lib/services/priceService.ts
import { db } from '@/lib/db';
import { stockRealTimePrice, stockIntraDayPrice } from '@/lib/db/schema';
import { YahooQuoteData } from '@/types/stock.types';
import { eq } from 'drizzle-orm';

/**
 * Service to manage stock price operations
 */
export class PriceService {
  /**
   * Upsert real-time price data
   */
  static async upsertRealTimePrice(stockId: number, quote: YahooQuoteData) {
    try {
      const data = {
        stockId,
        price: quote.regularMarketPrice !== undefined ? quote.regularMarketPrice.toString() : null,
        volume: quote.regularMarketVolume !== undefined ? BigInt(quote.regularMarketVolume) : null,
        signal: null, // You can add logic to determine signals
        updatedAt: new Date(),
      };

      // Check if real-time price data already exists for this stock
      const existing = await db
        .select()
        .from(stockRealTimePrice)
        .where(eq(stockRealTimePrice.stockId, stockId))
        .limit(1);

      if (existing.length > 0) {
        // Update existing record
        return await db
          .update(stockRealTimePrice)
          .set(data)
          .where(eq(stockRealTimePrice.id, existing[0].id))
          .returning();
      } else {
        // Insert new record
        return await db.insert(stockRealTimePrice).values(data).returning();
      }
    } catch (error) {
      console.error('Error upserting real-time price:', error);
      throw error;
    }
  }

  /**
   * Upsert intraday price data
   */
  static async upsertIntraDayPrice(stockId: number, quote: YahooQuoteData) {
    try {
      // Check if data already exists for this stock (one record per stock)
      const existing = await db
        .select()
        .from(stockIntraDayPrice)
        .where(eq(stockIntraDayPrice.stockId, stockId))
        .limit(1);

      const data = {
        stockId,
        previousClose: quote.regularMarketPreviousClose !== undefined ? quote.regularMarketPreviousClose.toString() : null,
        open: quote.regularMarketOpen !== undefined ? quote.regularMarketOpen.toString() : null,
        dayHigh: quote.regularMarketDayHigh !== undefined ? quote.regularMarketDayHigh.toString() : null,
        dayLow: quote.regularMarketDayLow !== undefined ? quote.regularMarketDayLow.toString() : null,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh !== undefined ? quote.fiftyTwoWeekHigh.toString() : null,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow !== undefined ? quote.fiftyTwoWeekLow.toString() : null,
        fiftyDayMovingAverage: quote.fiftyDayAverage !== undefined ? quote.fiftyDayAverage.toString() : null,
        twoHundredDayMovingAverage: quote.twoHundredDayAverage !== undefined ? quote.twoHundredDayAverage.toString() : null,
        averageDailyVolume3Month: quote.averageDailyVolume3Month !== undefined ? BigInt(quote.averageDailyVolume3Month) : null,
        averageDailyVolume10Day: quote.averageDailyVolume10Day !== undefined ? BigInt(quote.averageDailyVolume10Day) : null,
        marketCap: quote.marketCap !== undefined ? BigInt(quote.marketCap) : null,
        updatedAt: new Date(),
      };

      if (existing.length > 0) {
        return await db
          .update(stockIntraDayPrice)
          .set(data)
          .where(eq(stockIntraDayPrice.id, existing[0].id))
          .returning();
      } else {
        return await db.insert(stockIntraDayPrice).values(data).returning();
      }
    } catch (error) {
      console.error('Error upserting intraday price:', error);
      throw error;
    }
  }

  /**
   * Get the oldest intraday data update time across all stocks
   */
  static async getOldestIntradayUpdateTime(): Promise<Date | null> {
    try {
      const result = await db
        .select({ updatedAt: stockIntraDayPrice.updatedAt })
        .from(stockIntraDayPrice)
        .orderBy(stockIntraDayPrice.updatedAt)
        .limit(1);
      
      return result.length > 0 ? result[0].updatedAt : null;
    } catch (error) {
      console.error('Error getting oldest intraday update time:', error);
      return null;
    }
  }
}
