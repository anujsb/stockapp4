// src/app/stocks/page.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPrice, formatLargeNumber, isValidStockSymbol } from '@/lib/utils/stockUtils';

export default function StocksPage() {
  const [symbol, setSymbol] = useState('');
  const [stockData, setStockData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [addingToPortfolio, setAddingToPortfolio] = useState(false);

  const fetchStockData = async () => {
    if (!symbol || !isValidStockSymbol(symbol)) {
      setError('Please enter a valid stock symbol');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/stocks/${symbol.toUpperCase()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch stock data');
      }

      setStockData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStockData(null);
    } finally {
      setLoading(false);
    }
  };

  const addToPortfolio = async () => {
    if (!stockData || !quantity || !buyPrice) {
      setError('Please fill in quantity and buy price');
      return;
    }

    setAddingToPortfolio(true);
    setError('');

    try {
      const response = await fetch(`/api/stocks/${symbol.toUpperCase()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity: parseInt(quantity),
          buyPrice: parseFloat(buyPrice),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add stock to portfolio');
      }

      alert('Stock added to portfolio successfully!');
      setQuantity('');
      setBuyPrice('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setAddingToPortfolio(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Stock Data Fetcher</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Enter stock symbol (e.g., AAPL, TSLA, RELIANCE.NS)"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="flex-1"
            />
            <Button onClick={fetchStockData} disabled={loading}>
              {loading ? 'Fetching...' : 'Get Stock Data'}
            </Button>
          </div>

          {error && (
            <div className="text-red-600 bg-red-50 p-3 rounded">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {stockData && (
        <>
          {/* Stock Information */}
          <Card>
            <CardHeader>
              <CardTitle>
                {stockData.stock.name} ({stockData.stock.symbol})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Exchange</p>
                  <p className="font-semibold">{stockData.stock.exchange}</p>
                </div>
                <div>
                  <p className="text-gray-500">Sector</p>
                  <p className="font-semibold">{stockData.stock.sector || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Industry</p>
                  <p className="font-semibold">{stockData.stock.industry || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Last Updated</p>
                  <p className="font-semibold">
                    {new Date(stockData.stock.lastRefreshedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Price Information */}
          {stockData.realTimePrice?.[0] && (
            <Card>
              <CardHeader>
                <CardTitle>Current Price</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500">Price</p>
                    <p className="text-2xl font-bold">
                      {formatPrice(stockData.realTimePrice[0].price)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Volume</p>
                    <p className="text-lg font-semibold">
                      {stockData.realTimePrice[0].volume?.toLocaleString() || 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Intraday Data */}
          {stockData.intraDayPrice?.[0] && (
            <Card>
              <CardHeader>
                <CardTitle>Trading Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Previous Close</p>
                    <p className="font-semibold">
                      {formatPrice(stockData.intraDayPrice[0].previousClose)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Day High</p>
                    <p className="font-semibold">
                      {formatPrice(stockData.intraDayPrice[0].dayHigh)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Day Low</p>
                    <p className="font-semibold">
                      {formatPrice(stockData.intraDayPrice[0].dayLow)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Market Cap</p>
                    <p className="font-semibold">
                      {formatLargeNumber(stockData.intraDayPrice[0].marketCap)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add to Portfolio */}
          <Card>
            <CardHeader>
              <CardTitle>Add to Portfolio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Quantity
                  </label>
                  <Input
                    type="number"
                    placeholder="Number of shares"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Buy Price ($)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Price per share"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                onClick={addToPortfolio} 
                disabled={addingToPortfolio}
                className="w-full"
              >
                {addingToPortfolio ? 'Adding...' : 'Add to Portfolio'}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}