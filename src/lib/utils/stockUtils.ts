// src/lib/utils/stockUtils.ts

/**
 * Format a stock price for display
 */
export function formatPrice(price: string | number | null | undefined): string {
    if (!price) return '₹0.00';
    
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numPrice);
  }
  
  /**
   * Format a large number (market cap, volume, etc.)
   */
  export function formatLargeNumber(num: string | number | null | undefined): string {
    if (!num) return '0';
    
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    
    if (numValue >= 1e12) {
      return `₹${(numValue / 1e12).toFixed(2)}T`;
    } else if (numValue >= 1e9) {
      return `₹${(numValue / 1e9).toFixed(2)}B`;
    } else if (numValue >= 1e6) {
      return `₹${(numValue / 1e6).toFixed(2)}M`;
    } else if (numValue >= 1e3) {
      return `₹${(numValue / 1e3).toFixed(2)}K`;
    }
    
    return `₹${numValue.toFixed(2)}`;
  }
  
  /**
   * Format percentage values
   */
  export function formatPercentage(value: string | number | null | undefined): string {
    if (!value) return '0.00%';
    
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    return `${(numValue * 100).toFixed(2)}%`;
  }
  
  /**
   * Format volume numbers
   */
  export function formatVolume(volume: string | number | null | undefined): string {
    if (!volume) return '0';
    
    const numVolume = typeof volume === 'string' ? parseFloat(volume) : volume;
    
    if (numVolume >= 1e9) {
      return `${(numVolume / 1e9).toFixed(2)}B`;
    } else if (numVolume >= 1e6) {
      return `${(numVolume / 1e6).toFixed(2)}M`;
    } else if (numVolume >= 1e3) {
      return `${(numVolume / 1e3).toFixed(2)}K`;
    }
    
    return numVolume.toString();
  }
  
  /**
   * Calculate percentage change between two prices
   */
  export function calculatePercentageChange(
    currentPrice: string | number,
    previousPrice: string | number
  ): number {
    const current = typeof currentPrice === 'string' ? parseFloat(currentPrice) : currentPrice;
    const previous = typeof previousPrice === 'string' ? parseFloat(previousPrice) : previousPrice;
    
    if (previous === 0) return 0;
    
    return ((current - previous) / previous) * 100;
  }
  
  /**
   * Get color for price changes (red for negative, green for positive)
   */
  export function getPriceChangeColor(change: number): string {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  }
  
  /**
   * Get arrow indicator for price changes
   */
  export function getPriceChangeIcon(change: number): string {
    if (change > 0) return '↗';
    if (change < 0) return '↘';
    return '→';
  }
  
  /**
   * Validate stock symbol format
   */
  export function isValidStockSymbol(symbol: string): boolean {
    if (!symbol || typeof symbol !== 'string') return false;
    // Accept only Indian NSE/BSE symbols (e.g., RELIANCE.NS, SBIN.BO)
    const symbolRegex = /^[A-Z0-9]{1,10}\.(NS|BO)$/;
    return symbolRegex.test(symbol.toUpperCase());
  }
  
  /**
   * Clean and normalize stock symbol
   */
  export function normalizeStockSymbol(symbol: string): string {
    let s = symbol.toUpperCase().trim();
    // If already ends with .NS or .BO, return as is
    if (s.endsWith('.NS') || s.endsWith('.BO')) return s;
    // Default to NSE if not specified
    return s + '.NS';
  }
  
  /**
   * Format date for display
   */
  export function formatDate(date: string | Date | null | undefined): string {
    if (!date) return 'N/A';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(dateObj);
  }
  
  /**
   * Calculate portfolio value
   */
  export function calculatePortfolioValue(
    holdings: Array<{
      quantity: number;
      buyPrice: string;
      currentPrice?: string;
      exchange?: string;
    }>
  ): {
    totalValue: number;
    totalCost: number;
    totalGainLoss: number;
    totalGainLossPercent: number;
    formatted: {
      totalValue: string;
      totalCost: string;
      totalGainLoss: string;
      totalGainLossPercent: string;
    }
  } {
    let totalValue = 0;
    let totalCost = 0;
  
    holdings.forEach(holding => {
      const buyPrice = parseFloat(holding.buyPrice);
      const currentPrice = holding.currentPrice ? parseFloat(holding.currentPrice) : buyPrice;
      const quantity = holding.quantity;
  
      totalCost += buyPrice * quantity;
      totalValue += currentPrice * quantity;
    });
  
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
  
    return {
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent,
      formatted: {
        totalValue: formatPrice(totalValue),
        totalCost: formatPrice(totalCost),
        totalGainLoss: formatPrice(totalGainLoss),
        totalGainLossPercent: `${totalGainLossPercent.toFixed(2)}%`,
      }
    };
  }