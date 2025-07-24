import { NextRequest, NextResponse } from 'next/server';
import { StockDataService } from '@/lib/services/stockDataService';

// POST /api/stocks/update-statistics
export async function POST() {
  try {
    // Update all statistics data for active stocks
    const result = await StockDataService.updateStatisticsDataForAll();

    return NextResponse.json({
      success: true,
      message: 'Statistics data updated successfully',
      result
    });
  } catch (error) {
    console.error('Error updating statistics data:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error updating statistics data',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
