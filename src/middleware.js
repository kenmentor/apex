import { NextResponse } from 'next/server'

// Personal (tailored) pages require sign-in. The edge can only see the
// presence cookie (set/cleared with the localStorage session in lib/auth);
// APIs still enforce the real JWT. Public profile pages (/profile/[email]),
// courses, games, leaderboard etc. stay open.
const GATED = [
  '/plan',
  '/folders',
  '/wallet',
  '/streak',
  '/notifications',
  '/messages',
  '/dm',
  '/profile',
  '/profile/contributions',
  '/profile/courses',
  '/profile/history',
  '/profile/review',
  '/profile/settings',
  '/profile/stats',
]

export function middleware(request) {
  const path = request.nextUrl.pathname
  // Public profile pages (/profile/[email]): single segment under /profile
  // that is NOT one of the personal subpages. Always let them through.
  if (/^\/profile\/[^/]+$/.test(path)) {
    const seg = path.split('/')[2]
    if (!['contributions', 'courses', 'history', 'review', 'settings', 'stats'].includes(seg)) {
      return NextResponse.next()
    }
  }
  const gated = GATED.some(g => path === g || path.startsWith(g + '/'))
  if (!gated) return NextResponse.next()
  if (!request.cookies.get('apex_auth')?.value) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/plan/:path*',
    '/folders/:path*',
    '/wallet/:path*',
    '/streak/:path*',
    '/notifications/:path*',
    '/messages/:path*',
    '/dm/:path*',
    '/profile/:path*',
  ],
}
