import { NextRequest, NextResponse } from 'next/server';
import { YahooFinanceService } from '@/lib/services/yahooFinanceService';
import { db } from '@/lib/db';
import { stocks } from '@/lib/db/schema';
import { like, or } from 'drizzle-orm';

export interface StockSearchResult {
  symbol: string;
  name: string;
  type?: string;
  region?: string;
  marketOpen?: string;
  marketClose?: string;
  timezone?: string;
  currency?: string;
  exchange?: string;
  sector?: string;
  industry?: string;
  source: 'database' | 'yahoo';
}

// Handle stock search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query parameter is missing' }, { status: 400 });
    }

    const searchTerm = query.trim();
    
    // Search in the database first (by symbol or name)
    const dbResults = await db
      .select()
      .from(stocks)
      .where(
        like(stocks.name, `%${searchTerm}%`)
      )
      .limit(10);

    // Also search by symbol
    const symbolResults = await db
      .select()
      .from(stocks)
      .where(
        like(stocks.symbol, `%${searchTerm.toUpperCase()}%`)
      )
      .limit(5);

    // Combine and format database results
    const combinedDbResults = [...dbResults, ...symbolResults]
      .filter((stock, index, self) => 
        index === self.findIndex(s => s.id === stock.id)
      )
      .slice(0, 10)
      .map(stock => ({
        symbol: stock.symbol,
        name: stock.name || stock.symbol,
        type: 'Equity',
        region: stock.exchange === 'NSE' || stock.exchange === 'BSE' ? 'India' : 'Unknown',
        marketOpen: stock.exchange === 'NSE' || stock.exchange === 'BSE' ? '09:15' : '09:30',
        marketClose: stock.exchange === 'NSE' || stock.exchange === 'BSE' ? '15:30' : '16:00',
        timezone: stock.exchange === 'NSE' || stock.exchange === 'BSE' ? 'Asia/Kolkata' : 'US/Eastern',
        currency: stock.currency || 'INR',
        exchange: stock.exchange,
        sector: stock.sector,
        industry: stock.industry,
        source: 'database' as const
      }));

    // If we have good database results, return them
    if (combinedDbResults.length > 0) {
      return NextResponse.json(combinedDbResults);
    }

    // If not found in DB, search Yahoo Finance
    try {
      const yahooResults = await YahooFinanceService.searchStocks(searchTerm);
      
      // Format Yahoo results to match our interface
      const formattedYahooResults = yahooResults.slice(0, 10).map(result => ({
        symbol: result.symbol,
        name: result.shortname || result.longname || result.symbol,
        type: result.quoteType || 'Equity',
        region: result.region || 'Unknown',
        marketOpen: '09:30',
        marketClose: '16:00', 
        timezone: 'US/Eastern',
        currency: result.currency || 'USD',
        exchange: result.exchange,
        sector: result.sector,
        industry: result.industry,
        source: 'yahoo' as const
      }));

      return NextResponse.json(formattedYahooResults);
    } catch (yahooError) {
      console.error('Yahoo Finance search failed:', yahooError);
      
      // Return empty array if both database and Yahoo searches fail
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('Error during stock search:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
