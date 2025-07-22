// src/db/schema.ts
import { 
  pgTable, 
  serial, 
  varchar, 
  decimal, 
  bigint, 
  boolean, 
  timestamp, 
  integer,
  date
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Stock (Master Table)
export const stock = pgTable('stock', {
  id: serial('id').primaryKey(),
  symbol: varchar('symbol', { length: 20 }).notNull(),
  exchange: varchar('exchange', { length: 5 }).notNull(),
  name: varchar('name', { length: 255 }),
  sector: varchar('sector', { length: 50 }),
  industry: varchar('industry', { length: 50 }),
  isActive: boolean('is_active').default(true).notNull(),
  lastRefreshedAt: timestamp('last_refreshed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. StockRealTimePrice
export const stockRealTimePrice = pgTable('stock_real_time_price', {
  id: serial('id').primaryKey(),
  stockId: integer('stock_id').notNull().references(() => stock.id),
  price: decimal('price', { precision: 18, scale: 4 }),
  volume: bigint('volume', { mode: 'number' }),
  signal: varchar('signal', { length: 20 }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. StockIntraDayPrice
export const stockIntraDayPrice = pgTable('stock_intra_day_price', {
  id: serial('id').primaryKey(),
  stockId: integer('stock_id').notNull().references(() => stock.id),
  previousClose: decimal('previous_close', { precision: 18, scale: 4 }),
  open: decimal('open', { precision: 18, scale: 4 }),
  dayHigh: decimal('day_high', { precision: 18, scale: 4 }),
  dayLow: decimal('day_low', { precision: 18, scale: 4 }),
  fiftyTwoWeekHigh: decimal('fifty_two_week_high', { precision: 18, scale: 4 }),
  fiftyTwoWeekLow: decimal('fifty_two_week_low', { precision: 18, scale: 4 }),
  fiftyDayMovingAverage: decimal('fifty_day_moving_average', { precision: 18, scale: 4 }),
  twoHundredDayMovingAverage: decimal('two_hundred_day_moving_average', { precision: 18, scale: 4 }),
  averageDailyVolume3Month: bigint('average_daily_volume_3_month', { mode: 'number' }),
  averageDailyVolume10Day: bigint('average_daily_volume_10_day', { mode: 'number' }),
  marketCap: bigint('market_cap', { mode: 'number' }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 4. StockFundamentalData
export const stockFundamentalData = pgTable('stock_fundamental_data', {
  id: serial('id').primaryKey(),
  stockId: integer('stock_id').notNull().references(() => stock.id),
  epsTTM: decimal('eps_ttm', { precision: 18, scale: 4 }),
  epsForward: decimal('eps_forward', { precision: 18, scale: 4 }),
  bookValue: decimal('book_value', { precision: 18, scale: 4 }),
  trailingPE: decimal('trailing_pe', { precision: 18, scale: 4 }),
  forwardPE: decimal('forward_pe', { precision: 18, scale: 4 }),
  priceToBook: decimal('price_to_book', { precision: 18, scale: 4 }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 5. StockFinancialData
export const stockFinancialData = pgTable('stock_financial_data', {
  id: serial('id').primaryKey(),
  stockId: integer('stock_id').notNull().references(() => stock.id),
  totalRevenue: bigint('total_revenue', { mode: 'number' }),
  totalCash: bigint('total_cash', { mode: 'number' }),
  totalDebt: bigint('total_debt', { mode: 'number' }),
  debtToEquity: decimal('debt_to_equity', { precision: 18, scale: 4 }),
  currentRatio: decimal('current_ratio', { precision: 18, scale: 4 }),
  quickRatio: decimal('quick_ratio', { precision: 18, scale: 4 }),
  profitMargin: decimal('profit_margin', { precision: 18, scale: 6 }),
  grossMargin: decimal('gross_margin', { precision: 18, scale: 6 }),
  operatingMargin: decimal('operating_margin', { precision: 18, scale: 6 }),
  ebitdaMargin: decimal('ebitda_margin', { precision: 18, scale: 6 }),
  returnOnAssets: decimal('return_on_assets', { precision: 18, scale: 6 }),
  returnOnEquity: decimal('return_on_equity', { precision: 18, scale: 6 }),
  revenueGrowth: decimal('revenue_growth', { precision: 18, scale: 6 }),
  earningsGrowth: decimal('earnings_growth', { precision: 18, scale: 6 }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 6. StockStatistics
export const stockStatistics = pgTable('stock_statistics', {
  id: serial('id').primaryKey(),
  stockId: integer('stock_id').notNull().references(() => stock.id),
  sharesHeldByInstitutions: varchar('shares_held_by_institutions', { length: 5 }),
  sharesHeldByAllInsider: varchar('shares_held_by_all_insider', { length: 5 }),
  lastSplitFactor: varchar('last_split_factor', { length: 5 }),
  lastSplitDate: date('last_split_date'),
  lastDividendValue: decimal('last_dividend_value', { precision: 4, scale: 2 }),
  lastDividendDate: date('last_dividend_date'),
  earningsDate: date('earnings_date'),
  earningsCallDate: date('earnings_call_date'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 7. AnalystRating
export const analystRating = pgTable('analyst_rating', {
  id: serial('id').primaryKey(),
  stockId: integer('stock_id').notNull().references(() => stock.id),
  recommendation: varchar('recommendation', { length: 20 }),
  numberOfAnalysts: integer('number_of_analysts'),
  targetPriceHigh: decimal('target_price_high', { precision: 18, scale: 4 }),
  targetLowPrice: decimal('target_low_price', { precision: 18, scale: 4 }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 8. User
export const user = pgTable('user', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 100 }).notNull(),
  email: varchar('email', { length: 100 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastLogin: timestamp('last_login'),
});

// 9. UserStocks
export const userStocks = pgTable('user_stocks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => user.id),
  stockId: integer('stock_id').notNull().references(() => stock.id),
  quantity: integer('quantity').notNull(),
  buyPrice: decimal('buy_price', { precision: 18, scale: 4 }).notNull(),
  addedAt: timestamp('added_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const stockRelations = relations(stock, ({ many }) => ({
  realTimePrices: many(stockRealTimePrice),
  intraDayPrices: many(stockIntraDayPrice),
  fundamentalData: many(stockFundamentalData),
  financialData: many(stockFinancialData),
  statistics: many(stockStatistics),
  analystRatings: many(analystRating),
  userStocks: many(userStocks),
}));

export const stockRealTimePriceRelations = relations(stockRealTimePrice, ({ one }) => ({
  stock: one(stock, {
    fields: [stockRealTimePrice.stockId],
    references: [stock.id],
  }),
}));

export const stockIntraDayPriceRelations = relations(stockIntraDayPrice, ({ one }) => ({
  stock: one(stock, {
    fields: [stockIntraDayPrice.stockId],
    references: [stock.id],
  }),
}));

export const stockFundamentalDataRelations = relations(stockFundamentalData, ({ one }) => ({
  stock: one(stock, {
    fields: [stockFundamentalData.stockId],
    references: [stock.id],
  }),
}));

export const stockFinancialDataRelations = relations(stockFinancialData, ({ one }) => ({
  stock: one(stock, {
    fields: [stockFinancialData.stockId],
    references: [stock.id],
  }),
}));

export const stockStatisticsRelations = relations(stockStatistics, ({ one }) => ({
  stock: one(stock, {
    fields: [stockStatistics.stockId],
    references: [stock.id],
  }),
}));

export const analystRatingRelations = relations(analystRating, ({ one }) => ({
  stock: one(stock, {
    fields: [analystRating.stockId],
    references: [stock.id],
  }),
}));

export const userRelations = relations(user, ({ many }) => ({
  userStocks: many(userStocks),
}));

export const userStocksRelations = relations(userStocks, ({ one }) => ({
  user: one(user, {
    fields: [userStocks.userId],
    references: [user.id],
  }),
  stock: one(stock, {
    fields: [userStocks.stockId],
    references: [stock.id],
  }),
}));