import { NextRequest, NextResponse } from 'next/server';
import { StockDataService } from '@/lib/services/stockDataService';

// POST /api/stocks/update-analyst-ratings
export async function POST() {
  try {
    // Update all analyst ratings for active stocks
    const result = await StockDataService.updateAnalystRatingsForAll();

    return NextResponse.json({
      success: true,
      message: 'Analyst ratings updated successfully',
      result
    });
  } catch (error) {
    console.error('Error updating analyst ratings:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error updating analyst ratings',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
