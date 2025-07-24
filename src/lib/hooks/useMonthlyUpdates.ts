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

  // Update fundamental data
  const updateFundamentalData = useCallback(async (): Promise<MonthlyUpdateResult | null> => {
    setStatus(prev => ({
      ...prev,
      fundamentalData: {
        ...prev.fundamentalData,
        isLoading: true,
        error: null
      }
    }));

    try {
      const response = await fetch('/api/stocks/update-fundamental-data', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to update fundamental data');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Update failed');
      }

      const result = data.result;
      
      setStatus(prev => ({
        ...prev,
        fundamentalData: {
          isLoading: false,
          lastResult: result,
          error: null
        }
      }));

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setStatus(prev => ({
        ...prev,
        fundamentalData: {
          ...prev.fundamentalData,
          isLoading: false,
          error: errorMessage
        }
      }));
      return null;
    }
  }, []);

  // Update financial data
  const updateFinancialData = useCallback(async (): Promise<MonthlyUpdateResult | null> => {
    setStatus(prev => ({
      ...prev,
      financialData: {
        ...prev.financialData,
        isLoading: true,
        error: null
      }
    }));

    try {
      const response = await fetch('/api/stocks/update-financial-data', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to update financial data');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Update failed');
      }

      const result = data.result;
      
      setStatus(prev => ({
        ...prev,
        financialData: {
          isLoading: false,
          lastResult: result,
          error: null
        }
      }));

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setStatus(prev => ({
        ...prev,
        financialData: {
          ...prev.financialData,
          isLoading: false,
          error: errorMessage
        }
      }));
      return null;
    }
  }, []);

  // Update statistics data
  const updateStatistics = useCallback(async (): Promise<MonthlyUpdateResult | null> => {
    setStatus(prev => ({
      ...prev,
      statistics: {
        ...prev.statistics,
        isLoading: true,
        error: null
      }
    }));

    try {
      const response = await fetch('/api/stocks/update-statistics', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to update statistics data');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Update failed');
      }

      const result = data.result;
      
      setStatus(prev => ({
        ...prev,
        statistics: {
          isLoading: false,
          lastResult: result,
          error: null
        }
      }));

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setStatus(prev => ({
        ...prev,
        statistics: {
          ...prev.statistics,
          isLoading: false,
          error: errorMessage
        }
      }));
      return null;
    }
  }, []);

  // Update analyst ratings
  const updateAnalystRatings = useCallback(async (): Promise<MonthlyUpdateResult | null> => {
    setStatus(prev => ({
      ...prev,
      analystRatings: {
        ...prev.analystRatings,
        isLoading: true,
        error: null
      }
    }));

    try {
      const response = await fetch('/api/stocks/update-analyst-ratings', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to update analyst ratings');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Update failed');
      }

      const result = data.result;
      
      setStatus(prev => ({
        ...prev,
        analystRatings: {
          isLoading: false,
          lastResult: result,
          error: null
        }
      }));

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setStatus(prev => ({
        ...prev,
        analystRatings: {
          ...prev.analystRatings,
          isLoading: false,
          error: errorMessage
        }
      }));
      return null;
    }
  }, []);

  // Update all monthly data
  const updateAllMonthlyData = useCallback(async (): Promise<{
    fundamentalData: MonthlyUpdateResult | null;
    financialData: MonthlyUpdateResult | null;
    statistics: MonthlyUpdateResult | null;
    analystRatings: MonthlyUpdateResult | null;
  }> => {
    console.log('Starting all monthly data updates...');
    
    const results = await Promise.allSettled([
      updateFundamentalData(),
      updateFinancialData(),
      updateStatistics(),
      updateAnalystRatings()
    ]);

    return {
      fundamentalData: results[0].status === 'fulfilled' ? results[0].value : null,
      financialData: results[1].status === 'fulfilled' ? results[1].value : null,
      statistics: results[2].status === 'fulfilled' ? results[2].value : null,
      analystRatings: results[3].status === 'fulfilled' ? results[3].value : null,
    };
  }, [updateFundamentalData, updateFinancialData, updateStatistics, updateAnalystRatings]);

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
    updateFundamentalData,
    updateFinancialData,
    updateStatistics,
    updateAnalystRatings,
    updateAllMonthlyData,
  };
};
