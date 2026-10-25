export function getBaseUrl() {
  const url = process.env.NEXT_PUBLIC_BASE_URL || process.env.FRONTEND_URL
  if (url) return url.replace(/\/+$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}
