'use client';

import { usePathname } from 'next/navigation';
import NavBar from '@/components/NavBar';

const HIDDEN_ROUTES = ['/auth'];
const routeMap = {
  '/': '/',
  '/courses': '/courses',
  '/spaces': '/spaces',
  '/leaderboard': '/leaderboard',
  '/notifications': '/notifications',
  '/profile': '/profile',
  '/admin': '/admin',
};

export default function NavWrapper() {
  const pathname = usePathname();

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

  return <NavBar active={active} />;
}
