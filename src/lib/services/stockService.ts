// src/lib/services/stockService.ts
import { db } from '@/lib/db';
import { stocks } from '@/lib/db/schema';
import { Stock, StockCreationResult } from '@/types/stock.types';
import { YahooFinanceService } from './yahooFinanceService';
import { eq } from 'drizzle-orm';
import { normalizeStockSymbol } from '@/lib/utils/stockUtils';

/**
 * Service to manage stock operations
 */
export class StockService {
  /**
   * Create or update stock data
   */
  static async createOrUpdateStockData(symbol: string): Promise<StockCreationResult> {
    try {
      symbol = normalizeStockSymbol(symbol);
      // Fetch data from Yahoo Finance
      const { quote, modules } = await YahooFinanceService.getComprehensiveStockData(symbol);
      
      if (!quote || !quote.regularMarketPrice) {
        throw new Error(`Unable to fetch valid data for symbol: ${symbol}`);
      }

      const exchange = symbol.endsWith('.BO') ? 'BSE' : 'NSE';
      const currency = 'INR';

      // Check if stock already exists
      const existingStock = await db
        .select()
        .from(stocks)
        .where(eq(stocks.symbol, symbol))
        .limit(1);

      let stockId: number;
      let stockRecord: any;

      if (existingStock.length > 0) {
        // Update existing stock
        stockId = existingStock[0].id;
        const updatedStock = await db
          .update(stocks)
          .set({
            name: quote.longName,
            exchange,
            currency,
            sector: modules?.summaryProfile?.sector || null,
            industry: modules?.summaryProfile?.industry || null,
            lastRefreshedAt: new Date(),
          })
          .where(eq(stocks.id, stockId))
          .returning();
        
        stockRecord = updatedStock[0];
      } else {
        // Create new stock
        const newStock = await db
          .insert(stocks)
          .values({
            symbol,
            exchange,
            currency,
            name: quote.longName,
            sector: modules?.summaryProfile?.sector || null,
            industry: modules?.summaryProfile?.industry || null,
            lastRefreshedAt: new Date(),
          })
          .returning();
        
        stockRecord = newStock[0];
        stockId = stockRecord.id;
      }

      return {
        success: true,
        stockId,
        message: `Successfully processed stock data for ${symbol}`,
        data: { stock: stockRecord }
      };

    } catch (error) {
      console.error(`Error processing stock data for ${symbol}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get stock by symbol
   */
  static async getStockBySymbol(symbol: string): Promise<Stock | null> {
    try {
      const result = await db
        .select()
        .from(stocks)
        .where(eq(stocks.symbol, symbol.toUpperCase()))
        .limit(1);

      return result.length > 0 ? (result[0] as Stock) : null;
    } catch (error) {
      console.error('Error fetching stock by symbol:', error);
      return null;
    }
  }

  /**
   * Get all active stocks
   */
  static async getActiveStocks(): Promise<Stock[]> {
    try {
      const result = await db
        .select()
        .from(stocks)
        .where(eq(stocks.isActive, true));

      return result as Stock[];
    } catch (error) {
      console.error('Error fetching active stocks:', error);
      return [];
    }
  }
}

