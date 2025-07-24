import { NextRequest, NextResponse } from 'next/server';
import { StockDataService } from '@/lib/services/stockDataService';

// POST /api/stocks/update-monthly-data
export async function POST() {
  try {
    console.log('Starting consolidated monthly data update...');
    
    // Initialize results tracking
    const results = {
      fundamentalData: null as any,
      financialData: null as any,
      statistics: null as any,
      analystRatings: null as any,
      overall: {
        total: 0,
        successful: 0,
        failed: 0,
        errors: [] as string[]
      }
    };

    // Update fundamental data
    try {
      console.log('Updating fundamental data...');
      results.fundamentalData = await StockDataService.updateFundamentalDataForAll();
      results.overall.total += results.fundamentalData.total;
      results.overall.successful += results.fundamentalData.successful;
      results.overall.failed += results.fundamentalData.failed;
    } catch (error) {
      const errorMsg = `Fundamental data update failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      results.overall.errors.push(errorMsg);
    }

    // Add delay between updates to avoid API rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update financial data
    try {
      console.log('Updating financial data...');
      results.financialData = await StockDataService.updateFinancialDataForAll();
      results.overall.total += results.financialData.total;
      results.overall.successful += results.financialData.successful;
      results.overall.failed += results.financialData.failed;
    } catch (error) {
      const errorMsg = `Financial data update failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      results.overall.errors.push(errorMsg);
    }

    // Add delay between updates
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update statistics data
    try {
      console.log('Updating statistics data...');
      results.statistics = await StockDataService.updateStatisticsDataForAll();
      results.overall.total += results.statistics.total;
      results.overall.successful += results.statistics.successful;
      results.overall.failed += results.statistics.failed;
    } catch (error) {
      const errorMsg = `Statistics data update failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      results.overall.errors.push(errorMsg);
    }

    // Add delay between updates
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update analyst ratings
    try {
      console.log('Updating analyst ratings...');
      results.analystRatings = await StockDataService.updateAnalystRatingsForAll();
      results.overall.total += results.analystRatings.total;
      results.overall.successful += results.analystRatings.successful;
      results.overall.failed += results.analystRatings.failed;
    } catch (error) {
      const errorMsg = `Analyst ratings update failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      results.overall.errors.push(errorMsg);
    }

    // Calculate success rate
    const successRate = results.overall.total > 0 
      ? ((results.overall.successful / results.overall.total) * 100).toFixed(1) 
      : '0';

    console.log(`Monthly data update completed: ${results.overall.successful}/${results.overall.total} successful (${successRate}%)`);

    return NextResponse.json({
      success: true,
      message: `Monthly data update completed: ${results.overall.successful}/${results.overall.total} stocks updated successfully (${successRate}% success rate)`,
      results,
      summary: {
        totalStocks: results.overall.total / 4, // Divided by 4 since each stock is counted 4 times
        totalUpdates: results.overall.total,
        successfulUpdates: results.overall.successful,
        failedUpdates: results.overall.failed,
        successRate: `${successRate}%`,
        updateTypes: {
          fundamentalData: results.fundamentalData ? 
            `${results.fundamentalData.successful}/${results.fundamentalData.total}` : 'failed',
          financialData: results.financialData ? 
            `${results.financialData.successful}/${results.financialData.total}` : 'failed',
          statistics: results.statistics ? 
            `${results.statistics.successful}/${results.statistics.total}` : 'failed',
          analystRatings: results.analystRatings ? 
            `${results.analystRatings.successful}/${results.analystRatings.total}` : 'failed'
        },
        errors: results.overall.errors
      }
    });

  } catch (error) {
    console.error('Error in monthly data update:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error updating monthly data',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
