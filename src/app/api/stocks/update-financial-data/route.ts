import { NextRequest, NextResponse } from 'next/server';
import { StockDataService } from '@/lib/services/stockDataService';

// POST /api/stocks/update-financial-data
export async function POST() {
  try {
    // Update all financial data for active stocks
    const result = await StockDataService.updateFinancialDataForAll();

    return NextResponse.json({
      success: true,
      message: 'Financial data updated successfully',
      result
    });
  } catch (error) {
    console.error('Error updating financial data:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error updating financial data',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
