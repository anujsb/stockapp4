// src/lib/utils/marketHours.ts
import { MARKET_CONFIG } from '@/types/stock.types';

export class MarketHoursUtil {
  /**
   * Get current time in IST
   */
  static getCurrentIST(): Date {
    const now = new Date();
    return new Date(now.toLocaleString('en-US', { timeZone: MARKET_CONFIG.TIMEZONE }));
  }

  /**
   * Check if current day is a trading day (Monday-Friday)
   */
  static isTradingDay(date?: Date): boolean {
    const targetDate = date || this.getCurrentIST();
    const dayOfWeek = targetDate.getDay();
    return (MARKET_CONFIG.TRADING_DAYS as readonly number[]).includes(dayOfWeek);
  }

  /**
   * Get trading hours for a specific date
   */
  static getTradingHours(date?: Date) {
    const targetDate = date || this.getCurrentIST();
    const dateString = targetDate.toISOString().split('T')[0];
    
    return {
      morningUpdate: new Date(
        `${dateString}T${MARKET_CONFIG.TRADING_HOURS.MORNING_UPDATE.hour.toString().padStart(2, '0')}:${MARKET_CONFIG.TRADING_HOURS.MORNING_UPDATE.minute.toString().padStart(2, '0')}:00.000+05:30`
      ),
      eveningUpdate: new Date(
        `${dateString}T${MARKET_CONFIG.TRADING_HOURS.EVENING_UPDATE.hour.toString().padStart(2, '0')}:${MARKET_CONFIG.TRADING_HOURS.EVENING_UPDATE.minute.toString().padStart(2, '0')}:00.000+05:30`
      ),
    };
  }

  /**
   * Check if intraday data update is needed based on IST market hours
   */
  static isIntradayUpdateNeeded(lastUpdated: Date): boolean {
    if (!this.isTradingDay()) {
      return false; // No updates on weekends
    }

    const nowIST = this.getCurrentIST();
    const lastUpdatedIST = new Date(lastUpdated.toLocaleString('en-US', { timeZone: MARKET_CONFIG.TIMEZONE }));
    
    const { morningUpdate, eveningUpdate } = this.getTradingHours();
    
    // Check if current time is past 9:00 AM and data wasn't updated after 9:00 AM today
    if (nowIST >= morningUpdate && lastUpdatedIST < morningUpdate) {
      return true;
    }
    
    // Check if current time is past 3:45 PM and data wasn't updated after 3:45 PM today
    if (nowIST >= eveningUpdate && lastUpdatedIST < eveningUpdate) {
      return true;
    }
    
    return false;
  }

  /**
   * Get next scheduled update time
   */
  static getNextUpdateTime(): Date | null {
    if (!this.isTradingDay()) {
      // Find next trading day
      const date = this.getCurrentIST();
      while (!this.isTradingDay(date)) {
        date.setDate(date.getDate() + 1);
      }
      const { morningUpdate } = this.getTradingHours(date);
      return morningUpdate;
    }

    const nowIST = this.getCurrentIST();
    const { morningUpdate, eveningUpdate } = this.getTradingHours();

    if (nowIST < morningUpdate) {
      return morningUpdate;
    } else if (nowIST < eveningUpdate) {
      return eveningUpdate;
    } else {
      // Next trading day morning
      const nextDay = new Date(nowIST);
      nextDay.setDate(nextDay.getDate() + 1);
      while (!this.isTradingDay(nextDay)) {
        nextDay.setDate(nextDay.getDate() + 1);
      }
      const { morningUpdate: nextMorning } = this.getTradingHours(nextDay);
      return nextMorning;
    }
  }

  /**
   * Format time for display
   */
  static formatTime(date: Date): string {
    return date.toLocaleString('en-IN', {
      timeZone: MARKET_CONFIG.TIMEZONE,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
}
