'use client';
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMonthlyUpdates, MonthlyUpdateResult } from '@/lib/hooks/useMonthlyUpdates';
import { Loader2, CheckCircle, XCircle, RefreshCw, Calendar } from 'lucide-react';

interface UpdateCardProps {
  title: string;
  isLoading: boolean;
  lastResult: MonthlyUpdateResult | null;
  error: string | null;
  onUpdate: () => Promise<MonthlyUpdateResult | null>;
  icon?: React.ReactNode;
}

const UpdateCard: React.FC<UpdateCardProps> = ({
  title,
  isLoading,
  lastResult,
  error,
  onUpdate,
  icon
}) => {
  const getStatusColor = () => {
    if (isLoading) return 'text-blue-600';
    if (error) return 'text-red-600';
    if (lastResult) return 'text-green-600';
    return 'text-gray-600';
  };

  const getStatusIcon = () => {
    if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (error) return <XCircle className="h-4 w-4 text-red-600" />;
    if (lastResult) return <CheckCircle className="h-4 w-4 text-green-600" />;
    return null;
  };

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <Button
              onClick={onUpdate}
              disabled={isLoading}
              size="sm"
              variant="outline"
              className="h-7 px-2"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {error && (
          <div className="text-xs text-red-600 mb-2 p-2 bg-red-50 rounded">
            Error: {error}
          </div>
        )}
        
        {lastResult && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="font-medium text-gray-900">{lastResult.total}</div>
                <div className="text-gray-500">Total</div>
              </div>
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="font-medium text-green-700">{lastResult.successful}</div>
                <div className="text-green-600">Success</div>
              </div>
              <div className="text-center p-2 bg-red-50 rounded">
                <div className="font-medium text-red-700">{lastResult.failed}</div>
                <div className="text-red-600">Failed</div>
              </div>
            </div>
            
            {lastResult.failed > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-red-600 hover:text-red-800">
                  View Failed Updates ({lastResult.failed})
                </summary>
                <div className="mt-2 max-h-32 overflow-y-auto">
                  {lastResult.results
                    .filter(r => !r.success)
                    .map((result, index) => (
                      <div key={index} className="p-2 bg-red-50 rounded mb-1">
                        <div className="font-medium">{result.symbol}</div>
                        <div className="text-red-600">{result.message}</div>
                      </div>
                    ))}
                </div>
              </details>
            )}
          </div>
        )}
        
        {!lastResult && !error && !isLoading && (
          <div className="text-xs text-gray-500 text-center py-4">
            No updates performed yet
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const MonthlyUpdatesPanel: React.FC = () => {
  const {
    status,
    isAnyLoading,
    hasAnyError,
    updateAllMonthlyData,
  } = useMonthlyUpdates();

  const handleUpdateAll = async () => {
    console.log('Triggering consolidated monthly updates...');
    await updateAllMonthlyData();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Monthly Data Updates
            </CardTitle>
            <Button 
              onClick={handleUpdateAll}
              disabled={isAnyLoading}
              variant="default"
              className="flex items-center gap-2"
            >
              {isAnyLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Update All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 mb-4">
            These updates are designed to be called monthly via cron-job.org. 
            Each update fetches the latest data for all active stocks using Yahoo Finance API.
          </div>
          
          {hasAnyError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="text-sm text-red-800">
                Some updates have errors. Check individual cards below for details.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UpdateCard
          title="Fundamental Data"
          isLoading={status.fundamentalData.isLoading}
          lastResult={status.fundamentalData.lastResult}
          error={status.fundamentalData.error}
          onUpdate={() => Promise.resolve(null)}
          icon={<div className="w-4 h-4 bg-blue-500 rounded" />}
        />
        
        <UpdateCard
          title="Financial Data"
          isLoading={status.financialData.isLoading}
          lastResult={status.financialData.lastResult}
          error={status.financialData.error}
          onUpdate={() => Promise.resolve(null)}
          icon={<div className="w-4 h-4 bg-green-500 rounded" />}
        />
        
        <UpdateCard
          title="Statistics Data"
          isLoading={status.statistics.isLoading}
          lastResult={status.statistics.lastResult}
          error={status.statistics.error}
          onUpdate={() => Promise.resolve(null)}
          icon={<div className="w-4 h-4 bg-purple-500 rounded" />}
        />
        
        <UpdateCard
          title="Analyst Ratings"
          isLoading={status.analystRatings.isLoading}
          lastResult={status.analystRatings.lastResult}
          error={status.analystRatings.error}
          onUpdate={() => Promise.resolve(null)}
          icon={<div className="w-4 h-4 bg-orange-500 rounded" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cron Service Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Configure these endpoints in your cron-job.org dashboard to run monthly:
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md space-y-4">
              <div className="space-y-2">
                <div className="font-medium text-sm text-green-700">🎯 Consolidated Monthly Update Endpoint</div>
                <div className="text-xs font-mono">
                  <div className="bg-green-50 p-3 rounded border border-green-200">
                    <div className="font-medium text-green-800 mb-1">POST {window.location.origin}/api/stocks/update-monthly-data</div>
                    <div className="text-green-600 text-xs">✓ Updates all data types (fundamental, financial, statistics, analyst ratings) in one call with proper delays</div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="font-medium text-sm">Recommended Schedule:</div>
                <div className="text-xs text-gray-600">
                  <div>
                    • <strong>Frequency:</strong> Monthly (e.g., 1st of each month at 2:00 AM)
                    <br />• <strong>Method:</strong> POST with no body required
                    <br />• <strong>Timeout:</strong> 300 seconds (5 minutes) or higher
                    <br />• <strong>Benefits:</strong> Single cron job with built-in API rate limiting and error handling
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="font-medium text-sm">What it updates:</div>
                <div className="text-xs text-gray-600 grid grid-cols-2 gap-2">
                  <div>• EPS, PE ratios, book value</div>
                  <div>• Revenue, debt, margins, growth</div>
                  <div>• Institutional holdings, dividends</div>
                  <div>• Analyst ratings, target prices</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
