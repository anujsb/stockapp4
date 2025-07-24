'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

export interface RealTimeUpdateStatus {
  isActive: boolean;
  lastUpdate: string | null;
  nextUpdate: string | null;
  stats: {
    total: number;
    successful: number;
    failed: number;
  } | null;
}

export const useRealTimeUpdates = () => {
  const [status, setStatus] = useState<RealTimeUpdateStatus>({
    isActive: false,
    lastUpdate: null,
    nextUpdate: null,
    stats: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isUserActiveRef = useRef<boolean>(true);

  // Track user activity (mouse movement, keyboard input, etc.)
  const trackUserActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    isUserActiveRef.current = true;
  }, []);

  // Update real-time prices
  const updateRealTimePrices = useCallback(async () => {
    // Check if user has been inactive for more than 5 minutes
    const inactiveTime = Date.now() - lastActivityRef.current;
    const maxInactiveTime = 5 * 60 * 1000; // 5 minutes

    if (inactiveTime > maxInactiveTime) {
      console.log('User inactive, skipping real-time update');
      isUserActiveRef.current = false;
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stocks/update-realtime', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to update real-time prices');
      }

      const data = await response.json();
      
      const now = new Date().toISOString();
      const nextUpdate = new Date(Date.now() + 60000).toISOString(); // Next update in 1 minute

      setStatus(prev => ({
        ...prev,
        lastUpdate: now,
        nextUpdate,
        stats: data.stats || null
      }));

      console.log('Real-time prices updated successfully:', data.stats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error updating real-time prices:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check if real-time update is needed based on IST market hours.
  // Updates should happen between 9:00 AM and 3:45 PM IST.
  const isRealTimeUpdateNeeded = useCallback(() => {
    const now = new Date();

    // Convert to IST
    const nowIST = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

    // Check if today is a trading day (Monday = 1, Friday = 5, Saturday = 6, Sunday = 0)
    const dayOfWeek = nowIST.getDay();
    const isTradingDay = dayOfWeek >= 1 && dayOfWeek <= 5;

    if (!isTradingDay) {
      console.log('Not a trading day, skipping continuous updates');
      return false;
    }

    // Get today's date in IST
    const today = nowIST.toISOString().split('T')[0];

    // Create market times for today in IST
    const marketOpen = new Date(`${today}T09:00:00.000+05:30`);
    const marketClose = new Date(`${today}T15:45:00.000+05:30`);

    const isWithinHours = nowIST >= marketOpen && nowIST <= marketClose;
    
    console.log(`Market hours check: ${nowIST.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}, Trading day: ${isTradingDay}, Within hours: ${isWithinHours}`);
    
    // Check if within market hours
    return isWithinHours;
  }, []);

  // Stop real-time updates
  const stopRealTimeUpdates = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setStatus(prev => ({
      ...prev,
      isActive: false,
      nextUpdate: null
    }));

    console.log('Real-time updates stopped');
  }, []);

  // Start real-time updates
  const startRealTimeUpdates = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (isRealTimeUpdateNeeded()) {
      // Immediate update
      updateRealTimePrices();

      // Set up interval for every minute (60000ms)
      intervalRef.current = setInterval(() => {
        if (isUserActiveRef.current) {
          // Check if still within market hours before updating
          if (isRealTimeUpdateNeeded()) {
            updateRealTimePrices();
          } else {
            console.log('Market closed, stopping real-time updates');
            stopRealTimeUpdates();
          }
        }
      }, 60000);

      console.log('Real-time updates started during market hours');
    } else {
      // Market closed - single update only
      updateRealTimePrices();
      console.log('Single real-time update outside market hours');
    }

    setStatus(prev => ({
      ...prev,
      isActive: isRealTimeUpdateNeeded(),
      nextUpdate: isRealTimeUpdateNeeded() ? new Date(Date.now() + 60000).toISOString() : null
    }));
  }, [updateRealTimePrices, isRealTimeUpdateNeeded, stopRealTimeUpdates]);

  // Set up activity listeners and auto-start on mount
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, trackUserActivity, { passive: true });
    });

    // Auto-start real-time updates when component mounts
    startRealTimeUpdates();

    return () => {
      // Clean up event listeners
      events.forEach(event => {
        document.removeEventListener(event, trackUserActivity);
      });

      // Clean up interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [trackUserActivity, startRealTimeUpdates]);

  // Check if user becomes inactive and stop updates after prolonged inactivity
  useEffect(() => {
    const inactivityChecker = setInterval(() => {
      const inactiveTime = Date.now() - lastActivityRef.current;
      const maxInactiveTime = 10 * 60 * 1000; // 10 minutes - longer threshold for stopping

      if (inactiveTime > maxInactiveTime && status.isActive) {
        console.log('User inactive for too long, stopping real-time updates');
        stopRealTimeUpdates();
      }
    }, 60000); // Check every minute

    return () => clearInterval(inactivityChecker);
  }, [status.isActive, stopRealTimeUpdates]);

  return {
    status,
    isLoading,
    error,
    startRealTimeUpdates,
    stopRealTimeUpdates,
    updateRealTimePrices
  };
};
