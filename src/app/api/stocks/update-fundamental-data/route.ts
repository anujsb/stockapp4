import { NextRequest, NextResponse } from 'next/server';
import { StockDataService } from '@/lib/services/stockDataService';

// POST /api/stocks/update-fundamental-data
export async function POST() {
  try {
    // Update all fundamental data for active stocks
    const result = await StockDataService.updateFundamentalDataForAll();

    return NextResponse.json({
      success: true,
      message: 'Fundamental data updated successfully',
      result
    });
  } catch (error) {
    console.error('Error updating fundamental data:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error updating fundamental data',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
