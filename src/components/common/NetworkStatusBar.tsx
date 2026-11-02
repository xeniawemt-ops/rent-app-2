import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, AlertCircle, RefreshCw } from 'lucide-react';

export const NetworkStatusBar: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [showRestoredNotice, setShowRestoredNotice] = useState<boolean>(false);
  const [isSlowConnection, setIsSlowConnection] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRestoredNotice(true);
      const timer = setTimeout(() => {
        setShowRestoredNotice(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestoredNotice(false);
    };

    // Check Network Information API if available for slow network detection
    const checkConnectionSpeed = () => {
      const nav = navigator as any;
      if (nav.connection) {
        const effectiveType = nav.connection.effectiveType;
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          setIsSlowConnection(true);
        } else {
          setIsSlowConnection(false);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const nav = navigator as any;
    if (nav.connection && nav.connection.addEventListener) {
      nav.connection.addEventListener('change', checkConnectionSpeed);
      checkConnectionSpeed();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (nav.connection && nav.connection.removeEventListener) {
        nav.connection.removeEventListener('change', checkConnectionSpeed);
      }
    };
  }, []);

  // 1. No Internet State (Offline)
  if (!isOnline) {
    return (
      <div className="bg-rose-600 text-white px-4 py-2 text-xs font-medium flex items-center justify-between gap-3 shadow-md z-50 sticky top-0 transition-all">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-rose-200 animate-pulse shrink-0" />
            <span>
              <strong>No Internet Connection:</strong> You are currently offline. Changes will automatically sync once your connection is restored.
            </span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-md text-[11px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. Connection Restored State
  if (showRestoredNotice) {
    return (
      <div className="bg-emerald-600 text-white px-4 py-1.5 text-xs font-medium flex items-center justify-center gap-2 shadow-sm z-50 sticky top-0 transition-all">
        <Wifi className="w-3.5 h-3.5 text-emerald-200" />
        <span>Back Online: Connection restored. All operational services are synchronized.</span>
      </div>
    );
  }

  // 3. Slow Network State
  if (isSlowConnection) {
    return (
      <div className="bg-amber-600 text-white px-4 py-1 text-[11px] font-medium flex items-center justify-between gap-2 z-40 sticky top-0">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-200" />
            <span>Slow network connection detected. Media and data requests may take longer to load.</span>
          </div>
          <button
            onClick={() => setIsSlowConnection(false)}
            className="text-amber-200 hover:text-white text-[10px] underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return null;
};
