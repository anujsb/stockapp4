// src/types/stock.types.ts
// import { z } from 'zod'; // TODO: Install zod

// Base Stock Entity
export interface Stock {
  id: number;
  symbol: string;
  exchange: string;
  currency: string;
  name: string | null;
  sector: string | null;
  industry: string | null;
  isActive: boolean;
  lastRefreshedAt: Date | null;
  createdAt: Date;
}

// Real-time Price Data
export interface StockRealTimePrice {
  id: number;
  stockId: number;
  price: string | null;
  volume: bigint | null;
  signal: string | null;
  updatedAt: Date;
}

// Intraday Price Data
export interface StockIntraDayPrice {
  id: number;
  stockId: number;
  previousClose: string | null;
  open: string | null;
  dayHigh: string | null;
  dayLow: string | null;
  fiftyTwoWeekHigh: string | null;
  fiftyTwoWeekLow: string | null;
  fiftyDayMovingAverage: string | null;
  twoHundredDayMovingAverage: string | null;
  averageDailyVolume3Month: bigint | null;
  averageDailyVolume10Day: bigint | null;
  marketCap: bigint | null;
  updatedAt: Date;
}

// Fundamental Data
export interface StockFundamentalData {
  id: number;
  stockId: number;
  epsTTM: string | null;
  epsForward: string | null;
  bookValue: string | null;
  trailingPE: string | null;
  forwardPE: string | null;
  priceToBook: string | null;
  updatedAt: Date;
}

// Complete Stock Data Response
export interface CompleteStockData {
  stock: Stock;
  realTimePrice?: StockRealTimePrice[];
  intraDayPrice?: StockIntraDayPrice[];
  fundamentalData?: StockFundamentalData[];
  financialData?: any[];
  statistics?: any[];
  analystRating?: any[];
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface StockCreationResult extends ApiResponse {
  stockId?: number;
  data?: CompleteStockData;
}

// Validation Schemas (TODO: Add zod validation)
// export const AddToPortfolioSchema = z.object({
//   quantity: z.number().positive('Quantity must be positive'),
//   buyPrice: z.number().positive('Buy price must be positive'),
// });

// export const StockSymbolSchema = z.string()
//   .min(1, 'Symbol is required')
//   .max(10, 'Symbol too long')
//   .regex(/^[A-Z0-9.-]+$/, 'Invalid symbol format');

// export type AddToPortfolioRequest = z.infer<typeof AddToPortfolioSchema>;

// Temporary types without zod
export interface AddToPortfolioRequest {
  quantity: number;
  buyPrice: number;
}

// Market Data Update Types
export interface IntradayUpdateStatus {
  needsUpdate: boolean;
  oldestUpdate: string | null;
  currentTime: string;
}

export interface IntradayUpdateResult {
  updated: boolean;
  message: string;
  count?: number;
}

// Error Types
export class StockServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'StockServiceError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Market Hours Constants
export const MARKET_CONFIG = {
  TIMEZONE: 'Asia/Kolkata',
  TRADING_HOURS: {
    MORNING_UPDATE: { hour: 9, minute: 0 },
    EVENING_UPDATE: { hour: 15, minute: 45 },
  },
  TRADING_DAYS: [1, 2, 3, 4, 5] as const, // Monday to Friday
} as const;

// Type helper for trading days
export type TradingDay = typeof MARKET_CONFIG.TRADING_DAYS[number];

// Yahoo Finance Types (Enhanced)
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
