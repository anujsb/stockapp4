'use client';
import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRealTimeUpdates } from './useRealTimeUpdates';
import { useIntradayUpdates } from './useIntradayUpdates';

export interface UpdateManagerStatus {
  realTime: {
    isActive: boolean;
    lastUpdate: string | null;
    nextUpdate: string | null;
    stats: {
      total: number;
      successful: number;
      failed: number;
    } | null;
  };
  intraday: {
    needsUpdate: boolean;
    oldestUpdate: string | null;
    lastChecked: string | null;
  };
  isInitialized: boolean;
}

export const useUpdateManager = () => {
  const { user, isSignedIn } = useUser();
  const realTimeUpdates = useRealTimeUpdates();
  const intradayUpdates = useIntradayUpdates();
  
  const [status, setStatus] = useState<UpdateManagerStatus>({
    realTime: {
      isActive: false,
      lastUpdate: null,
      nextUpdate: null,
      stats: null
    },
    intraday: {
      needsUpdate: false,
      oldestUpdate: null,
      lastChecked: null
    },
    isInitialized: false
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for intraday updates on login
  const checkIntradayOnLogin = useCallback(async () => {
    if (!isSignedIn) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('User logged in, checking intraday update requirements...');
      
      // Check if intraday update is needed
      await intradayUpdates.checkUpdateStatus();
      
      // If update is needed, trigger it
      if (intradayUpdates.status?.needsUpdate) {
        console.log('Intraday update needed, triggering update...');
        await intradayUpdates.triggerUpdate();
      } else {
        console.log('Intraday data is up to date');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error checking intraday updates on login:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, intradayUpdates]);

  // Initialize updates when user signs in
  useEffect(() => {
    if (isSignedIn && user && !status.isInitialized) {
      console.log('Initializing update manager for user:', user.id);
      
      // Check intraday updates on login
      checkIntradayOnLogin();
      
      // Real-time updates are already auto-started by useRealTimeUpdates hook
      
      setStatus(prev => ({
        ...prev,
        isInitialized: true
      }));
    } else if (!isSignedIn && status.isInitialized) {
      // User signed out, stop all updates
      console.log('User signed out, stopping all updates');
      realTimeUpdates.stopRealTimeUpdates();
      
      setStatus(prev => ({
        ...prev,
        isInitialized: false
      }));
    }
  }, [isSignedIn, user, status.isInitialized, checkIntradayOnLogin, realTimeUpdates]);

  // Update status based on real-time hook
  useEffect(() => {
    setStatus(prev => ({
      ...prev,
      realTime: {
        isActive: realTimeUpdates.status.isActive,
        lastUpdate: realTimeUpdates.status.lastUpdate,
        nextUpdate: realTimeUpdates.status.nextUpdate,
        stats: realTimeUpdates.status.stats
      }
    }));
  }, [realTimeUpdates.status]);

  // Update status based on intraday hook
  useEffect(() => {
    if (intradayUpdates.status) {
      setStatus(prev => ({
        ...prev,
        intraday: {
          needsUpdate: intradayUpdates.status!.needsUpdate,
          oldestUpdate: intradayUpdates.status!.oldestUpdate,
          lastChecked: intradayUpdates.status!.currentTime
        }
      }));
    }
  }, [intradayUpdates.status]);

  // Manual controls
  const startRealTimeUpdates = useCallback(() => {
    if (isSignedIn) {
      realTimeUpdates.startRealTimeUpdates();
    } else {
      setError('Please sign in to start real-time updates');
    }
  }, [isSignedIn, realTimeUpdates]);

  const stopRealTimeUpdates = useCallback(() => {
    realTimeUpdates.stopRealTimeUpdates();
  }, [realTimeUpdates]);

  const triggerIntradayUpdate = useCallback(async () => {
    if (!isSignedIn) {
      setError('Please sign in to trigger intraday updates');
      return null;
    }
    
    return await intradayUpdates.triggerUpdate();
  }, [isSignedIn, intradayUpdates]);

  const checkIntradayStatus = useCallback(async () => {
    if (!isSignedIn) {
      setError('Please sign in to check intraday status');
      return;
    }
    
    await intradayUpdates.checkUpdateStatus();
  }, [isSignedIn, intradayUpdates]);

  return {
    status,
    isLoading: isLoading || realTimeUpdates.isLoading || intradayUpdates.isLoading,
    error: error || realTimeUpdates.error || intradayUpdates.error,
    isSignedIn,
    user,
    // Controls
    startRealTimeUpdates,
    stopRealTimeUpdates,
    triggerIntradayUpdate,
    checkIntradayStatus,
    // Force intraday check (useful for testing)
    checkIntradayOnLogin
  };
};
