/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['lucide-react'],
  async redirects() {
    // Spaces → Groups rename: old bookmarks, shared links and
    // notification links keep working.
    return [
      { source: '/spaces', destination: '/groups', permanent: true },
      { source: '/spaces/:path*', destination: '/groups/:path*', permanent: true },
    ]
  },
  async rewrites() {
    // Firebase auth helper proxy (see docs: redirect sign-in on non-Firebase
    // hosts). Transparent 200 rewrite — NOT a redirect — so the helper runs
    // same-domain and browsers can't block its storage.
    return [
      { source: '/__/auth/:path*', destination: 'https://apex-e9c78.firebaseapp.com/__/auth/:path*' },
    ]
  },
}

export default nextConfig
