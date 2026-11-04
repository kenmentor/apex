'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  '/folders': '/folders',
  '/messages': '/groups',
  '/notifications': '/groups',
  '/courses': '/courses',
  '/departments': '/departments',
  '/alex': '/alex',
  '/leaderboard': '/leaderboard',
  '/profile': '/profile',
  '/games': '/games',
  '/dm': '/groups',
  '/races': '/races',
  '/wallet': '/wallet',
  '/streak': '/streak',
  '/contribute': '/contribute',
  '/settings': '/settings',
  '/admin': '/admin',
};

// Tab roots keep the plain brand header (no back button).
const TAB_ROOTS = new Set(['/', '/plan', '/games', '/search', '/folders']);

// Detail pages get back + contextual title. Parent = where back lands when
// history is empty (fresh deep link).
const DETAIL_TITLES = {
  '/courses': ['Course', '/courses'],
  '/departments': ['Departments', '/'],
  '/alex': ['Alex', '/'],
  '/leaderboard': ['Rankings', '/'],
  '/profile': ['Profile', '/'],
  '/games': ['Game', '/games'],
  '/dm': ['Chat', '/groups?tab=inbox'],
  '/races': ['Races', '/games'],
  '/wallet': ['Wallet', '/'],
  '/streak': ['Streak', '/'],
  '/contribute': ['Contributor', '/'],
  '/settings': ['Settings', '/'],
  '/admin': ['Admin', '/'],
  '/notifications': ['Notifications', '/'],
  '/messages': ['Messages', '/'],
  '/logout': ['Logout', '/'],
};

function detailFor(pathname) {
  for (const [route, [title, parent]] of Object.entries(DETAIL_TITLES)) {
    if (pathname === route || pathname.startsWith(route + '/')) return { title, parent };
  }
  const seg = (pathname || '').split('/').filter(Boolean)[0] || '';
  const pretty = seg.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Page';
  return { title: pretty, parent: '/' };
}

export default function NavWrapper() {
  const pathname = usePathname();
  const router = useRouter();
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
    const loadUnread = (fresh) => fetchJson('/api/notifications?limit=1', { token: getToken(), ttl: fresh ? TTL.fresh : TTL.shell })
      .then(d => setUnread(d.unreadCount || 0))
      .catch(() => {});
    // Shell data cached 60s: navigating tabs doesn't refetch the world.
    loadUnread(false);
    // Inbox marks things read — refresh the badge immediately instead of
    // waiting out the shell cache.
    const onRead = () => loadUnread(true);
    try { window.addEventListener('notifications-read', onRead) } catch {}
    fetchJson('/api/wallet?email=' + encodeURIComponent(u.email), { ttl: TTL.shell })
      .then(d => { if (typeof d.spendable === 'number') setCoins(d.spendable); })
      .catch(() => {});
    return () => { try { window.removeEventListener('notifications-read', onRead) } catch {} };
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

  // Group pages, deep plan pages, course pages and the profile bring their own
  // chrome — no global bar there. The plan index itself has no header of its
  // own, so it keeps the global one.
  const hideTop = pathname === '/groups' || pathname.startsWith('/groups/') || pathname.startsWith('/plan/') || pathname.startsWith('/courses/') || pathname === '/profile' || pathname.startsWith('/profile/') || pathname === '/read';
  // Inside a group detail/settings or a DM thread: no bottom tabs either (typer takes the room).
  const hideNav = /^\/groups\/[^/]+/.test(pathname || '') || (pathname || '').startsWith('/dm/') || pathname === '/read';

  const isTabRoot = TAB_ROOTS.has(active) && (pathname === active || (active === '/' && pathname === '/'));
  const detail = !hideTop && !isTabRoot ? detailFor(pathname) : null;

  function goBack(fallback) {
    try {
      if (typeof window !== 'undefined' && window.history.length > 1) router.back();
      else router.push(fallback || '/');
    } catch {
      router.push(fallback || '/');
    }
  }

  return (
    <>
      {!hideTop && (
        <TopBar
          user={user}
          unread={unread}
          onAvatar={() => setDrawer(true)}
          title={detail ? detail.title : 'Apex'}
          showBack={!!detail}
          onBack={detail ? () => goBack(detail.parent) : undefined}
        />
      )}
      <SideDrawer open={drawer} user={user} coins={coins} onClose={() => setDrawer(false)} />
      {!hideNav && <NavBar active={active} />}
    </>
  );
}
