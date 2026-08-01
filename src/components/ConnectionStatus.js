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
        <div className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">
          <WifiOff className="size-4 shrink-0" />
          You're offline — check your connection
        </div>
      )}
      {online && showReconnected && (
        <div className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">
          <Wifi className="size-4 shrink-0" />
          You're back online
        </div>
      )}
    </>
  );
}
