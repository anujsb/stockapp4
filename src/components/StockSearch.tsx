'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';

export interface StockSearchResult {
  symbol: string;
  name: string;
  type?: string;
  region?: string;
  marketOpen?: string;
  marketClose?: string;
  timezone?: string;
  currency?: string;
  exchange?: string;
  sector?: string;
  industry?: string;
  source: 'database' | 'yahoo';
}

interface StockSearchProps {
  onStockSelect: (stock: StockSearchResult) => void;
  placeholder?: string;
  className?: string;
}

export default function StockSearch({ 
  onStockSelect, 
  placeholder = "Search for stocks...", 
  className = "" 
}: StockSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchStocks = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowDropdown(false);
      setErrorMessage(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/stocks/search?q=${encodeURIComponent(searchQuery)}`);
      
      if (response.ok) {
        const data = await response.json();
        setResults(data);
        setShowDropdown(true);
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.error || 'Could not search stocks. Please try again.');
        setResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setErrorMessage('Could not search stocks. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchStocks(value);
    }, 300);
  };

  const handleStockSelect = (stock: StockSearchResult) => {
    setQuery(`${stock.symbol} - ${stock.name}`);
    setShowDropdown(false);
    setResults([]);
    onStockSelect(stock);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query || !text) return text || '';
    
    try {
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const parts = text.split(regex);
      
      return parts.map((part, index) => 
        regex.test(part) ? (
          <span key={index} className="bg-yellow-200 font-medium">
            {part}
          </span>
        ) : part
      );
    } catch (error) {
      // If regex fails, return original text
      return text;
    }
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <Input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3"
          onFocus={() => {
            if (results.length > 0) setShowDropdown(true);
          }}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          </div>
        )}
        {!isLoading && showDropdown && (
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        )}
      </div>

      {errorMessage && (
        <div className="text-xs text-red-600 mt-1 px-2">{errorMessage}</div>
      )}

      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {results.map((stock, index) => (
            <div
              key={`${stock.symbol}-${index}`}
              onClick={() => handleStockSelect(stock)}
              className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">
                    {highlightMatch(stock.symbol, query)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {highlightMatch(stock.name, query)}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                      {stock.type || 'Equity'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {stock.region} • {stock.currency}
                    </span>
                    {stock.source === 'database' && (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-600 rounded-full">
                        Saved
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDropdown && results.length === 0 && !isLoading && query.trim() && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="px-4 py-8 text-center text-gray-500">
            <Search className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p>No stocks found for "{query}"</p>
            <p className="text-sm text-gray-400 mt-1">Try searching with different keywords</p>
          </div>
        </div>
      )}
    </div>
  );
}
