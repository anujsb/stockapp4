'use client';
import { useState, useCallback } from 'react';

export interface MonthlyUpdateResult {
  total: number;
  successful: number;
  failed: number;
  results: {
    symbol: string;
    success: boolean;
    message: string;
  }[];
}

export interface MonthlyUpdateStatus {
  fundamentalData: {
    isLoading: boolean;
    lastResult: MonthlyUpdateResult | null;
    error: string | null;
  };
  financialData: {
    isLoading: boolean;
    lastResult: MonthlyUpdateResult | null;
    error: string | null;
  };
  statistics: {
    isLoading: boolean;
    lastResult: MonthlyUpdateResult | null;
    error: string | null;
  };
  analystRatings: {
    isLoading: boolean;
    lastResult: MonthlyUpdateResult | null;
    error: string | null;
  };
}

export const useMonthlyUpdates = () => {
  const [status, setStatus] = useState<MonthlyUpdateStatus>({
    fundamentalData: {
      isLoading: false,
      lastResult: null,
      error: null
    },
    financialData: {
      isLoading: false,
      lastResult: null,
      error: null
    },
    statistics: {
      isLoading: false,
      lastResult: null,
      error: null
    },
    analystRatings: {
      isLoading: false,
      lastResult: null,
      error: null
    }
  });


  // Update all monthly data using consolidated endpoint
  const updateAllMonthlyDataConsolidated = useCallback(async (): Promise<any> => {
    console.log('Starting consolidated monthly data update...');
    
    // Set all updates to loading state
    setStatus(prev => ({
      fundamentalData: { ...prev.fundamentalData, isLoading: true, error: null },
      financialData: { ...prev.financialData, isLoading: true, error: null },
      statistics: { ...prev.statistics, isLoading: true, error: null },
      analystRatings: { ...prev.analystRatings, isLoading: true, error: null }
    }));

    try {
      const response = await fetch('/api/stocks/update-monthly-data', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to update monthly data');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Update failed');
      }

      const results = data.results;
      
      // Update all states with results
      setStatus(prev => ({
        fundamentalData: {
          isLoading: false,
          lastResult: results.fundamentalData,
          error: null
        },
        financialData: {
          isLoading: false,
          lastResult: results.financialData,
          error: null
        },
        statistics: {
          isLoading: false,
          lastResult: results.statistics,
          error: null
        },
        analystRatings: {
          isLoading: false,
          lastResult: results.analystRatings,
          error: null
        }
      }));

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      // Set all states to error
      setStatus(prev => ({
        fundamentalData: { ...prev.fundamentalData, isLoading: false, error: errorMessage },
        financialData: { ...prev.financialData, isLoading: false, error: errorMessage },
        statistics: { ...prev.statistics, isLoading: false, error: errorMessage },
        analystRatings: { ...prev.analystRatings, isLoading: false, error: errorMessage }
      }));
      
      return null;
    }
  }, []);


  // Get overall loading state
  const isAnyLoading = 
    status.fundamentalData.isLoading ||
    status.financialData.isLoading ||
    status.statistics.isLoading ||
    status.analystRatings.isLoading;

  // Get overall error state
  const hasAnyError = 
    status.fundamentalData.error ||
    status.financialData.error ||
    status.statistics.error ||
    status.analystRatings.error;

  return {
    status,
    isAnyLoading,
    hasAnyError,
    updateAllMonthlyData: updateAllMonthlyDataConsolidated,
    updateAllMonthlyDataConsolidated,
  };
};
