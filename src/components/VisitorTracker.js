'use client';

import { useEffect } from 'react';

function getVisitorId() {
  let id = localStorage.getItem('apex_visitor_id');
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem('apex_visitor_id', id);
  }
  return id;
}

export default function VisitorTracker() {
  useEffect(() => {
    const sessionKey = 'apex_visitor_tracked';
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');

    const visitorId = getVisitorId();
    fetch('/api/visitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId }),
    }).catch(() => {});
  }, []);

  return null;
}
