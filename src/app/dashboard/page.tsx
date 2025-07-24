'use client';

import { useUser } from '@clerk/nextjs';
import { useUpdateManager } from '@/lib/hooks/useUpdateManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Clock, 
  RefreshCw, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  BarChart3,
  Users,
  Zap
} from 'lucide-react';
import Link from 'next/link';

// Helper function to format dates
function formatDateTime(dateString: string | null) {
  if (!dateString) return 'Never';
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return 'Invalid date';
  }
}

export default function DashboardPage() {
  const { user } = useUser();
  const updateManager = useUpdateManager();

  if (!updateManager.isSignedIn) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to access your dashboard</h1>
          <Link href="/sign-in" className="text-blue-600 hover:text-blue-800">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.firstName || 'User'}!
        </h1>
        <p className="text-gray-600">
          Monitor your portfolio and track real-time stock updates
        </p>
      </div>

      {/* Update Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Real-Time Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Real-Time Updates</CardTitle>
            {updateManager.status.realTime.isActive ? (
              <Activity className="h-4 w-4 text-green-600" />
            ) : (
              <Clock className="h-4 w-4 text-gray-400" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {updateManager.status.realTime.isActive ? (
                <span className="text-green-600">Active</span>
              ) : (
                <span className="text-gray-400">Inactive</span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {updateManager.status.realTime.isActive 
                ? 'Updating every minute during market hours (9AM-3:45PM IST)'
                : 'Single update only (market closed or weekends)'
              }
            </p>
          </CardContent>
        </Card>

        {/* Last Update */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Update</CardTitle>
            <RefreshCw className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {updateManager.status.realTime.lastUpdate ? 'Updated' : 'Never'}
            </div>
            <p className="text-xs text-gray-500">
              {formatDateTime(updateManager.status.realTime.lastUpdate)}
            </p>
          </CardContent>
        </Card>

        {/* Update Stats */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stocks Updated</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {updateManager.status.realTime.stats?.successful || 0}
            </div>
            <p className="text-xs text-gray-500">
              of {updateManager.status.realTime.stats?.total || 0} total
            </p>
          </CardContent>
        </Card>

        {/* Intraday Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Intraday Data</CardTitle>
            {updateManager.status.intraday.needsUpdate ? (
              <AlertCircle className="h-4 w-4 text-orange-600" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {updateManager.status.intraday.needsUpdate ? (
                <span className="text-orange-600">Needs Update</span>
              ) : (
                <span className="text-green-600">Up to Date</span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Market hours: 9:00 AM - 3:45 PM IST
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Real-Time Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Real-Time Updates</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Status</p>
                <p className="text-sm text-gray-600">
                  {updateManager.status.realTime.isActive 
                    ? 'Updates running every minute while you\'re active'
                    : 'Updates are currently paused'
                  }
                </p>
              </div>
              <div className="space-x-2">
                {!updateManager.status.realTime.isActive ? (
                  <Button 
                    onClick={updateManager.startRealTimeUpdates}
                    disabled={updateManager.isLoading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Start Updates
                  </Button>
                ) : (
                  <Button 
                    onClick={updateManager.stopRealTimeUpdates}
                    variant="outline"
                  >
                    Stop Updates
                  </Button>
                )}
              </div>
            </div>
            
            {updateManager.status.realTime.nextUpdate && (
              <div className="text-sm text-gray-600">
                <p>Next update: {formatDateTime(updateManager.status.realTime.nextUpdate)}</p>
              </div>
            )}

            {updateManager.status.realTime.stats && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium mb-1">Last Update Stats</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>Total: {updateManager.status.realTime.stats.total}</div>
                  <div className="text-green-600">
                    Success: {updateManager.status.realTime.stats.successful}
                  </div>
                  <div className="text-red-600">
                    Failed: {updateManager.status.realTime.stats.failed}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Intraday Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Intraday Updates</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Market Data</p>
                <p className="text-sm text-gray-600">
                  Updates at 9:00 AM and 3:45 PM IST on trading days
                </p>
              </div>
              <div className="space-x-2">
                <Button 
                  onClick={updateManager.checkIntradayStatus}
                  variant="outline"
                  disabled={updateManager.isLoading}
                >
                  Check Status
                </Button>
                <Button 
                  onClick={updateManager.triggerIntradayUpdate}
                  disabled={updateManager.isLoading}
                >
                  Update Now
                </Button>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg space-y-2">
              <div className="text-sm">
                <span className="font-medium">Last checked: </span>
                {formatDateTime(updateManager.status.intraday.lastChecked)}
              </div>
              <div className="text-sm">
                <span className="font-medium">Oldest data: </span>
                {formatDateTime(updateManager.status.intraday.oldestUpdate)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/stocks">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <span>Search Stocks</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Search and analyze stocks with real-time data
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/portfolio">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-600" />
                <span>Portfolio</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Manage your investment portfolio and track performance
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-purple-600" />
              <span>Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Configure update preferences and notifications
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Loading/Error States */}
      {updateManager.isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Processing updates...</span>
          </div>
        </div>
      )}
    </div>
  );
}
