// src/lib/hooks/useIntradayUpdates.ts
'use client';
import { useState, useEffect, useCallback } from 'react';

export interface IntradayUpdateStatus {
  needsUpdate: boolean;
  oldestUpdate: string | null;
  currentTime: string;
}

export interface IntradayUpdateResult {
  updated: boolean;
  message: string;
  count?: number;
}

export const useIntradayUpdates = () => {
  const [status, setStatus] = useState<IntradayUpdateStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if update is needed
  const checkUpdateStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/stocks/update-intraday', {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error('Failed to check update status');
      }
      
      const data = await response.json();
      setStatus(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error checking intraday update status:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Trigger intraday data update
  const triggerUpdate = useCallback(async (): Promise<IntradayUpdateResult | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/stocks/update-intraday', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to update intraday data');
      }
      
      const data = await response.json();
      
      // Refresh status after update
      await checkUpdateStatus();
      
      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error updating intraday data:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [checkUpdateStatus]);

  // Auto-check status on mount
  useEffect(() => {
    checkUpdateStatus();
  }, [checkUpdateStatus]);

  // Auto-refresh status every 30 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      checkUpdateStatus();
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [checkUpdateStatus]);

  return {
    status,
    isLoading,
    error,
    checkUpdateStatus,
    triggerUpdate,
  };
};
