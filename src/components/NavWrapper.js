'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import NavBar from '@/components/NavBar';
import TopBar from '@/components/TopBar';
import SideDrawer from '@/components/SideDrawer';
import { getUser, getToken } from '@/lib/auth';
import { fetchJson, TTL } from '@/lib/fetch-json';

const HIDDEN_ROUTES = ['/auth'];
const routeMap = {
  '/': '/',
  '/plan': '/plan',
  '/groups': '/groups',
  '/spaces': '/groups',
  '/search': '/search',
  '/messages': '/messages',
  '/notifications': '/messages',
  '/courses': '/courses',
  '/departments': '/departments',
  '/alex': '/alex',
  '/leaderboard': '/leaderboard',
  '/profile': '/profile',
  '/games': '/games',
  '/races': '/races',
  '/wallet': '/wallet',
  '/streak': '/streak',
  '/settings': '/settings',
  '/admin': '/admin',
};

export default function NavWrapper() {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const [unread, setUnread] = useState(0);
  const [coins, setCoins] = useState(null);

  useEffect(() => {
    setUser(getUser());
  }, [pathname]);

  useEffect(() => {
    const u = getUser();
    if (!u) return;
    // Shell data cached 60s: navigating tabs doesn't refetch the world.
    fetchJson('/api/notifications?limit=1', { token: getToken(), ttl: TTL.shell })
      .then(d => setUnread(d.unreadCount || 0))
      .catch(() => {});
    fetchJson('/api/wallet?email=' + encodeURIComponent(u.email), { ttl: TTL.shell })
      .then(d => { if (typeof d.spendable === 'number') setCoins(d.spendable); })
      .catch(() => {});
  }, [pathname]);

  if (HIDDEN_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))) {
    return null;
  }

  let active = '/';
  for (const [route, value] of Object.entries(routeMap)) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      active = value;
      break;
    }
  }

  // Inside a group (detail + settings) and the plan flow: fullscreen mode,
  // no global top bar — each page brings its own slim header.
  const hideTop = pathname === '/groups' || pathname.startsWith('/groups/') || pathname.startsWith('/plan');
  // Inside a group detail/settings: no bottom tabs either (chat typer takes the room).
  const hideNav = /^\/groups\/[^/]+/.test(pathname || '');

  return (
    <>
      {!hideTop && (
        <TopBar user={user} unread={unread} onAvatar={() => setDrawer(true)} hideTitle={false} />
      )}
      <SideDrawer open={drawer} user={user} coins={coins} onClose={() => setDrawer(false)} />
      {!hideNav && <NavBar active={active} unread={unread} />}
    </>
  );
}
