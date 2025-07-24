// src/lib/services/yahooFinanceService.ts
import yahooFinance from 'yahoo-finance2';

// Suppress the survey notice
yahooFinance.suppressNotices(['yahooSurvey']);

export interface YahooQuoteData {
  symbol: string;
  longName?: string;
  fullExchangeName?: string;
  regularMarketPrice?: number;
  regularMarketVolume?: number;
  regularMarketPreviousClose?: number;
  regularMarketOpen?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;
  averageDailyVolume3Month?: number;
  averageDailyVolume10Day?: number;
  marketCap?: number;
  epsTrailingTwelveMonths?: number;
  epsForward?: number;
  bookValue?: number;
  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
}

export interface YahooModulesData {
  summaryProfile?: {
    sector?: string;
    industry?: string;
  };
  financialData?: {
    totalRevenue?: number;
    totalCash?: number;
    totalDebt?: number;
    debtToEquity?: number;
    currentRatio?: number;
    quickRatio?: number;
    profitMargins?: number;
    grossMargins?: number;
    operatingMargins?: number;
    ebitdaMargins?: number;
    returnOnAssets?: number;
    returnOnEquity?: number;
    revenueGrowth?: number;
    earningsGrowth?: number;
    recommendationKey?: string;
    numberOfAnalystOpinions?: number;
    targetHighPrice?: number;
    targetLowPrice?: number;
  };
  defaultKeyStatistics?: {
    heldPercentInstitutions?: number;
    heldPercentInsiders?: number;
    lastSplitFactor?: string;
    lastSplitDate?: number;
    lastDividendValue?: number;
    lastDividendDate?: number;
  };
  calendarEvents?: {
    earnings?: {
      earningsDate?: number[];
      earningsCallDate?: number[];
    };
  };
}

export class YahooFinanceService {
  /**
   * Get quote data for a stock symbol
   */
  static async getQuote(symbol: string): Promise<YahooQuoteData | null> {
    try {
      const quote = await yahooFinance.quote(symbol);
      return quote as YahooQuoteData;
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get detailed modules data for a stock symbol
   */
  static async getModulesData(symbol: string): Promise<YahooModulesData | null> {
    try {
      const modules = await yahooFinance.quoteSummary(symbol, {
        modules: [
          'summaryProfile',
          'financialData',
          'defaultKeyStatistics',
          'calendarEvents'
        ]
      });
      return modules as YahooModulesData;
    } catch (error) {
      console.error(`Error fetching modules data for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Search stocks by keywords using yahoo-finance2
   */
  static async searchStocks(keywords: string): Promise<any[]> {
    try {
      const searchData = await yahooFinance.search(keywords);
      return searchData.quotes || [];
    } catch (error) {
      console.error(`Error searching stocks with keywords ${keywords}:`, error);
      return [];
    }
  }

  /**
   * Get comprehensive stock data (quote + modules)
   */
  static async getComprehensiveStockData(symbol: string): Promise<{
    quote: YahooQuoteData | null;
    modules: YahooModulesData | null;
  }> {
    try {
      const [quote, modules] = await Promise.all([
        this.getQuote(symbol),
        this.getModulesData(symbol)
      ]);

      return { quote, modules };
    } catch (error) {
      console.error(`Error fetching comprehensive data for ${symbol}:`, error);
      return { quote: null, modules: null };
    }
  }

  /**
   * Validate if a symbol exists and is tradeable
   */
  static async validateSymbol(symbol: string): Promise<boolean> {
    try {
      const quote = await this.getQuote(symbol);
      return quote !== null && quote.regularMarketPrice !== undefined;
    } catch (error) {
      console.error(`Error validating symbol ${symbol}:`, error);
      return false;
    }
  }
}