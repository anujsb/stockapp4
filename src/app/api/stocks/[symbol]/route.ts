import { NextRequest, NextResponse } from 'next/server';
import { StockDataService } from '@/lib/services/stockDataService';
import { UserService } from '@/lib/services/userService';
import { auth } from '@clerk/nextjs/server';
import { normalizeStockSymbol, isValidStockSymbol } from '@/lib/utils/stockUtils';

// Helper to convert BigInt and Date to string recursively
function convertBigIntToString(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToString);
  } else if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => {
        if (typeof v === 'bigint') return [k, v.toString()];
        if (v instanceof Date) return [k, v.toISOString()];
        return [k, convertBigIntToString(v)];
      })
    );
  }
  return obj;
}

// POST /api/stocks/[symbol] - Add stock to user portfolio
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Await params before accessing properties
    const { symbol: rawSymbol } = await params;
    
    const symbol = normalizeStockSymbol(rawSymbol);
    // Validate symbol format for Indian stocks
    if (!isValidStockSymbol(symbol)) {
      return NextResponse.json(
        { error: 'Invalid Indian stock symbol format (must be e.g. RELIANCE.NS or SBIN.BO)' },
        { status: 400 }
      );
    }
    const body = await request.json();
    const { quantity, buyPrice } = body;

    // Validate input
    if (!quantity || quantity <= 0 || !buyPrice || buyPrice <= 0) {
      return NextResponse.json(
        { error: 'Invalid quantity or buy price' },
        { status: 400 }
      );
    }

    // Get or create user in our database
    const user = await UserService.getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if stock exists, if not fetch it
    let existingStock = await StockDataService.getStockBySymbol(symbol);
    let stockId: number;

    if (existingStock.length === 0) {
      // Fetch and create stock data first
      const stockResult = await StockDataService.createOrUpdateStockData(symbol);
      if (!stockResult.success || !stockResult.stockId) {
        return NextResponse.json(
          { error: 'Failed to fetch stock data' },
          { status: 400 }
        );
      }
      stockId = stockResult.stockId;
    } else {
      stockId = existingStock[0].id;
    }

    // Add to user's portfolio
    const portfolioResult = await UserService.addStockToPortfolio(
      user.id,
      stockId,
      parseInt(quantity),
      parseFloat(buyPrice)
    );

    return NextResponse.json(convertBigIntToString({
      success: true,
      message: 'Stock added to portfolio successfully',
      data: portfolioResult
    }));

  } catch (error) {
    console.error('Error in POST /api/stocks/[symbol]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/stocks/[symbol] - Fetch and store stock data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Await params before accessing properties
    const { symbol: rawSymbol } = await params;

    const symbol = normalizeStockSymbol(rawSymbol);

    // Validate symbol format for Indian stocks
    if (!isValidStockSymbol(symbol)) {
      return NextResponse.json(
        { error: 'Invalid Indian stock symbol format (must be e.g. RELIANCE.NS or SBIN.BO)' },
        { status: 400 }
      );
    }

    // Fetch and store stock data
    const result = await StockDataService.createOrUpdateStockData(symbol);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json(convertBigIntToString({
      success: true,
      message: result.message,
      stockId: result.stockId,
      data: result.data
    }));

  } catch (error) {
    console.error('Error in GET /api/stocks/[symbol]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}