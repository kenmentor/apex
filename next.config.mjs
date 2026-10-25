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
}

export default nextConfig
