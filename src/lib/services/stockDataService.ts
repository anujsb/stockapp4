// src/lib/services/stockDataService.ts
import { db } from '@/lib/db';
import { 
  stocks, 
  stockRealTimePrice, 
  stockIntraDayPrice, 
  stockFundamentalData, 
  stockFinancialData, 
  stockStatistics, 
  analystRating 
} from '../db/schema';
import { YahooFinanceService, YahooQuoteData, YahooModulesData } from './yahooFinanceService';
import { eq, and } from 'drizzle-orm';
import { normalizeStockSymbol } from '@/lib/utils/stockUtils';

export interface StockCreationResult {
  success: boolean;
  stockId?: number;
  message: string;
  data?: {
    stock: any;
    realTimePrice?: any;
    intraDayPrice?: any;
    fundamentalData?: any;
    financialData?: any;
    statistics?: any;
    analystRating?: any;
  };
}

export class StockDataService {
  /**
   * Create or update stock data from Yahoo Finance
   */
  static async createOrUpdateStockData(symbol: string): Promise<StockCreationResult> {
    try {
      symbol = normalizeStockSymbol(symbol);
      // Fetch data from Yahoo Finance
      const { quote, modules } = await YahooFinanceService.getComprehensiveStockData(symbol);
      
      if (!quote || !quote.regularMarketPrice) {
        return {
          success: false,
          message: `Unable to fetch valid data for symbol: ${symbol}`
        };
      }

      // Determine exchange and currency for Indian stocks
      let exchange = 'NSE';
      if (symbol.endsWith('.BO')) exchange = 'BSE';
      let currency = 'INR';

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

      const result: StockCreationResult = {
        success: true,
        stockId,
        message: `Successfully processed stock data for ${symbol}`,
        data: { stock: stockRecord }
      };

      // Insert/Update real-time price data
      if (quote.regularMarketPrice !== undefined) {
        const realTimePriceData = await this.upsertRealTimePrice(stockId, quote);
        result.data!.realTimePrice = realTimePriceData;
      }

      // Insert/Update intraday price data
      const intraDayPriceData = await this.upsertIntraDayPrice(stockId, quote);
      result.data!.intraDayPrice = intraDayPriceData;

      // Insert/Update fundamental data
      const fundamentalData = await this.upsertFundamentalData(stockId, quote);
      result.data!.fundamentalData = fundamentalData;

      // Insert/Update financial data
      if (modules?.financialData) {
        const financialData = await this.upsertFinancialData(stockId, modules.financialData);
        result.data!.financialData = financialData;
      }

      // Insert/Update statistics data
      if (modules?.defaultKeyStatistics || modules?.calendarEvents) {
        const statisticsData = await this.upsertStatistics(stockId, modules);
        result.data!.statistics = statisticsData;
      }

      // Insert/Update analyst rating
      if (modules?.financialData?.recommendationKey) {
        const analystData = await this.upsertAnalystRating(stockId, modules.financialData);
        result.data!.analystRating = analystData;
      }

      return result;

    } catch (error) {
      console.error(`Error processing stock data for ${symbol}:`, error);
      return {
        success: false,
        message: `Error processing stock data: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Helper to sanitize dates for Indian stocks
  private static safeDateFromTimestamp(ts?: number): string | null {
    if (!ts) return null;
    const date = new Date(ts * 1000);
    const year = date.getUTCFullYear();
    if (year < 1900 || year > 2100) return null;
    return date.toISOString().split('T')[0];
  }

  /**
   * Upsert real-time price data
   */
  private static async upsertRealTimePrice(stockId: number, quote: YahooQuoteData) {
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
      return null;
    }
  }
  
  /**
   * Upsert intraday price data
   */
  private static async upsertIntraDayPrice(stockId: number, quote: YahooQuoteData) {
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
      return null;
    }
  }

  /**
   * Upsert fundamental data
   */
  private static async upsertFundamentalData(stockId: number, quote: YahooQuoteData) {
    try {
      const data = {
        stockId,
        epsTTM: quote.epsTrailingTwelveMonths !== undefined ? quote.epsTrailingTwelveMonths.toString() : null,
        epsForward: quote.epsForward !== undefined ? quote.epsForward.toString() : null,
        bookValue: quote.bookValue !== undefined ? quote.bookValue.toString() : null,
        trailingPE: quote.trailingPE !== undefined ? quote.trailingPE.toString() : null,
        forwardPE: quote.forwardPE !== undefined ? quote.forwardPE.toString() : null,
        priceToBook: quote.priceToBook !== undefined ? quote.priceToBook.toString() : null,
        updatedAt: new Date(),
      };

      // Check if data exists for this month
      const currentMonth = new Date().toISOString().slice(0, 7);
      const existing = await db
        .select()
        .from(stockFundamentalData)
        .where(and(
          eq(stockFundamentalData.stockId, stockId)
        ))
        .limit(1);

      if (existing.length > 0) {
        return await db
          .update(stockFundamentalData)
          .set(data)
          .where(eq(stockFundamentalData.id, existing[0].id))
          .returning();
      } else {
        return await db.insert(stockFundamentalData).values(data).returning();
      }
    } catch (error) {
      console.error('Error upserting fundamental data:', error);
      return null;
    }
  }

  /**
   * Upsert financial data
   */
  private static async upsertFinancialData(stockId: number, financialData: any) {
    try {
      const data = {
        stockId,
        totalRevenue: financialData.totalRevenue !== undefined ? BigInt(financialData.totalRevenue) : null,
        totalCash: financialData.totalCash !== undefined ? BigInt(financialData.totalCash) : null,
        totalDebt: financialData.totalDebt !== undefined ? BigInt(financialData.totalDebt) : null,
        debtToEquity: financialData.debtToEquity !== undefined ? financialData.debtToEquity.toString() : null,
        currentRatio: financialData.currentRatio !== undefined ? financialData.currentRatio.toString() : null,
        quickRatio: financialData.quickRatio !== undefined ? financialData.quickRatio.toString() : null,
        profitMargin: financialData.profitMargins !== undefined ? financialData.profitMargins.toString() : null,
        grossMargin: financialData.grossMargins !== undefined ? financialData.grossMargins.toString() : null,
        operatingMargin: financialData.operatingMargins !== undefined ? financialData.operatingMargins.toString() : null,
        ebitdaMargin: financialData.ebitdaMargins !== undefined ? financialData.ebitdaMargins.toString() : null,
        returnOnAssets: financialData.returnOnAssets !== undefined ? financialData.returnOnAssets.toString() : null,
        returnOnEquity: financialData.returnOnEquity !== undefined ? financialData.returnOnEquity.toString() : null,
        revenueGrowth: financialData.revenueGrowth !== undefined ? financialData.revenueGrowth.toString() : null,
        earningsGrowth: financialData.earningsGrowth !== undefined ? financialData.earningsGrowth.toString() : null,
        updatedAt: new Date(),
      };

      const existing = await db
        .select()
        .from(stockFinancialData)
        .where(eq(stockFinancialData.stockId, stockId))
        .limit(1);

      if (existing.length > 0) {
        return await db
          .update(stockFinancialData)
          .set(data)
          .where(eq(stockFinancialData.id, existing[0].id))
          .returning();
      } else {
        return await db.insert(stockFinancialData).values(data).returning();
      }
    } catch (error) {
      console.error('Error upserting financial data:', error);
      return null;
    }
  }

  /**
   * Upsert statistics data
   */
  private static async upsertStatistics(stockId: number, modules: YahooModulesData) {
    try {
      const stats = modules.defaultKeyStatistics;
      const events = modules.calendarEvents;

      const data = {
        stockId,
        sharesHeldByInstitutions: stats?.heldPercentInstitutions?.toString() ?? null,
        sharesHeldByAllInsider: stats?.heldPercentInsiders?.toString() ?? null,
        lastSplitFactor: stats?.lastSplitFactor ?? null,
        lastSplitDate: this.safeDateFromTimestamp(stats?.lastSplitDate),
        lastDividendValue: stats?.lastDividendValue?.toString() ?? null,
        lastDividendDate: this.safeDateFromTimestamp(stats?.lastDividendDate),
        earningsDate: this.safeDateFromTimestamp(events?.earnings?.earningsDate?.[0]),
        earningsCallDate: this.safeDateFromTimestamp(events?.earnings?.earningsCallDate?.[0]),
        updatedAt: new Date(),
      };

      const existing = await db
        .select()
        .from(stockStatistics)
        .where(eq(stockStatistics.stockId, stockId))
        .limit(1);

      if (existing.length > 0) {
        return await db
          .update(stockStatistics)
          .set(data)
          .where(eq(stockStatistics.id, existing[0].id))
          .returning();
      } else {
        return await db.insert(stockStatistics).values(data).returning();
      }
    } catch (error) {
      console.error('Error upserting statistics:', error);
      return null;
    }
  }

  /**
   * Upsert analyst rating
   */
  private static async upsertAnalystRating(stockId: number, financialData: any) {
    try {
      const data = {
        stockId,
        recommendation: financialData.recommendationKey,
        numberOfAnalysts: financialData.numberOfAnalystOpinions,
        targetPriceHigh: financialData.targetHighPrice?.toString(),
        targetLowPrice: financialData.targetLowPrice?.toString(),
        updatedAt: new Date(),
      };

      const existing = await db
        .select()
        .from(analystRating)
        .where(eq(analystRating.stockId, stockId))
        .limit(1);

      if (existing.length > 0) {
        return await db
          .update(analystRating)
          .set(data)
          .where(eq(analystRating.id, existing[0].id))
          .returning();
      } else {
        return await db.insert(analystRating).values(data).returning();
      }
    } catch (error) {
      console.error('Error upserting analyst rating:', error);
      return null;
    }
  }

  /**
   * Optimized method to update only real-time price data (faster for bulk updates)
   */
  static async updateRealTimePriceOnly(symbol: string): Promise<StockCreationResult> {
    try {
      symbol = normalizeStockSymbol(symbol);
      
      // Only fetch quote data (no modules) for faster response
      const quote = await YahooFinanceService.getQuote(symbol);
      
      if (!quote || !quote.regularMarketPrice) {
        return {
          success: false,
          message: `Unable to fetch valid price data for symbol: ${symbol}`
        };
      }

      // Find stock in database
      const existingStock = await db
        .select()
        .from(stocks)
        .where(eq(stocks.symbol, symbol))
        .limit(1);

      if (existingStock.length === 0) {
        return {
          success: false,
          message: `Stock ${symbol} not found in database. Please add it first.`
        };
      }

      const stockId = existingStock[0].id;
      
      // Update only real-time price and basic intraday data
      const realTimePriceData = await this.upsertRealTimePrice(stockId, quote);
      const intraDayPriceData = await this.upsertIntraDayPrice(stockId, quote);
      
      // Update stock's last refreshed timestamp
      await db
        .update(stocks)
        .set({ lastRefreshedAt: new Date() })
        .where(eq(stocks.id, stockId));

      return {
        success: true,
        stockId,
        message: `Successfully updated real-time price for ${symbol}`,
        data: { 
          stock: existingStock[0],
          realTimePrice: realTimePriceData,
          intraDayPrice: intraDayPriceData
        }
      };

    } catch (error) {
      console.error(`Error updating real-time price for ${symbol}:`, error);
      return {
        success: false,
        message: `Error updating real-time price: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get stock by symbol
   */
  static async getStockBySymbol(symbol: string) {
    try {
      return await db
        .select()
        .from(stocks)
        .where(eq(stocks.symbol, symbol.toUpperCase()))
        .limit(1);
    } catch (error) {
      console.error('Error fetching stock by symbol:', error);
      return [];
    }
  }
}
