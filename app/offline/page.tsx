'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../src/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../src/components/ui/card';
import { Badge } from '../src/components/ui/badge';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Clock, 
  Database, 
  Smartphone,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [cachedData, setCachedData] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    checkOnlineStatus();
    checkCachedData();
    
    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, []);

  const checkOnlineStatus = () => {
    setIsOnline(navigator.onLine);
  };

  const handleOnline = () => {
    setIsOnline(true);
    // Attempt to sync data when coming back online
    syncOfflineData();
  };

  const handleOffline = () => {
    setIsOnline(false);
  };

  const handleServiceWorkerMessage = (event: MessageEvent) => {
    switch (event.data.type) {
      case 'OFFLINE_SYNC_START':
        setIsChecking(true);
        break;
      case 'OFFLINE_SYNC_COMPLETE':
        setIsChecking(false);
        setLastSync(new Date().toISOString());
        checkCachedData();
        break;
      case 'OFFLINE_SYNC_FAILED':
        setIsChecking(false);
        break;
    }
  };

  const checkCachedData = async () => {
    try {
      // Check if we have cached data in IndexedDB
      if ('indexedDB' in window) {
        // This would check your actual IndexedDB structure
        // For now, we'll simulate it
        setCachedData({
          trades: 15,
          tradeSetups: 8,
          messages: 23,
          lastUpdated: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 minutes ago
        });
      }
    } catch (error) {
      console.error('Failed to check cached data:', error);
    }
  };

  const syncOfflineData = async () => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('offline-sync');
        setIsChecking(true);
      } catch (error) {
        console.error('Failed to register sync:', error);
      }
    }
  };

  const retryConnection = () => {
    setIsChecking(true);
    // Simulate connection check
    setTimeout(() => {
      checkOnlineStatus();
      setIsChecking(false);
    }, 2000);
  };

  const viewCachedContent = () => {
    // This would navigate to cached content
    // For now, we'll just show a message
    alert('Cached content would be displayed here');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <WifiOff className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            You're Offline
          </h1>
          <p className="text-gray-600">
            Don't worry! You can still access your cached data and continue working.
          </p>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="w-5 h-5" />
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Internet Connection</span>
              <Badge variant={isOnline ? "default" : "destructive"}>
                {isOnline ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Online
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 mr-1" />
                    Offline
                  </>
                )}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Last Sync</span>
              <span className="text-sm text-gray-500">
                {lastSync ? new Date(lastSync).toLocaleTimeString() : 'Never'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Sync Status</span>
              <Badge variant={isChecking ? "secondary" : "outline"}>
                {isChecking ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  'Idle'
                )}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Cached Data Card */}
        {cachedData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Cached Data
              </CardTitle>
              <CardDescription>
                Data available offline
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {cachedData.trades}
                  </div>
                  <div className="text-xs text-gray-500">Trades</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {cachedData.tradeSetups}
                  </div>
                  <div className="text-xs text-gray-500">Setups</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {cachedData.messages}
                  </div>
                  <div className="text-xs text-gray-500">Messages</div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-2">
                  Last updated: {new Date(cachedData.lastUpdated).toLocaleString()}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={viewCachedContent}
                  className="w-full"
                >
                  View Cached Content
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>What You Can Do</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div className="text-sm">
                <div className="font-medium text-green-800">View cached trades</div>
                <div className="text-green-600">Access your recent trading data</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
              <div className="text-sm">
                <div className="font-medium text-blue-800">Prepare new trades</div>
                <div className="text-blue-600">Draft trades to sync later</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <Smartphone className="w-5 h-5 text-purple-600" />
              <div className="text-sm">
                <div className="font-medium text-purple-800">Use offline features</div>
                <div className="text-purple-600">Continue working without internet</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={retryConnection} 
            disabled={isChecking}
            className="w-full"
            size="lg"
          >
            {isChecking ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Checking Connection...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Connection
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={syncOfflineData}
            disabled={!isOnline || isChecking}
            className="w-full"
          >
            <Database className="w-4 h-4 mr-2" />
            Sync Data
          </Button>
        </div>

        {/* Tips */}
        <div className="text-center text-sm text-gray-500">
          <p className="mb-2">
            <AlertTriangle className="w-4 h-4 inline mr-1" />
            Tip: Enable offline mode in your browser settings for better performance
          </p>
          <p>
            Your data will automatically sync when you're back online
          </p>
        </div>
      </div>
    </div>
  );
}
