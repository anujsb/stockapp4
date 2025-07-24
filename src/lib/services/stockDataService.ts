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
   * Check if intraday data update is needed based on IST market hours.
   * Updates should happen at 9:00 AM (market open) and 3:45 PM (near market close).
   * Only updates on trading days (Monday-Friday).
   */
  static isIntradayUpdateNeeded(lastUpdated: Date): boolean {
    const now = new Date();
    
    // Convert to IST
    const nowIST = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const lastUpdatedIST = new Date(lastUpdated.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    
    // Check if today is a trading day (Monday = 1, Friday = 5, Saturday = 6, Sunday = 0)
    const dayOfWeek = nowIST.getDay();
    const isTradingDay = dayOfWeek >= 1 && dayOfWeek <= 5;
    
    if (!isTradingDay) {
      return false; // No updates on weekends
    }
    
    // Get today's date in IST
    const today = nowIST.toISOString().split('T')[0];
    
    // Create update times for today in IST
    const nineAM = new Date(`${today}T09:00:00.000+05:30`);
    const threeFortyFivePM = new Date(`${today}T15:45:00.000+05:30`);
    
    // Check if current time is past 9:00 AM and data wasn't updated after 9:00 AM today
    if (nowIST >= nineAM && lastUpdatedIST < nineAM) {
      return true;
    }
    
    // Check if current time is past 3:45 PM and data wasn't updated after 3:45 PM today
    if (nowIST >= threeFortyFivePM && lastUpdatedIST < threeFortyFivePM) {
      return true;
    }
    
    return false;
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

  /**
   * Update intraday data for all active stocks if needed
   */
  static async updateAllIntradayDataIfNeeded(): Promise<{ updated: boolean; message: string; count?: number }> {
    try {
      // Get the oldest update time to determine if any update is needed
      const oldestUpdate = await this.getOldestIntradayUpdateTime();
      
      if (!oldestUpdate || !this.isIntradayUpdateNeeded(oldestUpdate)) {
        return {
          updated: false,
          message: 'Intraday data is up to date'
        };
      }

      // Get all active stocks
      const activeStocks = await db
        .select()
        .from(stocks)
        .where(eq(stocks.isActive, true));

      if (activeStocks.length === 0) {
        return {
          updated: false,
          message: 'No active stocks found'
        };
      }

      let updatedCount = 0;
      const updatePromises = activeStocks.map(async (stock) => {
        try {
          const result = await this.updateRealTimePriceOnly(stock.symbol);
          if (result.success) {
            updatedCount++;
          }
        } catch (error) {
          console.error(`Failed to update ${stock.symbol}:`, error);
        }
      });

      // Wait for all updates to complete
      await Promise.all(updatePromises);

      return {
        updated: true,
        message: `Updated intraday data for ${updatedCount} stocks`,
        count: updatedCount
      };

    } catch (error) {
      console.error('Error updating all intraday data:', error);
      return {
        updated: false,
        message: `Error updating intraday data: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Update fundamental data for all active stocks (Monthly)
   */
  static async updateFundamentalDataForAll(): Promise<{ total: number; successful: number; failed: number; results: any[] }> {
    try {
      console.log('Starting fundamental data update for all stocks...');
      
      // Get all active stocks
      const activeStocks = await db
        .select()
        .from(stocks)
        .where(eq(stocks.isActive, true));

      if (activeStocks.length === 0) {
        return {
          total: 0,
          successful: 0,
          failed: 0,
          results: []
        };
      }

      const results: { symbol: string; success: boolean; message: string }[] = [];
      let successCount = 0;
      let failCount = 0;

      // Process stocks in batches of 3 to avoid overwhelming the API
      for (let i = 0; i < activeStocks.length; i += 3) {
        const batch = activeStocks.slice(i, i + 3);
        
        const batchPromises = batch.map(async (stock) => {
          try {
            // Get comprehensive data including fundamental data
            const { quote, modules } = await YahooFinanceService.getComprehensiveStockData(stock.symbol);
            
            if (!quote) {
              throw new Error('No quote data received');
            }

            // Update fundamental data
            await this.upsertFundamentalData(stock.id, quote);
            
            successCount++;
            return {
              symbol: stock.symbol,
              success: true,
              message: 'Fundamental data updated successfully'
            };
          } catch (error) {
            failCount++;
            console.error(`Failed to update fundamental data for ${stock.symbol}:`, error);
            return {
              symbol: stock.symbol,
              success: false,
              message: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
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

        // Add delay between batches
        if (i + 3 < activeStocks.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`Fundamental data update complete: ${successCount} successful, ${failCount} failed`);

      return {
        total: activeStocks.length,
        successful: successCount,
        failed: failCount,
        results
      };

    } catch (error) {
      console.error('Error updating fundamental data for all stocks:', error);
      throw error;
    }
  }

  /**
   * Update financial data for all active stocks (Monthly)
   */
  static async updateFinancialDataForAll(): Promise<{ total: number; successful: number; failed: number; results: any[] }> {
    try {
      console.log('Starting financial data update for all stocks...');
      
      // Get all active stocks
      const activeStocks = await db
        .select()
        .from(stocks)
        .where(eq(stocks.isActive, true));

      if (activeStocks.length === 0) {
        return {
          total: 0,
          successful: 0,
          failed: 0,
          results: []
        };
      }

      const results: { symbol: string; success: boolean; message: string }[] = [];
      let successCount = 0;
      let failCount = 0;

      // Process stocks in batches of 3 to avoid overwhelming the API
      for (let i = 0; i < activeStocks.length; i += 3) {
        const batch = activeStocks.slice(i, i + 3);
        
        const batchPromises = batch.map(async (stock) => {
          try {
            // Get comprehensive data including financial data
            const { quote, modules } = await YahooFinanceService.getComprehensiveStockData(stock.symbol);
            
            if (!modules?.financialData) {
              throw new Error('No financial data received');
            }

            // Update financial data
            await this.upsertFinancialData(stock.id, modules.financialData);
            
            successCount++;
            return {
              symbol: stock.symbol,
              success: true,
              message: 'Financial data updated successfully'
            };
          } catch (error) {
            failCount++;
            console.error(`Failed to update financial data for ${stock.symbol}:`, error);
            return {
              symbol: stock.symbol,
              success: false,
              message: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
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

        // Add delay between batches
        if (i + 3 < activeStocks.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`Financial data update complete: ${successCount} successful, ${failCount} failed`);

      return {
        total: activeStocks.length,
        successful: successCount,
        failed: failCount,
        results
      };

    } catch (error) {
      console.error('Error updating financial data for all stocks:', error);
      throw error;
    }
  }

  /**
   * Update statistics data for all active stocks (Monthly)
   */
  static async updateStatisticsDataForAll(): Promise<{ total: number; successful: number; failed: number; results: any[] }> {
    try {
      console.log('Starting statistics data update for all stocks...');
      
      // Get all active stocks
      const activeStocks = await db
        .select()
        .from(stocks)
        .where(eq(stocks.isActive, true));

      if (activeStocks.length === 0) {
        return {
          total: 0,
          successful: 0,
          failed: 0,
          results: []
        };
      }

      const results: { symbol: string; success: boolean; message: string }[] = [];
      let successCount = 0;
      let failCount = 0;

      // Process stocks in batches of 3 to avoid overwhelming the API
      for (let i = 0; i < activeStocks.length; i += 3) {
        const batch = activeStocks.slice(i, i + 3);
        
        const batchPromises = batch.map(async (stock) => {
          try {
            // Get comprehensive data including statistics
            const { quote, modules } = await YahooFinanceService.getComprehensiveStockData(stock.symbol);
            
            if (!modules || (!modules.defaultKeyStatistics && !modules.calendarEvents)) {
              throw new Error('No statistics data received');
            }

            // Update statistics data
            await this.upsertStatistics(stock.id, modules);
            
            successCount++;
            return {
              symbol: stock.symbol,
              success: true,
              message: 'Statistics data updated successfully'
            };
          } catch (error) {
            failCount++;
            console.error(`Failed to update statistics data for ${stock.symbol}:`, error);
            return {
              symbol: stock.symbol,
              success: false,
              message: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
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

        // Add delay between batches
        if (i + 3 < activeStocks.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`Statistics data update complete: ${successCount} successful, ${failCount} failed`);

      return {
        total: activeStocks.length,
        successful: successCount,
        failed: failCount,
        results
      };

    } catch (error) {
      console.error('Error updating statistics data for all stocks:', error);
      throw error;
    }
  }

  /**
   * Update analyst ratings for all active stocks (Monthly)
   */
  static async updateAnalystRatingsForAll(): Promise<{ total: number; successful: number; failed: number; results: any[] }> {
    try {
      console.log('Starting analyst ratings update for all stocks...');
      
      // Get all active stocks
      const activeStocks = await db
        .select()
        .from(stocks)
        .where(eq(stocks.isActive, true));

      if (activeStocks.length === 0) {
        return {
          total: 0,
          successful: 0,
          failed: 0,
          results: []
        };
      }

      const results: { symbol: string; success: boolean; message: string }[] = [];
      let successCount = 0;
      let failCount = 0;

      // Process stocks in batches of 3 to avoid overwhelming the API
      for (let i = 0; i < activeStocks.length; i += 3) {
        const batch = activeStocks.slice(i, i + 3);
        
        const batchPromises = batch.map(async (stock) => {
          try {
            // Get comprehensive data including analyst ratings
            const { quote, modules } = await YahooFinanceService.getComprehensiveStockData(stock.symbol);
            
            if (!modules?.financialData?.recommendationKey) {
              throw new Error('No analyst rating data received');
            }

            // Update analyst ratings
            await this.upsertAnalystRating(stock.id, modules.financialData);
            
            successCount++;
            return {
              symbol: stock.symbol,
              success: true,
              message: 'Analyst ratings updated successfully'
            };
          } catch (error) {
            failCount++;
            console.error(`Failed to update analyst ratings for ${stock.symbol}:`, error);
            return {
              symbol: stock.symbol,
              success: false,
              message: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
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

        // Add delay between batches
        if (i + 3 < activeStocks.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`Analyst ratings update complete: ${successCount} successful, ${failCount} failed`);

      return {
        total: activeStocks.length,
        successful: successCount,
        failed: failCount,
        results
      };

    } catch (error) {
      console.error('Error updating analyst ratings for all stocks:', error);
      throw error;
    }
  }
}
