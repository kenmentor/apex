'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export default function ConnectionStatus() {
  const [online, setOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const isOnline = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) {
        setShowReconnected(true);
        setTimeout(() => setShowReconnected(false), 2500);
      }
    };
    const isOffline = () => {
      setOnline(false);
      setShowReconnected(false);
    };

    setOnline(navigator.onLine);
    window.addEventListener('online', isOnline);
    window.addEventListener('offline', isOffline);
    return () => {
      window.removeEventListener('online', isOnline);
      window.removeEventListener('offline', isOffline);
    };
  }, []);

  return (
    <>
      {!online && (
        <div className="fixed bottom-20 right-4 z-[100] flex items-center gap-2 rounded-full border border-border bg-background/90 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-md backdrop-blur">
          <WifiOff className="size-3.5 shrink-0 text-amber-500" />
          Offline
        </div>
      )}
      {online && showReconnected && (
        <div className="fixed bottom-20 right-4 z-[100] flex items-center gap-2 rounded-full border border-border bg-background/90 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-md backdrop-blur">
          <Wifi className="size-3.5 shrink-0 text-green-500" />
          Back online
        </div>
      )}
    </>
  );
}
