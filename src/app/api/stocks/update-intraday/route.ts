// src/app/api/stocks/update-intraday/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { StockDataService } from '@/lib/services/stockDataService';

export async function POST() {
  try {
    // Optional: Check if user is authenticated (comment out if you want public access)
    // const { userId } = await auth();
    // if (!userId) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Trigger intraday data update
    const updateResult = await StockDataService.updateAllIntradayDataIfNeeded();

    return NextResponse.json({
      success: true,
      data: updateResult
    });

  } catch (error) {
    console.error('Error updating intraday data:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for checking if update is needed without triggering it
export async function GET() {
  try {
    // Optional: Check if user is authenticated (comment out if you want public access)
    // const { userId } = await auth();
    // if (!userId) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Get the oldest update time to check if update is needed
    const oldestUpdate = await StockDataService.getOldestIntradayUpdateTime();
    const needsUpdate = oldestUpdate ? StockDataService.isIntradayUpdateNeeded(oldestUpdate) : true;

    return NextResponse.json({
      success: true,
      data: {
        needsUpdate,
        oldestUpdate,
        currentTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error checking intraday data status:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
