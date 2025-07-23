"use client";

import React, { useState } from "react";
import StockSearch, { StockSearchResult } from "@/components/StockSearch";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, formatPrice, formatLargeNumber } from "@/lib/utils/stockUtils";
import { SideBar } from "@/components/SideBar";

const formatDateTime = (date: string | Date | null | undefined) => {
  if (!date) return 'N/A';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(dateObj);
};

const StocksPage = () => {
  const [symbol, setSymbol] = useState<string>("");
  const [stockData, setStockData] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [buyPrice, setBuyPrice] = useState<string>("");
  const [addingToPortfolio, setAddingToPortfolio] = useState<boolean>(false);

  const handleStockSelect = (stock: StockSearchResult) => {
    setSymbol(stock.symbol);
    fetchStockData(stock.symbol);
  };

  const fetchStockData = async (selectedSymbol: string) => {
    setError("");
    setStockData(null);
    if (!selectedSymbol) return;
    try {
      const res = await fetch(`/api/stocks/${encodeURIComponent(selectedSymbol)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || data.message || "Failed to fetch stock data.");
        setStockData(null);
        return;
      }
      setStockData(data.data);
    } catch (err) {
      setError("Failed to fetch stock data.");
      setStockData(null);
    }
  };

  const addToPortfolio = async () => {
    setError("");
    if (!symbol || !quantity || !buyPrice) {
      setError("Please select a stock and enter quantity and buy price.");
      return;
    }
    setAddingToPortfolio(true);
    try {
      const res = await fetch(`/api/stocks/${encodeURIComponent(symbol)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity, buyPrice }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || data.message || "Failed to add to portfolio.");
      } else {
        setError("");
        setQuantity("");
        setBuyPrice("");
        // Optionally, refetch stock data or show a success message
      }
    } catch (err) {
      setError("Failed to add to portfolio.");
    } finally {
      setAddingToPortfolio(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <SideBar />
      <div className="flex-1 overflow-y-auto min-h-screen bg-gray-50 p-6">
        {/* <div className="container mx-auto p-6 space-y-6"> */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Search</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <StockSearch onStockSelect={handleStockSelect} className="mb-4" />
            {error && (
              <div className="text-red-600 bg-red-50 p-3 rounded">{error}</div>
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
                      {formatDateTime(stockData.stock.lastRefreshedAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Real-Time Price */}
            {stockData.realTimePrice?.[0] && (
              <Card>
                <CardHeader>
                  <CardTitle>Real-Time Price</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Price</p>
                      <p className="font-semibold text-2xl">
                        {formatPrice(stockData.realTimePrice[0].price)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Volume</p>
                      <p className="font-semibold">
                        {stockData.realTimePrice[0].volume?.toLocaleString() || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Signal</p>
                      <p className="font-semibold">
                        {stockData.realTimePrice[0].signal || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Last Updated</p>
                      <p className="font-semibold">
                        {formatDateTime(stockData.realTimePrice[0].updatedAt)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Intraday Price */}
            {stockData.intraDayPrice?.[0] && (
              <Card>
                <CardHeader>
                  <CardTitle>Intraday Price</CardTitle>
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
                      <p className="text-gray-500">Open</p>
                      <p className="font-semibold">
                        {formatPrice(stockData.intraDayPrice[0].open)}
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
                      <p className="text-gray-500">52W High</p>
                      <p className="font-semibold">
                        {formatPrice(stockData.intraDayPrice[0].fiftyTwoWeekHigh)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">52W Low</p>
                      <p className="font-semibold">
                        {formatPrice(stockData.intraDayPrice[0].fiftyTwoWeekLow)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">50D MA</p>
                      <p className="font-semibold">
                        {formatPrice(stockData.intraDayPrice[0].fiftyDayMovingAverage)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">200D MA</p>
                      <p className="font-semibold">
                        {formatPrice(stockData.intraDayPrice[0].twoHundredDayMovingAverage)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">3M Avg Vol</p>
                      <p className="font-semibold">
                        {formatLargeNumber(stockData.intraDayPrice[0].averageDailyVolume3Month)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">10D Avg Vol</p>
                      <p className="font-semibold">
                        {formatLargeNumber(stockData.intraDayPrice[0].averageDailyVolume10Day)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Market Cap</p>
                      <p className="font-semibold">
                        {formatLargeNumber(stockData.intraDayPrice[0].marketCap)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Last Updated</p>
                      <p className="font-semibold">
                        {formatDateTime(stockData.intraDayPrice[0].updatedAt)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fundamental Data */}
            {stockData.fundamentalData?.[0] && (
              <Card>
                <CardHeader>
                  <CardTitle>Fundamental Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">EPS (TTM)</p>
                      <p className="font-semibold">{stockData.fundamentalData[0].epsTTM}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">EPS (Forward)</p>
                      <p className="font-semibold">{stockData.fundamentalData[0].epsForward}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Book Value</p>
                      <p className="font-semibold">{stockData.fundamentalData[0].bookValue}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Trailing PE</p>
                      <p className="font-semibold">{stockData.fundamentalData[0].trailingPE}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Forward PE</p>
                      <p className="font-semibold">{stockData.fundamentalData[0].forwardPE}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Price to Book</p>
                      <p className="font-semibold">{stockData.fundamentalData[0].priceToBook}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Last Updated</p>
                      <p className="font-semibold">
                        {formatDateTime(stockData.fundamentalData[0].updatedAt)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Financial Data */}
            {stockData.financialData?.[0] && (
              <Card>
                <CardHeader>
                  <CardTitle>Financial Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Total Revenue</p>
                      <p className="font-semibold">{formatLargeNumber(stockData.financialData[0].totalRevenue)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total Cash</p>
                      <p className="font-semibold">{formatLargeNumber(stockData.financialData[0].totalCash)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total Debt</p>
                      <p className="font-semibold">{formatLargeNumber(stockData.financialData[0].totalDebt)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Debt to Equity</p>
                      <p className="font-semibold">{stockData.financialData[0].debtToEquity}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Current Ratio</p>
                      <p className="font-semibold">{stockData.financialData[0].currentRatio}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Quick Ratio</p>
                      <p className="font-semibold">{stockData.financialData[0].quickRatio}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Profit Margin</p>
                      <p className="font-semibold">{stockData.financialData[0].profitMargin}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Gross Margin</p>
                      <p className="font-semibold">{stockData.financialData[0].grossMargin}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Operating Margin</p>
                      <p className="font-semibold">{stockData.financialData[0].operatingMargin}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">EBITDA Margin</p>
                      <p className="font-semibold">{stockData.financialData[0].ebitdaMargin}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Return on Assets</p>
                      <p className="font-semibold">{stockData.financialData[0].returnOnAssets}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Return on Equity</p>
                      <p className="font-semibold">{stockData.financialData[0].returnOnEquity}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Revenue Growth</p>
                      <p className="font-semibold">{stockData.financialData[0].revenueGrowth}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Earnings Growth</p>
                      <p className="font-semibold">{stockData.financialData[0].earningsGrowth}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Last Updated</p>
                      <p className="font-semibold">
                        {formatDateTime(stockData.financialData[0].updatedAt)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Statistics */}
            {stockData.statistics?.[0] && (
              <Card>
                <CardHeader>
                  <CardTitle>Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Shares Held by Institutions</p>
                      <p className="font-semibold">{stockData.statistics[0].sharesHeldByInstitutions}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Shares Held by Insiders</p>
                      <p className="font-semibold">{stockData.statistics[0].sharesHeldByAllInsider}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Last Split Factor</p>
                      <p className="font-semibold">{stockData.statistics[0].lastSplitFactor}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Last Split Date</p>
                      <p className="font-semibold">{stockData.statistics[0].lastSplitDate}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Last Dividend Value</p>
                      <p className="font-semibold">{stockData.statistics[0].lastDividendValue}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Last Dividend Date</p>
                      <p className="font-semibold">{stockData.statistics[0].lastDividendDate}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Earnings Date</p>
                      <p className="font-semibold">{stockData.statistics[0].earningsDate}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Earnings Call Date</p>
                      <p className="font-semibold">{stockData.statistics[0].earningsCallDate}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Last Updated</p>
                      <p className="font-semibold">
                        {formatDateTime(stockData.statistics[0].updatedAt)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Analyst Ratings */}
            {stockData.analystRating?.[0] && (
              <Card>
                <CardHeader>
                  <CardTitle>Analyst Ratings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Recommendation</p>
                      <p className="font-semibold">{stockData.analystRating[0].recommendation}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Number of Analysts</p>
                      <p className="font-semibold">{stockData.analystRating[0].numberOfAnalysts}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Target Price High</p>
                      <p className="font-semibold">{stockData.analystRating[0].targetPriceHigh}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Target Low Price</p>
                      <p className="font-semibold">{stockData.analystRating[0].targetLowPrice}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Last Updated</p>
                      <p className="font-semibold">
                        {formatDateTime(stockData.analystRating[0].updatedAt)}
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
    </div>
  );
};

export default StocksPage;
